import React from 'react';
import { motion } from 'framer-motion';
import { EMOJI_REACTIONS } from '../../constants';
import { Message } from '../../types';

interface MessageActionsBarProps {
  message: Message;
  isSent: boolean;
  canDelete: boolean;
  onSelectReaction: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onSelectMessages?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const MessageActionsBar: React.FC<MessageActionsBarProps> = ({
  message,
  isSent,
  canDelete,
  onSelectReaction,
  onReply,
  onCopy,
  onSelectMessages,
  onEdit,
  onDelete,
  onClose,
}) => {
  const isSticker = message.type === 'sticker';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 1020,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '320px',
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Emoji Reactions Bar */}
        <motion.div
          initial={{ scale: 0.9, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 350, delay: 0.04 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            backgroundColor: 'var(--actions-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '6px 12px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
            width: '100%',
          }}
        >
          {EMOJI_REACTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.35, y: -4 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', damping: 14, stiffness: 400 }}
              onClick={() => {
                onSelectReaction(emoji);
                onClose();
              }}
              style={{
                fontSize: '24px',
                padding: '4px',
                borderRadius: '50%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              title={`React with ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>

        {/* Actions Button List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--actions-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Reply */}
          <button
            onClick={() => {
              onClose();
              onReply();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 18px',
              border: 'none',
              borderBottom: '1px solid var(--border-color)',
              background: 'none',
              color: 'var(--text-color)',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--accent-color)' }}>
              reply
            </span>
            Reply
          </button>

          {/* Copy Text */}
          {!isSticker && (
            <button
              onClick={() => {
                onClose();
                onCopy();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 18px',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                background: 'none',
                color: 'var(--text-color)',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
                content_copy
              </span>
              Copy Text
            </button>
          )}

          {/* Select Multiple */}
          {onSelectMessages && (
            <button
              onClick={() => {
                onClose();
                onSelectMessages();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 18px',
                border: 'none',
                borderBottom: isSent || canDelete ? '1px solid var(--border-color)' : 'none',
                background: 'none',
                color: 'var(--text-color)',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
                checklist
              </span>
              Select
            </button>
          )}

          {/* Edit */}
          {isSent && !isSticker && onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 18px',
                border: 'none',
                borderBottom: canDelete ? '1px solid var(--border-color)' : 'none',
                background: 'none',
                color: 'var(--text-color)',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
                edit
              </span>
              Edit Message
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => {
                onClose();
                onDelete();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 18px',
                border: 'none',
                background: 'none',
                color: 'var(--error-color)',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--error-color)' }}>
                delete
              </span>
              Delete
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
