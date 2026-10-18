import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SendPhotoModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: (file: File, caption?: string) => void;
}

export const SendPhotoModal: React.FC<SendPhotoModalProps> = ({
  file,
  isOpen,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState('');

  if (!file) return null;

  const previewUrl = URL.createObjectURL(file);

  const handleSend = () => {
    onSend(file, caption.trim() || undefined);
    setCaption('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Photo"
      maxWidth="420px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            rightIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>send</span>}
          >
            Send
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div
          style={{
            width: '100%',
            maxHeight: '280px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'var(--input-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              width: '100%',
              maxHeight: '280px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Add a caption... (optional)"
          autoFocus
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-color)',
            fontSize: '0.95rem',
          }}
        />
      </div>
    </Modal>
  );
};
