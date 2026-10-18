import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MentionSuggestion, ReplySnippetData } from '../../types';
import { MENTION_TRIGGER_REGEX } from '../../constants';
import { Avatar } from '../ui/Avatar';
import { EmojiStickerPanel } from './EmojiStickerPanel';
import { isAllowedCodeFile, MAX_FILE_SIZE_BYTES } from '../../services/fileUpload';

interface MessageInputAreaProps {
  replyTo: ReplySnippetData | null;
  onCancelReply: () => void;
  onSendMessage: (text: string) => void;
  onPickImage: (file: File) => void;
  onPickCodeFile?: (file: File) => void;
  onSendSticker: (url: string) => void;
  onTyping: (isTyping: boolean) => void;
  availableUsers: MentionSuggestion[];
  onPanelToggle?: () => void;
}

export const MessageInputArea: React.FC<MessageInputAreaProps> = ({
  replyTo,
  onCancelReply,
  onSendMessage,
  onPickImage,
  onPickCodeFile,
  onSendSticker,
  onTyping,
  availableUsers,
  onPanelToggle,
}) => {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const codeFileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Typing presence — notify once per session, not per keystroke
    if (!typingTimerRef.current) onTyping(true);
    else clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
      onTyping(false);
    }, 2000);

    // Mention detection
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const match = textBeforeCursor.match(MENTION_TRIGGER_REGEX);
    if (match) {
      setMentionQuery(match[2].toLowerCase());
    } else {
      setMentionQuery(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    // If long text (> 1000 chars), automatically create snippet.txt file
    if (pastedText && pastedText.length > 1000 && onPickCodeFile) {
      e.preventDefault();
      const firstLine = pastedText.trim().split('\n')[0].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
      const filename = `${firstLine || 'code_snippet'}.txt`;
      const blob = new Blob([pastedText], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], filename, { type: 'text/plain' });
      onPickCodeFile(file);
      return;
    }
  };

  const handleSend = () => {
    const clean = text.trim();
    if (!clean) return;
    onSendMessage(clean);
    setText('');
    setMentionQuery(null);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = null;
    onTyping(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !mentionQuery) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertMention = (username: string) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    let startIndex = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === '@') {
        if (i === 0 || /\s/.test(text[i - 1])) {
          startIndex = i;
          break;
        }
      }
      if (/\s/.test(text[i])) break;
    }

    if (startIndex !== -1) {
      const mentionText = `@${username} `;
      const before = text.substring(0, startIndex);
      const after = text.substring(cursorPos);
      const newText = before + mentionText + after;
      setText(newText);
      setMentionQuery(null);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = startIndex + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
  };

  const handleToggleEmojiPanel = () => {
    setIsEmojiPanelOpen((prev) => !prev);
    if (onPanelToggle) {
      setTimeout(onPanelToggle, 50);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart ?? text.length;
      const before = text.substring(0, cursorPos);
      const after = text.substring(cursorPos);
      const updatedText = before + emoji + after;
      setText(updatedText);
      const nextPos = cursorPos + emoji.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 10);
    } else {
      setText((prev) => prev + emoji);
    }
  };

  const handleSelectSticker = (url: string) => {
    onSendSticker(url);
  };

  const filteredMentions =
    mentionQuery !== null
      ? availableUsers
          .filter(
            (u) =>
              u.username.toLowerCase().includes(mentionQuery) ||
              u.displayName.toLowerCase().includes(mentionQuery)
          )
          .slice(0, 6)
      : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface-color)',
        borderTop: '1px solid var(--border-color)',
        position: 'relative',
        paddingBottom: 'var(--safe-area-bottom)',
      }}
    >
      {/* Mention Autocomplete Suggestions Popup */}
      {mentionQuery !== null && filteredMentions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '16px',
            right: '16px',
            backgroundColor: 'var(--surface-color)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
            maxHeight: '180px',
            overflowY: 'auto',
            zIndex: 100,
          }}
        >
          {filteredMentions.map((u) => (
            <div
              key={u.uid}
              onClick={() => handleInsertMention(u.username)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background-color 0.1s ease',
              }}
            >
              <Avatar name={u.displayName} initials={u.initials} color={u.avatarColor} imageUrl={u.avatarUrl} size="sm" />
              <div>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--text-color)',
                    display: 'block',
                  }}
                >
                  {u.displayName}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  @{u.username}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            backgroundColor: 'rgba(150, 150, 150, 0.08)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.84rem',
          }}
        >
          <div style={{ overflow: 'hidden', marginRight: '10px' }}>
            <span style={{ color: 'var(--accent-color)', fontWeight: 600, display: 'block' }}>
              Replying to {replyTo.senderName}
            </span>
            <span
              style={{
                color: 'var(--text-secondary)',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {replyTo.type === 'sticker' ? 'Sticker 🖼️' : replyTo.text}
            </span>
          </div>

          <button
            onClick={onCancelReply}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Cancel Reply"
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          padding: '8px 12px',
          gap: '8px',
        }}
      >
        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onPickImage(file);
              if (imageInputRef.current) imageInputRef.current.value = '';
            }
          }}
        />

        {/* Hidden File Input for Code / Text Files */}
        <input
          type="file"
          ref={codeFileInputRef}
          accept=".html,.htm,.py,.css,.scss,.js,.jsx,.ts,.tsx,.json,.txt,.md,.c,.cpp,.h,.java,.kt,.php,.rb,.go,.rs,.sql,.sh,.bash,.xml"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > MAX_FILE_SIZE_BYTES) {
                alert('File size exceeds 1MB limit.');
                if (codeFileInputRef.current) codeFileInputRef.current.value = '';
                return;
              }
              if (!isAllowedCodeFile(file.name)) {
                alert('Only code/text files are allowed (.html, .py, .css, .js, .ts, .json, .txt, etc.)');
                if (codeFileInputRef.current) codeFileInputRef.current.value = '';
                return;
              }
              onPickCodeFile?.(file);
              if (codeFileInputRef.current) codeFileInputRef.current.value = '';
            }
          }}
        />

        {/* Attachment Options Popup Menu */}
        <div style={{ position: 'relative' }}>
          {isAttachMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', damping: 20, stiffness: 320 }}
              style={{
                position: 'absolute',
                bottom: '48px',
                left: '0',
                backgroundColor: 'var(--surface-color)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 26px rgba(0,0,0,0.25)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 100,
                minWidth: '170px',
              }}
            >
              {/* Send Photo */}
              <button
                type="button"
                onClick={() => {
                  setIsAttachMenuOpen(false);
                  imageInputRef.current?.click();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'var(--text-color)',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    photo_camera
                  </span>
                </div>
                Photo / Image
              </button>

              {/* Send Code / Document */}
              <button
                type="button"
                onClick={() => {
                  setIsAttachMenuOpen(false);
                  codeFileInputRef.current?.click();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'var(--text-color)',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    description
                  </span>
                </div>
                Code / Document
              </button>
            </motion.div>
          )}

          {/* Single Unified Attach Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setIsAttachMenuOpen((prev) => !prev)}
            style={{
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isAttachMenuOpen ? 'var(--accent-color)' : 'var(--text-secondary)',
              backgroundColor: isAttachMenuOpen ? 'var(--surface-hover)' : 'transparent',
              background: isAttachMenuOpen ? 'var(--surface-hover)' : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.15s ease, background-color 0.15s ease',
            }}
            title="Attach photo or code file"
          >
            <motion.span
              animate={{ rotate: isAttachMenuOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className="material-icons-round"
              style={{ fontSize: '24px' }}
            >
              attach_file
            </motion.span>
          </motion.button>
        </div>

        {/* Sticker / Emoji Panel Toggle Button */}
        <button
          type="button"
          onClick={handleToggleEmojiPanel}
          style={{
            minWidth: '40px',
            minHeight: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isEmojiPanelOpen ? 'var(--accent-color)' : 'var(--text-secondary)',
            backgroundColor: isEmojiPanelOpen ? 'var(--surface-hover)' : 'transparent',
            background: isEmojiPanelOpen ? 'var(--surface-hover)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.15s ease, background-color 0.15s ease',
          }}
          title={isEmojiPanelOpen ? 'Show keyboard' : 'Emoji & stickers'}
        >
          <span className="material-icons-round" style={{ fontSize: '24px' }}>
            {isEmojiPanelOpen ? 'keyboard' : 'mood'}
          </span>
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Message..."
          rows={1}
          className="no-scrollbar"
          style={{
            flexGrow: 1,
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-color)',
            borderRadius: '20px',
            padding: '10px 14px',
            fontSize: '0.95rem',
            lineHeight: 1.4,
            resize: 'none',
            border: '1px solid var(--input-border)',
            maxHeight: '120px',
            overflowY: 'auto',
            scrollbarWidth: 'none',
          }}
        />

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: text.trim() ? 1.08 : 1 }}
          whileTap={{ scale: text.trim() ? 0.9 : 1 }}
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            minWidth: '40px',
            minHeight: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: text.trim() ? 'pointer' : 'default',
            opacity: text.trim() ? 1 : 0.4,
            transition: 'opacity 0.15s ease',
          }}
          title="Send"
        >
          <motion.span
            animate={{ rotate: text.trim() ? [0, -10, 0] : 0 }}
            transition={{ duration: 0.2 }}
            className="material-icons-round"
            style={{ fontSize: '20px' }}
          >
            send
          </motion.span>
        </motion.button>
      </div>

      {/* Telegram-style Emoji & Sticker Panel directly under message type bar */}
      <EmojiStickerPanel
        isOpen={isEmojiPanelOpen}
        onSelectEmoji={handleInsertEmoji}
        onSelectSticker={handleSelectSticker}
        onClose={() => setIsEmojiPanelOpen(false)}
      />
    </div>
  );
};
