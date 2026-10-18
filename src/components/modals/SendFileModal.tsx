import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatFileSize } from '../../services/fileUpload';

interface SendFileModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: (file: File, caption?: string) => void;
}

export const SendFileModal: React.FC<SendFileModalProps> = ({
  file,
  isOpen,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState('');

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  const handleSend = () => {
    onSend(file, caption.trim() || undefined);
    setCaption('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  const handleClose = () => {
    setCaption('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isImage ? 'Send Photo' : 'Send Code / Document'}
      maxWidth="420px"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
        {isImage && previewUrl ? (
          <div
            style={{
              width: '100%',
              maxHeight: '260px',
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
                maxHeight: '260px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-color)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '26px' }}>
                description
              </span>
            </div>
            <div style={{ minWidth: 0, flexGrow: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.96rem',
                  color: 'var(--text-color)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {formatFileSize(file.size)}
              </div>
            </div>
          </div>
        )}

        {/* Mandatory Caption Input */}
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
          placeholder="Add a caption..."
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
