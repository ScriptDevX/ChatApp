import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';
import loginAuthLottie from '../../assets/lottie/loginAuth.json';
import { Button } from '../ui/Button';

interface AuthScreenProps {
  onGoogleLogin: () => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onGoogleLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      setLoading(true);
      await onGoogleLogin();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 20px',
        backgroundColor: 'var(--bg-color)',
        overflowY: 'auto',
      }}
    >
      {/* Unified Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          backgroundColor: 'var(--surface-color)',
          padding: '28px 24px 34px 24px',
          borderRadius: '28px',
          boxShadow: '0 16px 44px rgba(0,0,0,0.22)',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Animated Illustration inside card */}
        <div
          style={{
            width: '260px',
            maxWidth: '100%',
            height: '190px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lottie
            src={loginAuthLottie}
            autoplay
            loop
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text-color)',
            marginBottom: '8px',
          }}
        >
          Welcome to FunChat
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            marginBottom: '26px',
            lineHeight: 1.5,
            maxWidth: '320px',
          }}
        >
          Fast, private & modern messaging with voice and video calling.
        </motion.p>

        {/* Google Sign-In Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          style={{ width: '100%' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleGoogleSignIn}
            isLoading={loading}
            fullWidth
            size="lg"
            variant="secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '14px 20px',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-color)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Continue with Google
          </Button>
        </motion.div>

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--error-color)',
              fontSize: '0.85rem',
              width: '100%',
            }}
          >
            {error}
          </div>
        )}
      </motion.div>
    </div>
  );
};
