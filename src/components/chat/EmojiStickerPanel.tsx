import React, { useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { STICKER_URLS } from '../../constants';
import { useTheme } from '../../contexts/ThemeContext';

interface EmojiStickerPanelProps {
  isOpen: boolean;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (url: string) => void;
  onClose?: () => void;
}

export const EmojiStickerPanel: React.FC<EmojiStickerPanelProps> = ({
  isOpen,
  onSelectEmoji,
  onSelectSticker,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'emojis' | 'stickers'>('emojis');
  const { mode } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '340px',
        maxHeight: '48vh',
        backgroundColor: 'var(--surface-color)',
        borderTop: '1px solid var(--border-color)',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Top Telegram-style Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-color)',
          minHeight: '42px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveTab('emojis')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'emojis' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'emojis' ? 600 : 500,
              fontSize: '0.88rem',
              borderBottom: activeTab === 'emojis' ? '2.5px solid var(--accent-color)' : '2.5px solid transparent',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '19px' }}>
              mood
            </span>
            <span>Emoji</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stickers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'stickers' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'stickers' ? 600 : 500,
              fontSize: '0.88rem',
              borderBottom: activeTab === 'stickers' ? '2.5px solid var(--accent-color)' : '2.5px solid transparent',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '19px' }}>
              auto_awesome
            </span>
            <span>Stickers</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close panel"
          >
            <span className="material-icons-round" style={{ fontSize: '20px' }}>
              keyboard_arrow_down
            </span>
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'emojis' ? (
          <div style={{ width: '100%', height: '100%' }}>
            <EmojiPicker
              theme={mode === 'dark' ? Theme.DARK : Theme.LIGHT}
              width="100%"
              height="100%"
              lazyLoadEmojis={true}
              searchDisabled={false}
              skinTonesDisabled={true}
              previewConfig={{ showPreview: false }}
              onEmojiClick={(data: EmojiClickData) => {
                onSelectEmoji(data.emoji);
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
              gap: '12px',
              alignContent: 'start',
            }}
          >
            {STICKER_URLS.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSticker(url)}
                style={{
                  padding: '6px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'transform 0.12s ease, background-color 0.12s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = 'var(--input-bg)';
                }}
              >
                <img
                  src={url}
                  alt={`Sticker ${idx + 1}`}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '66px',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
