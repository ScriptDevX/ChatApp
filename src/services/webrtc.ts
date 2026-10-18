import { CallParticipant, CallSession, CallType, SignalingPayload } from '../types';
import { signalingService, chatRepository, authService } from './index';
import { soundEffects } from './soundEffects';
import { formatCallDuration, getPersonalChatId } from '../utils';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private session: CallSession | null = null;
  private onStateChange: ((session: CallSession | null) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream | null) => void) | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private callTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  init(
    onStateChange: (session: CallSession | null) => void,
    onRemoteStream: (stream: MediaStream | null) => void
  ) {
    this.onStateChange = onStateChange;
    this.onRemoteStream = onRemoteStream;
  }

  getSession(): CallSession | null {
    return this.session;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  private updateSession(updates: Partial<CallSession>) {
    if (!this.session) return;
    this.session = { ...this.session, ...updates };
    this.onStateChange?.(this.session);
  }

  async startCall(
    currentUserId: string,
    partner: CallParticipant,
    type: CallType
  ): Promise<void> {
    this.cleanUp();

    const callId = 'call-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    this.session = {
      id: callId,
      type,
      status: 'calling',
      initiatorId: currentUserId,
      receiverId: partner.uid,
      partner,
      isIncoming: false,
      startTime: Date.now(),
      durationSeconds: 0,
      isMuted: false,
      isCameraOff: type === 'voice',
      isSpeakerOn: true,
      facingMode: 'user',
    };
    this.onStateChange?.(this.session);

    try {
      // 1. Acquire local camera/mic first so caller sees their own preview immediately
      await this.acquireMedia(type, 'user');
      // Notify so CallContext sets localStream immediately for live camera preview
      this.onStateChange?.(this.session);

      // 2. Play outgoing ringtone
      soundEffects.startOutgoingRingtone();

      // 3. Send call request signal to partner
      await signalingService.sendSignal({
        callId,
        type: 'call-request',
        callType: type,
        senderId: currentUserId,
        receiverId: partner.uid,
        timestamp: Date.now(),
      });

      // 4. Timeout if partner doesn't answer in 35s
      this.callTimeoutTimer = setTimeout(() => {
        if (this.session && (this.session.status === 'calling' || this.session.status === 'ringing')) {
          this.logCallToChat(this.session, `Missed ${this.session.type === 'video' ? 'video' : 'voice'} call`);
          this.updateSession({ status: 'missed' });
          soundEffects.stopRingtone();
          setTimeout(() => this.cleanUp(), 2000);
        }
      }, 35000);
    } catch (err: any) {
      console.error('Call initialization error:', err);
      soundEffects.stopRingtone();
      this.updateSession({
        status: 'failed',
        errorMessage: err?.message || 'Could not access microphone/camera',
      });
      setTimeout(() => this.cleanUp(), 2500);
    }
  }

  handleIncomingCallRequest(
    payload: SignalingPayload,
    partner: CallParticipant
  ) {
    // If signal timestamp is older than 45 seconds, don't show stale/expired call
    if (payload.timestamp && Date.now() - payload.timestamp > 45000) {
      return;
    }

    // If the session for this EXACT call is already active or being connected, do not re-initialize or decline it!
    if (this.session && this.session.id === payload.callId) {
      return;
    }

    if (this.session && this.session.status !== 'idle' && this.session.status !== 'ended') {
      // Actually busy on another call: decline this incoming call
      signalingService.sendSignal({
        callId: payload.callId,
        type: 'call-decline',
        callType: payload.callType,
        senderId: payload.receiverId,
        receiverId: payload.senderId,
        timestamp: Date.now(),
      });
      return;
    }

    this.session = {
      id: payload.callId,
      type: payload.callType,
      status: 'ringing',
      initiatorId: payload.senderId,
      receiverId: payload.receiverId,
      partner,
      isIncoming: true,
      startTime: Date.now(),
      durationSeconds: 0,
      isMuted: false,
      isCameraOff: payload.callType === 'voice',
      isSpeakerOn: true,
      facingMode: 'user',
    };
    this.onStateChange?.(this.session);

    // Send call-ringing signal to caller so caller knows callee is online & device is ringing
    signalingService.sendSignal({
      callId: payload.callId,
      type: 'call-ringing',
      callType: payload.callType,
      senderId: payload.receiverId,
      receiverId: payload.senderId,
      timestamp: Date.now(),
    });

    // Play incoming ringtone sound
    soundEffects.startIncomingRingtone();
  }

  startDirectIncomingSession(options: {
    callId: string;
    callType: CallType;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    receiverId?: string;
    autoAccept?: boolean;
  }) {
    if (this.session && this.session.id === options.callId) {
      if (options.autoAccept && this.session.status === 'ringing') {
        this.acceptCall().catch(() => {});
      }
      return;
    }

    const partner: CallParticipant = {
      uid: options.callerId,
      displayName: options.callerName || 'Someone',
      avatarUrl: options.callerAvatar,
    };

    const myUid = options.receiverId || authService.getCurrentUser()?.uid || '';

    this.session = {
      id: options.callId,
      type: options.callType,
      status: options.autoAccept ? 'connecting' : 'ringing',
      initiatorId: options.callerId,
      receiverId: myUid,
      partner,
      isIncoming: true,
      startTime: Date.now(),
      durationSeconds: 0,
      isMuted: false,
      isCameraOff: options.callType === 'voice',
      isSpeakerOn: true,
      facingMode: 'user',
    };
    this.onStateChange?.(this.session);

    if (options.autoAccept) {
      this.acceptCall().catch(() => {});
    } else {
      soundEffects.startIncomingRingtone();
    }
  }

  async acceptCall(): Promise<void> {
    if (!this.session) return;
    soundEffects.stopRingtone();

    // Check if session has already ended or expired
    if (this.session.status === 'ended' || this.session.status === 'declined' || this.session.status === 'missed') {
      this.cleanUp();
      return;
    }

    this.updateSession({ status: 'connecting' });

    // Set connection timeout: If partner cancelled or hung up during cold boot, abort gracefully after 15s
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
    }
    this.connectTimeoutTimer = setTimeout(() => {
      if (this.session && this.session.status === 'connecting') {
        console.warn('Call accept connection timed out');
        soundEffects.stopRingtone();
        this.updateSession({ status: 'ended', errorMessage: 'Call connection timed out' });
        setTimeout(() => this.cleanUp(), 1200);
      }
    }, 15000);

    try {
      // 1. Acquire camera / microphone
      await this.acquireMedia(this.session.type, this.session.facingMode);

      // 2. Create peer connection
      this.createPeerConnection();

      // 3. Send call-accept to caller so caller can create the WebRTC offer
      const myUid = this.session.receiverId || authService.getCurrentUser()?.uid || '';
      if (!this.session.receiverId && myUid) {
        this.session.receiverId = myUid;
      }

      await signalingService.sendSignal({
        callId: this.session.id,
        type: 'call-accept',
        callType: this.session.type,
        senderId: myUid,
        receiverId: this.session.initiatorId,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer);
        this.connectTimeoutTimer = null;
      }
      console.error('Accept call error:', err);
      this.updateSession({
        status: 'failed',
        errorMessage: err?.message || 'Microphone/camera permission denied',
      });
      setTimeout(() => this.endCall(), 2500);
    }
  }

  private loggedCallIds = new Set<string>();

  private logCallToChat(session: CallSession, summaryText: string) {
    try {
      if (this.loggedCallIds.has(session.id)) {
        return; // Already logged for this call to prevent duplicate entries
      }
      this.loggedCallIds.add(session.id);
      // Keep set size bounded
      if (this.loggedCallIds.size > 50) {
        const first = this.loggedCallIds.values().next().value;
        if (first) this.loggedCallIds.delete(first);
      }

      const chatId = getPersonalChatId(session.initiatorId, session.receiverId);
      chatRepository.sendMessage({
        chatType: 'personal',
        chatId,
        senderId: session.initiatorId,
        senderName: session.partner.displayName,
        type: 'system',
        text: summaryText,
      }).catch(() => {});
    } catch (e) {
      console.warn('Could not log call to chat:', e);
    }
  }

  declineCall(): void {
    if (!this.session) return;
    soundEffects.stopRingtone();
    const currentSession = this.session;

    signalingService.sendSignal({
      callId: currentSession.id,
      type: 'call-decline',
      callType: currentSession.type,
      senderId: currentSession.isIncoming ? currentSession.receiverId : currentSession.initiatorId,
      receiverId: currentSession.isIncoming ? currentSession.initiatorId : currentSession.receiverId,
      timestamp: Date.now(),
    });

    this.logCallToChat(
      currentSession,
      `${currentSession.type === 'video' ? '📹 Video call' : '📞 Call'} declined`
    );

    this.updateSession({ status: 'declined' });
    setTimeout(() => this.cleanUp(), 1000);
  }

  endCall(): void {
    if (!this.session) return;
    soundEffects.stopRingtone();
    const currentSession = this.session;

    signalingService.sendSignal({
      callId: currentSession.id,
      type: 'call-end',
      callType: currentSession.type,
      senderId: currentSession.isIncoming ? currentSession.receiverId : currentSession.initiatorId,
      receiverId: currentSession.isIncoming ? currentSession.initiatorId : currentSession.receiverId,
      timestamp: Date.now(),
    });

    // End call signaling sent via Firebase signalingService

    const duration = currentSession.durationSeconds || 0;
    if (currentSession.status === 'connected' && duration > 2) {
      this.logCallToChat(
        currentSession,
        `${currentSession.type === 'video' ? '📹 Video call ended' : '📞 Voice call ended'} (${formatCallDuration(duration)})`
      );
    } else if (currentSession.status === 'connected') {
      // Very short connection (<3 seconds) where callers immediately disconnected
      this.logCallToChat(
        currentSession,
        `${currentSession.type === 'video' ? '📹 Video call' : '📞 Call'} declined`
      );
    } else if (currentSession.status === 'calling' || currentSession.status === 'ringing') {
      this.logCallToChat(
        currentSession,
        `${currentSession.type === 'video' ? '📹 Cancelled video call' : '📞 Cancelled call'}`
      );
    }

    this.updateSession({ status: 'ended', endTime: Date.now() });
    setTimeout(() => this.cleanUp(), 800);
  }

  async handleSignal(payload: SignalingPayload): Promise<void> {
    if (!this.session || this.session.id !== payload.callId) return;

    switch (payload.type) {
      case 'call-ringing': {
        // Callee received call and is online/ringing!
        if (this.session && this.session.status === 'calling') {
          this.updateSession({ status: 'ringing' });
        }
        break;
      }

      case 'call-accept': {
        // Partner accepted our call! Stop ringing and start WebRTC offer negotiation
        soundEffects.stopRingtone();
        if (this.callTimeoutTimer) clearTimeout(this.callTimeoutTimer);
        this.updateSession({ status: 'connecting' });

        if (!this.peerConnection) {
          this.createPeerConnection();
        }

        if (this.peerConnection) {
          const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: this.session.type === 'video',
          });
          await this.peerConnection.setLocalDescription(offer);

          await signalingService.sendSignal({
            callId: this.session.id,
            type: 'offer',
            callType: this.session.type,
            senderId: this.session.initiatorId,
            receiverId: this.session.receiverId,
            sdp: { type: offer.type, sdp: offer.sdp || '' },
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'offer': {
        // Callee receives offer from caller
        if (payload.sdp && payload.sdp.sdp) {
          if (!this.peerConnection) {
            this.createPeerConnection();
          }

          if (this.peerConnection) {
            if (this.peerConnection.signalingState !== 'stable') {
              console.warn(`[WebRTC] Received offer in non-stable signalingState: ${this.peerConnection.signalingState}, rolling back...`);
              await this.peerConnection.setLocalDescription({ type: 'rollback' }).catch(() => {});
            }

            try {
              await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: payload.sdp.type as RTCSdpType, sdp: payload.sdp.sdp })
              );

              // Process any queued ICE candidates
              while (this.pendingCandidates.length > 0) {
                const cand = this.pendingCandidates.shift();
                if (cand) {
                  await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                }
              }

              const answer = await this.peerConnection.createAnswer();
              await this.peerConnection.setLocalDescription(answer);

              await signalingService.sendSignal({
                callId: this.session.id,
                type: 'answer',
                callType: this.session.type,
                senderId: this.session.receiverId,
                receiverId: this.session.initiatorId,
                sdp: { type: answer.type, sdp: answer.sdp || '' },
                timestamp: Date.now(),
              });
            } catch (err: any) {
              console.warn('[WebRTC] setRemoteDescription offer error:', err?.message || err);
            }
          }
        }
        break;
      }

      case 'answer': {
        // Caller receives answer from callee
        if (payload.sdp && payload.sdp.sdp && this.peerConnection) {
          if (this.peerConnection.signalingState !== 'have-local-offer') {
            console.warn(`[WebRTC] Ignoring duplicate answer in signalingState: ${this.peerConnection.signalingState}`);
            break;
          }

          try {
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription({ type: payload.sdp.type as RTCSdpType, sdp: payload.sdp.sdp })
            );

            // Process any queued ICE candidates
            while (this.pendingCandidates.length > 0) {
              const cand = this.pendingCandidates.shift();
              if (cand) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
            }
          } catch (err: any) {
            console.warn('[WebRTC] setRemoteDescription answer error:', err?.message || err);
          }
        }
        break;
      }

      case 'ice-candidate': {
        if (payload.candidate && payload.candidate.candidate) {
          const candidateInit: RTCIceCandidateInit = {
            candidate: payload.candidate.candidate,
            sdpMid: payload.candidate.sdpMid,
            sdpMLineIndex: payload.candidate.sdpMLineIndex,
          };

          if (this.peerConnection && this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(() => {});
          } else {
            this.pendingCandidates.push(candidateInit);
          }
        }
        break;
      }

      case 'call-decline':
        soundEffects.stopRingtone();
        if (this.callTimeoutTimer) clearTimeout(this.callTimeoutTimer);
        if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);
        this.logCallToChat(
          this.session,
          `${this.session.type === 'video' ? '📹 Video call' : '📞 Call'} declined`
        );
        this.updateSession({ status: 'declined' });
        setTimeout(() => this.cleanUp(), 1500);
        break;

      case 'call-end':
        soundEffects.stopRingtone();
        this.updateSession({ status: 'ended', endTime: Date.now() });
        setTimeout(() => this.cleanUp(), 1000);
        break;
    }
  }

  toggleMute(): boolean {
    if (!this.localStream || !this.session) return false;
    const newMute = !this.session.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !newMute;
    });
    this.updateSession({ isMuted: newMute });
    return newMute;
  }

  toggleCamera(): boolean {
    if (!this.localStream || !this.session) return false;
    const newCameraOff = !this.session.isCameraOff;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = !newCameraOff;
    });
    this.updateSession({ isCameraOff: newCameraOff });
    return newCameraOff;
  }

  async switchCamera(): Promise<void> {
    if (!this.session || this.session.type !== 'video' || !this.localStream) return;
    const newFacing = this.session.facingMode === 'user' ? 'environment' : 'user';

    try {
      const oldVideoTrack = this.localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        this.localStream.removeTrack(oldVideoTrack);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const newVideoTrack = stream.getVideoTracks()[0];
      if (newVideoTrack) {
        this.localStream.addTrack(newVideoTrack);

        if (this.peerConnection) {
          const sender = this.peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
        }
      }

      this.updateSession({ facingMode: newFacing });
    } catch (e) {
      console.warn('Switch camera error:', e);
    }
  }

  private async acquireMedia(type: CallType, facingMode: 'user' | 'environment'): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    // Attempt 1: High quality video with ideal resolution & facing mode
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          type === 'video'
            ? {
                facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
      });
      return;
    } catch (err1) {
      console.warn('Attempt 1 with full constraints failed, trying basic camera constraints...', err1);
    }

    // Attempt 2: Basic camera without dimension or facingMode constraints (fixes desktop/laptop webcams!)
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? true : false,
      });
      return;
    } catch (err2) {
      console.warn('Attempt 2 failed, trying video only...', err2);
    }

    // Attempt 3: If video call, try video only without audio
    if (type === 'video') {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err3) {
        console.error('All camera attempts failed:', err3);
        throw err3;
      }
    } else {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnection = pc;

    this.remoteStream = new MediaStream();
    this.onRemoteStream?.(this.remoteStream);

    // Add local media tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }
      if (this.remoteStream) {
        const streamClone = new MediaStream(this.remoteStream.getTracks());
        this.remoteStream = streamClone;
        this.onRemoteStream?.(streamClone);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.session) {
        const c = event.candidate;
        signalingService.sendSignal({
          callId: this.session.id,
          type: 'ice-candidate',
          callType: this.session.type,
          senderId: this.session.isIncoming ? this.session.receiverId : this.session.initiatorId,
          receiverId: this.session.isIncoming ? this.session.initiatorId : this.session.receiverId,
          candidate: {
            candidate: c.candidate,
            sdpMid: c.sdpMid || '0',
            sdpMLineIndex: c.sdpMLineIndex !== null && c.sdpMLineIndex !== undefined ? c.sdpMLineIndex : 0,
          },
          timestamp: Date.now(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        soundEffects.stopRingtone();
        if (this.callTimeoutTimer) clearTimeout(this.callTimeoutTimer);
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        if (this.session && this.session.status !== 'connected') {
          this.updateSession({
            status: 'connected',
            connectedTime: Date.now(),
          });
          this.startDurationCounter();
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (!this.session) return;
      switch (pc.connectionState) {
        case 'connected':
          soundEffects.stopRingtone();
          if (this.callTimeoutTimer) clearTimeout(this.callTimeoutTimer);
          if (this.connectTimeoutTimer) {
            clearTimeout(this.connectTimeoutTimer);
            this.connectTimeoutTimer = null;
          }
          if (this.session.status !== 'connected') {
            this.updateSession({
              status: 'connected',
              connectedTime: Date.now(),
            });
            this.startDurationCounter();
          }
          break;
        case 'disconnected':
        case 'failed':
          soundEffects.stopRingtone();
          this.updateSession({
            status: 'failed',
            errorMessage: 'Call disconnected due to network issues',
          });
          setTimeout(() => this.cleanUp(), 2000);
          break;
        case 'closed':
          soundEffects.stopRingtone();
          this.updateSession({ status: 'ended' });
          break;
      }
    };

    return pc;
  }

  private startDurationCounter() {
    if (this.durationInterval) clearInterval(this.durationInterval);
    this.durationInterval = setInterval(() => {
      if (this.session && this.session.status === 'connected') {
        const secs = Math.floor((Date.now() - (this.session.connectedTime || Date.now())) / 1000);
        this.updateSession({ durationSeconds: secs });
      }
    }, 1000);
  }

  cleanUp() {
    soundEffects.stopRingtone();
    if (this.callTimeoutTimer) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    this.onRemoteStream?.(null);
    this.pendingCandidates = [];

    const oldSession = this.session;
    this.session = null;
    if (oldSession) {
      this.onStateChange?.(null);
    }
  }
}

export const webrtcManager = new WebRTCManager();
