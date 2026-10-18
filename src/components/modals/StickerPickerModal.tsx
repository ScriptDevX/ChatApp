import React, { useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { STICKER_URLS } from '../../constants';
import { Modal } from '../ui/Modal';
import { useTheme } from '../../contexts/ThemeContext';

interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (url: string) => void;
  onSelectEmoji: (emoji: string) => void;
}

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  onSelectEmoji,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'emojis'>('stickers');
  const { mode } = useTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="420px">
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('stickers')}
          style={{
            flex: 1,
            padding: '10px 0',
            fontWeight: 600,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'stickers' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'stickers' ? '2.5px solid var(--accent-color)' : '2.5px solid transparent',
            cursor: 'pointer',
          }}
        >
          Stickers & GIFs
        </button>

        <button
          onClick={() => setActiveTab('emojis')}
          style={{
            flex: 1,
            padding: '10px 0',
            fontWeight: 600,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'emojis' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'emojis' ? '2.5px solid var(--accent-color)' : '2.5px solid transparent',
            cursor: 'pointer',
          }}
        >
          Emojis
        </button>
      </div>

      {activeTab === 'stickers' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
            gap: '10px',
            maxHeight: '52vh',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {STICKER_URLS.map((url, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectSticker(url);
                onClose();
              }}
              style={{
                padding: '4px',
                borderRadius: '10px',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={url}
                alt={`Sticker ${idx + 1}`}
                loading="lazy"
                style={{ width: '100%', height: '72px', objectFit: 'contain' }}
              />
            </button>
          ))}
        </div>
      ) : (
        <div style={{ maxHeight: '52vh', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
          <EmojiPicker
            theme={mode === 'dark' ? Theme.DARK : Theme.LIGHT}
            width="100%"
            height="380px"
            onEmojiClick={(data: EmojiClickData) => {
              onSelectEmoji(data.emoji);
              onClose();
            }}
          />
        </div>
      )}
    </Modal>
  );
};
