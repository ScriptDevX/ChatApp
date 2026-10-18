import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileContent: string;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileContent,
}) => {
  if (!isOpen) return null;

  const lines = fileContent.split('\n');

  const handleDownload = () => {
    // 1. If running in Android APK native wrapper, use Android DownloadManager
    try {
      const bridge = (window as unknown as { AndroidBridge?: { downloadFile?: (c: string, f: string, m?: string) => void } }).AndroidBridge;
      if (bridge?.downloadFile) {
        bridge.downloadFile(fileContent, fileName || 'code_snippet.txt', 'text/plain');
        return;
      }
    } catch {}

    // 2. Web browser download fallback
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'code_snippet.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(6px)',
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            width: '100%',
            maxWidth: '780px',
            height: '84vh',
            maxHeight: '750px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#0f172a',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span className="material-icons-round" style={{ color: '#38bdf8', fontSize: '22px' }}>
                code
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.96rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fileName}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>
                ({lines.length} lines)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#e2e8f0',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                title="Copy code"
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  content_copy
                </span>
                <span className="hidden sm:inline">Copy</span>
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                title="Download file"
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  download
                </span>
                <span className="hidden sm:inline">Download</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Close"
              >
                <span className="material-icons-round" style={{ fontSize: '22px' }}>
                  close
                </span>
              </button>
            </div>
          </div>

          {/* Code Viewer Body with Line Numbers */}
          <div
            style={{
              flexGrow: 1,
              overflowY: 'auto',
              overflowX: 'auto',
              padding: '16px 0',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.88rem',
              lineHeight: '1.55',
              backgroundColor: '#0b1120',
            }}
          >
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} style={{ verticalAlign: 'top' }}>
                    <td
                      style={{
                        userSelect: 'none',
                        textAlign: 'right',
                        padding: '0 16px 0 12px',
                        color: '#475569',
                        width: '40px',
                        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{
                        padding: '0 18px',
                        whiteSpace: 'pre',
                        color: '#f1f5f9',
                        wordBreak: 'break-all',
                      }}
                    >
                      {line || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
