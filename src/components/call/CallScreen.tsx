import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';
import callRadarLottie from '../../assets/lottie/callRadar.json';
import { useCall } from '../../contexts/CallContext';
import { Avatar } from '../ui/Avatar';
import { formatCallDuration } from '../../utils';

export const CallScreen: React.FC = () => {
  const {
    activeSession,
    localStream,
    remoteStream,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const toggleSpeaker = () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    try {
      const bridge = (window as unknown as { AndroidBridge?: { setSpeakerphoneOn?: (on: boolean) => void } }).AndroidBridge;
      bridge?.setSpeakerphoneOn?.(next);
    } catch {}
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = next ? 1.0 : 0.35;
    }
  };

  // Draggable PiP window state (offset from right & top)
  const [pipPos, setPipPos] = useState({ right: 20, top: 70 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialRight: 20, initialTop: 70 });

  // Attach local stream whenever available
  const attachLocalStream = (node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStream) {
      if (node.srcObject !== localStream) {
        node.srcObject = localStream;
      }
      node.play().catch(() => {});
    }
  };

  // Attach remote stream whenever available
  const attachRemoteStream = (node: HTMLVideoElement | null) => {
    remoteVideoRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  // Attach remote audio element for voice calls
  const attachRemoteAudio = (node: HTMLAudioElement | null) => {
    remoteAudioRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, activeSession?.isCameraOff, activeSession?.status]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && remoteStream) {
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, activeSession?.status]);

  if (!activeSession || activeSession.status === 'idle') {
    return null;
  }

  const isVideo = activeSession.type === 'video';
  const isIncoming = activeSession.isIncoming;
  const isRinging = activeSession.status === 'ringing';
  const isConnected = activeSession.status === 'connected';

  // PiP Drag handlers for touch & mouse
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    isDraggingRef.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialRight: pipPos.right,
      initialTop: pipPos.top,
    };
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = dragStartRef.current.startX - clientX;
    const deltaY = clientY - dragStartRef.current.startY;

    const maxRight = Math.max(10, window.innerWidth - 130);
    const maxTop = Math.max(10, window.innerHeight - 220);

    const newRight = Math.max(10, Math.min(maxRight, dragStartRef.current.initialRight + deltaX));
    const newTop = Math.max(10, Math.min(maxTop, dragStartRef.current.initialTop + deltaY));

    setPipPos({ right: newRight, top: newTop });
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#ffffff',
        padding: 'calc(var(--safe-area-top) + 24px) 20px calc(var(--safe-area-bottom) + 36px) 20px',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      {/* Audio Stream for Voice Calls */}
      {!isVideo && (
        <audio
          ref={attachRemoteAudio}
          autoPlay
          playsInline
          style={{ display: 'none' }}
        />
      )}

      {/* Video Streams Display */}
      {isVideo && (
        <>
          {/* Remote Video (Takes full screen when connected) */}
          <video
            ref={attachRemoteStream}
            autoPlay
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 1,
              display: isConnected ? 'block' : 'none',
            }}
          />

          {/* Local Video Stream: Fullscreen before connected, Smooth Draggable PiP after connected */}
          {!activeSession.isCameraOff && (
            <div
              onMouseDown={isConnected ? handleDragStart : undefined}
              onTouchStart={isConnected ? handleDragStart : undefined}
              style={
                isConnected
                  ? {
                      position: 'absolute',
                      top: `${pipPos.top}px`,
                      right: `${pipPos.right}px`,
                      width: '110px',
                      height: '155px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                      border: '2px solid rgba(255,255,255,0.4)',
                      zIndex: 15,
                      cursor: isDraggingRef.current ? 'grabbing' : 'grab',
                      touchAction: 'none',
                      backgroundColor: '#1e293b',
                    }
                  : {
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 1,
                      overflow: 'hidden',
                      backgroundColor: '#1e293b',
                    }
              }
            >
              <video
                ref={attachLocalStream}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: activeSession.facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Top Header: Participant Info & Status */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
          marginTop: '16px',
          textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        }}
      >
        {/* Hide big avatar when full video is connected to keep view clean */}
        {(!isVideo || !isConnected) && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(isRinging || activeSession.status === 'calling') && (
              <div
                style={{
                  position: 'absolute',
                  width: '190px',
                  height: '190px',
                  pointerEvents: 'none',
                  zIndex: 0,
                  opacity: 0.8,
                }}
              >
                <Lottie
                  src={callRadarLottie}
                  autoplay
                  loop
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}
            <motion.div
              style={{ position: 'relative', zIndex: 1 }}
              animate={
                isRinging || activeSession.status === 'calling'
                  ? { scale: [1, 1.05, 1] }
                  : { scale: 1 }
              }
              transition={{
                duration: 1.8,
                repeat: isRinging || activeSession.status === 'calling' ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              <Avatar
                name={activeSession.partner.displayName}
                color={activeSession.partner.avatarColor}
                initials={activeSession.partner.initials}
                imageUrl={activeSession.partner.avatarUrl}
                size="xl"
                className="mb-3"
              />
            </motion.div>
          </div>
        )}
        <h2
          style={{
            fontSize: isConnected && isVideo ? '1.15rem' : '1.4rem',
            fontWeight: 600,
            marginTop: '8px',
            marginBottom: '4px',
            color: '#ffffff',
          }}
        >
          {activeSession.partner.displayName}
        </h2>
        <span
          style={{
            fontSize: '0.95rem',
            color: isConnected ? '#38bdf8' : '#cbd5e1',
            fontWeight: 500,
          }}
        >
          {activeSession.status === 'calling' && 'Calling...'}
          {activeSession.status === 'ringing' && (activeSession.isIncoming ? 'Incoming Call...' : 'Ringing...')}
          {activeSession.status === 'connecting' && 'Connecting...'}
          {activeSession.status === 'connected' && formatCallDuration(activeSession.durationSeconds || 0)}
          {activeSession.status === 'declined' && 'Call Declined'}
          {activeSession.status === 'missed' && 'No Answer'}
          {activeSession.status === 'ended' && 'Call Ended'}
          {activeSession.status === 'failed' && (activeSession.errorMessage || 'Call Failed')}
        </span>
      </div>

      {/* Center status placeholder for Voice */}
      {!isVideo && (
        <div
          style={{
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '1rem',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '48px', opacity: 0.2 }}>
            call
          </span>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <motion.div
        initial={{ y: 24, opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        style={{
          zIndex: 20,
          width: '100%',
          maxWidth: isVideo ? '360px' : '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isIncoming && isRinging ? 'space-around' : 'center',
          gap: isVideo ? '10px' : '20px',
          marginBottom: '14px',
          padding: '0 8px',
          boxSizing: 'border-box',
        }}
      >
        {isIncoming && isRinging ? (
          <>
            {/* Decline Button (with pulse animation) */}
            <button
              onClick={declineCall}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                cursor: 'pointer',
                animation: 'callPulseRed 1.6s infinite ease-in-out',
                border: 'none',
              }}
              title="Decline"
            >
              <span className="material-icons-round" style={{ fontSize: '32px' }}>
                call_end
              </span>
            </button>

            {/* Accept Button (with pulse animation) */}
            <button
              onClick={acceptCall}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                cursor: 'pointer',
                animation: 'callPulseGreen 1.6s infinite ease-in-out',
                border: 'none',
              }}
              title="Accept"
            >
              <span className="material-icons-round" style={{ fontSize: '32px' }}>
                call
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Speaker Toggle Button (Audio Calls ONLY) */}
            {!isVideo && (
              <button
                onClick={toggleSpeaker}
                style={{
                  width: '54px',
                  height: '54px',
                  minWidth: '54px',
                  minHeight: '54px',
                  borderRadius: '50%',
                  backgroundColor: isSpeakerOn ? '#ffffff' : 'rgba(255,255,255,0.22)',
                  color: isSpeakerOn ? '#0f172a' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                title={isSpeakerOn ? 'Speaker ON (Tap for Earpiece)' : 'Speaker OFF (Tap for Loudspeaker)'}
              >
                <span className="material-icons-round" style={{ fontSize: '26px' }}>
                  volume_up
                </span>
              </button>
            )}

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              style={{
                width: isVideo ? '46px' : '54px',
                height: isVideo ? '46px' : '54px',
                minWidth: isVideo ? '46px' : '54px',
                minHeight: isVideo ? '46px' : '54px',
                borderRadius: '50%',
                backgroundColor: activeSession.isMuted ? '#ffffff' : 'rgba(255,255,255,0.22)',
                color: activeSession.isMuted ? '#0f172a' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              title={activeSession.isMuted ? 'Unmute' : 'Mute'}
            >
              <span className="material-icons-round" style={{ fontSize: isVideo ? '22px' : '26px' }}>
                {activeSession.isMuted ? 'mic_off' : 'mic'}
              </span>
            </button>

            {/* Camera Toggle for Video */}
            {isVideo && (
              <>
                <button
                  onClick={toggleCamera}
                  style={{
                    width: '46px',
                    height: '46px',
                    minWidth: '46px',
                    minHeight: '46px',
                    borderRadius: '50%',
                    backgroundColor: activeSession.isCameraOff ? '#ffffff' : 'rgba(255,255,255,0.22)',
                    color: activeSession.isCameraOff ? '#0f172a' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  title={activeSession.isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  <span className="material-icons-round" style={{ fontSize: '22px' }}>
                    {activeSession.isCameraOff ? 'videocam_off' : 'videocam'}
                  </span>
                </button>

                <button
                  onClick={switchCamera}
                  style={{
                    width: '46px',
                    height: '46px',
                    minWidth: '46px',
                    minHeight: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    flexShrink: 0,
                  }}
                  title="Switch Camera (Front/Back)"
                >
                  <span className="material-icons-round" style={{ fontSize: '22px' }}>
                    flip_camera_ios
                  </span>
                </button>
              </>
            )}

            {/* End Call Button */}
            <button
              onClick={endCall}
              style={{
                width: isVideo ? '54px' : '62px',
                height: isVideo ? '54px' : '62px',
                minWidth: isVideo ? '54px' : '62px',
                minHeight: isVideo ? '54px' : '62px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                cursor: 'pointer',
                animation: activeSession.status === 'calling' ? 'callPulseRed 1.8s infinite ease-in-out' : 'none',
                border: 'none',
                flexShrink: 0,
              }}
              title="End Call"
            >
              <span className="material-icons-round" style={{ fontSize: isVideo ? '26px' : '30px' }}>
                call_end
              </span>
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};
