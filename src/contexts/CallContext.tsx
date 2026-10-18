import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CallParticipant, CallSession, CallType } from '../types';
import { webrtcManager } from '../services/webrtc';
import { signalingService, userRepository } from '../services';

interface CallContextType {
  activeSession: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (partner: CallParticipant, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{
  currentUserId: string | null;
  children: React.ReactNode;
}> = ({ currentUserId, children }) => {
  const [activeSession, setActiveSession] = useState<CallSession | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const action = searchParams.get('callAction');
        const callId = searchParams.get('callId');
        const callerId = searchParams.get('callerId');
        if (action && callId && callerId) {
          const callType = (searchParams.get('callType') as CallType) || 'voice';
          const callerName = searchParams.get('callerName') || 'Someone';
          const callerAvatar = searchParams.get('callerAvatar') || undefined;
          const partner: CallParticipant = {
            uid: callerId,
            displayName: callerName,
            avatarUrl: callerAvatar,
          };
          const initialSession: CallSession = {
            id: callId,
            type: callType,
            status: action === 'accept' ? 'connecting' : 'ringing',
            initiatorId: callerId,
            receiverId: currentUserId || '',
            partner,
            isIncoming: true,
            startTime: Date.now(),
            durationSeconds: 0,
            isMuted: false,
            isCameraOff: callType === 'voice',
            isSpeakerOn: true,
            facingMode: 'user',
          };
          webrtcManager.startDirectIncomingSession({
            callId,
            callType,
            callerId,
            callerName,
            callerAvatar,
            receiverId: currentUserId || undefined,
            autoAccept: action === 'accept',
          });
          return initialSession;
        }
      } catch {}
    }
    return null;
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const currentUserIdRef = useRef(currentUserId);
  const pendingAutoAcceptCallIdRef = useRef<string | null>((() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('callAction') === 'accept') {
        return sp.get('callId');
      }
    }
    return null;
  })());

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
    const session = webrtcManager.getSession();
    if (session && !session.receiverId && currentUserId) {
      session.receiverId = currentUserId;
    }
  }, [currentUserId]);

  // Native Android notification message listeners for Accept / Decline from lockscreen/notification
  useEffect(() => {
    const handleNativeMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'AUTO_ACCEPT_CALL') {
        const callId = data.callId;
        pendingAutoAcceptCallIdRef.current = callId || null;
        const currentSession = webrtcManager.getSession();
        if (currentSession && (!callId || currentSession.id === callId)) {
          webrtcManager.acceptCall().catch(() => {});
          pendingAutoAcceptCallIdRef.current = null;
        }
      } else if (data.type === 'AUTO_REJECT_CALL') {
        const callId = data.callId;
        const callerId = data.callerId;
        webrtcManager.declineCall();
        if (currentUserIdRef.current && callerId && callId) {
          signalingService.sendSignal({
            callId,
            type: 'call-decline',
            callType: 'voice',
            senderId: currentUserIdRef.current,
            receiverId: callerId,
            timestamp: Date.now(),
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('message', handleNativeMessage);

    // Check if app was cold-started by tapping Accept on incoming call notification
    try {
      const bridge = (window as unknown as { AndroidBridge?: { getPendingCallAction?: () => string } }).AndroidBridge;
      const pendingStr = bridge?.getPendingCallAction?.();
      if (pendingStr) {
        const parsed = JSON.parse(pendingStr);
        if (parsed.action === 'accept' && parsed.callId) {
          pendingAutoAcceptCallIdRef.current = parsed.callId;
          const session = webrtcManager.getSession();
          if (session && (session.id === parsed.callId || session.status === 'ringing')) {
            webrtcManager.acceptCall().catch(() => {});
            pendingAutoAcceptCallIdRef.current = null;
          }
        }
      }
    } catch {
      // Ignore
    }

    // Check URL parameters for direct call launch (?callAction=accept | incoming)
    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const action = searchParams.get('callAction');
        const callId = searchParams.get('callId');
        const callerId = searchParams.get('callerId');
        const callType = (searchParams.get('callType') as CallType) || 'voice';
        const callerName = searchParams.get('callerName') || 'Someone';
        const callerAvatar = searchParams.get('callerAvatar') || undefined;

        if (action && callId && callerId) {
          if (action === 'accept') {
            pendingAutoAcceptCallIdRef.current = callId;
          }
          webrtcManager.startDirectIncomingSession({
            callId,
            callType,
            callerId,
            callerName,
            callerAvatar,
            receiverId: currentUserIdRef.current || undefined,
            autoAccept: action === 'accept',
          });
        }
      }
    } catch (e) {
      console.warn('Direct call param parse error:', e);
    }

    return () => window.removeEventListener('message', handleNativeMessage);
  }, []);

  useEffect(() => {
    webrtcManager.init(
      (session) => {
        setActiveSession(session ? { ...session } : null);
        setLocalStream(webrtcManager.getLocalStream());

        const bridge = (window as unknown as { AndroidBridge?: { onCallStarted?: (id: string, type: string) => void; onCallEnded?: (id: string) => void } }).AndroidBridge;
        if (session) {
          bridge?.onCallStarted?.(session.id, session.type);
          if (
            pendingAutoAcceptCallIdRef.current &&
            (session.id === pendingAutoAcceptCallIdRef.current || (session.status === 'ringing' && session.isIncoming))
          ) {
            pendingAutoAcceptCallIdRef.current = null;
            webrtcManager.acceptCall().catch(() => {});
          }
        } else {
          bridge?.onCallEnded?.('');
          // If URL had callAction, cleanly remove it now that the call is ended
          try {
            if (typeof window !== 'undefined' && window.location.search.includes('callAction=')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          } catch {}
        }
      },
      (stream) => {
        setRemoteStream(stream);
      }
    );

    if (!currentUserId) return;

    // Listen for incoming signals
    const unsubscribe = signalingService.subscribeToSignals(currentUserId, async (signal) => {
      // Drop signals older than 45 seconds
      if (signal.timestamp && Date.now() - signal.timestamp > 45000) {
        return;
      }

      if (signal.type === 'call-end' || signal.type === 'call-decline') {
        await webrtcManager.handleSignal(signal);
        return;
      }

      if (signal.type === 'call-request') {
        const callerProfile = await userRepository.getUserProfile(signal.senderId);
        const myProfile = await userRepository.getUserProfile(currentUserId);
        if (callerProfile) {
          // Check blocked list
          if (myProfile?.blockedUsers?.[signal.senderId]) {
            signalingService.sendSignal({
              callId: signal.callId,
              type: 'call-decline',
              callType: signal.callType,
              senderId: currentUserId,
              receiverId: signal.senderId,
              timestamp: Date.now(),
            });
            return;
          }

          // Check call privacy settings
          const privacy = myProfile?.privacySettings?.callPrivacy || 'everyone';
          if (privacy === 'nobody') {
            signalingService.sendSignal({
              callId: signal.callId,
              type: 'call-decline',
              callType: signal.callType,
              senderId: currentUserId,
              receiverId: signal.senderId,
              timestamp: Date.now(),
            });
            return;
          }

          if (privacy === 'selected') {
            const allowed = (myProfile?.privacySettings?.allowedCallers || []).map((u) => u.toLowerCase());
            const callerUsername = (callerProfile.username || '').toLowerCase();
            if (!allowed.includes(callerUsername)) {
              signalingService.sendSignal({
                callId: signal.callId,
                type: 'call-decline',
                callType: signal.callType,
                senderId: currentUserId,
                receiverId: signal.senderId,
                timestamp: Date.now(),
              });
              return;
            }
          }

          webrtcManager.handleIncomingCallRequest(signal, {
            uid: callerProfile.uid,
            displayName: callerProfile.displayName,
            username: callerProfile.username,
            avatarColor: callerProfile.avatarColor,
            avatarUrl: callerProfile.avatarUrl,
            initials: callerProfile.initials,
          });
        }
      } else {
        await webrtcManager.handleSignal(signal);
      }
    });

    return () => {
      unsubscribe();
      webrtcManager.cleanUp();
    };
  }, [currentUserId]);

  const startCall = async (partner: CallParticipant, type: CallType) => {
    if (!currentUserIdRef.current) return;
    const partnerProfile = await userRepository.getUserProfile(partner.uid);
    if (partnerProfile) {
      if (partnerProfile.blockedUsers?.[currentUserIdRef.current]) {
        throw new Error('This user is not accepting calls from you.');
      }
      const priv = partnerProfile.privacySettings?.callPrivacy || 'everyone';
      if (priv === 'nobody') {
        throw new Error('This user has disabled incoming calls.');
      }
      if (priv === 'selected') {
        const allowed = (partnerProfile.privacySettings?.allowedCallers || []).map((u) => u.toLowerCase());
        const myProfile = await userRepository.getUserProfile(currentUserIdRef.current);
        const myUsername = (myProfile?.username || '').toLowerCase();
        if (!allowed.includes(myUsername)) {
          throw new Error('This user only accepts calls from specific people.');
        }
      }
    }
    await webrtcManager.startCall(currentUserIdRef.current, partner, type);
  };

  const acceptCall = async () => {
    await webrtcManager.acceptCall();
  };

  const declineCall = () => {
    webrtcManager.declineCall();
  };

  const endCall = () => {
    webrtcManager.endCall();
  };

  const toggleMute = () => {
    webrtcManager.toggleMute();
  };

  const toggleCamera = () => {
    webrtcManager.toggleCamera();
  };

  const switchCamera = () => {
    webrtcManager.switchCamera();
  };

  return (
    <CallContext.Provider
      value={{
        activeSession,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleCamera,
        switchCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = (): CallContextType => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};
