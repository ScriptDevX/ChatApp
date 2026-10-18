import React, { useState, useEffect } from 'react';

interface AvatarProps {
  name?: string;
  initials?: string;
  color?: string;
  imageUrl?: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

const sizeMap = {
  sm: { box: 34, font: '0.8rem', icon: 16, indicator: 9 },
  md: { box: 44, font: '0.95rem', icon: 20, indicator: 10 },
  lg: { box: 54, font: '1.2rem', icon: 24, indicator: 12 },
  xl: { box: 76, font: '1.75rem', icon: 34, indicator: 14 },
};

const imagePreloadCache = new Set<string>();

export const Avatar = React.memo<AvatarProps>(({
  name,
  initials,
  color = '#0088cc',
  imageUrl,
  icon,
  size = 'md',
  isOnline,
  onClick,
  className = '',
}) => {
  const dims = sizeMap[size];
  const isAlreadyLoaded = Boolean(imageUrl && imagePreloadCache.has(imageUrl));
  const [activeLoadedUrl, setActiveLoadedUrl] = useState<string | null>(
    isAlreadyLoaded && imageUrl ? imageUrl : null
  );

  useEffect(() => {
    if (!imageUrl) {
      setActiveLoadedUrl(null);
      return;
    }

    if (imagePreloadCache.has(imageUrl)) {
      setActiveLoadedUrl(imageUrl);
      return;
    }

    let isMounted = true;
    const preloader = new Image();
    preloader.referrerPolicy = 'no-referrer';
    preloader.src = imageUrl;

    const onComplete = () => {
      imagePreloadCache.add(imageUrl);
      if (isMounted) {
        // Atomically replace with the 100% loaded image silently
        setActiveLoadedUrl(imageUrl);
      }
    };

    const onError = () => {
      if (isMounted) {
        setActiveLoadedUrl(null);
      }
    };

    if (preloader.decode) {
      preloader
        .decode()
        .then(onComplete)
        .catch(() => {
          preloader.onload = onComplete;
          preloader.onerror = onError;
        });
    } else {
      preloader.onload = onComplete;
      preloader.onerror = onError;
    }

    return () => {
      isMounted = false;
      preloader.onload = null;
      preloader.onerror = null;
    };
  }, [imageUrl]);

  const computedInitials =
    initials ||
    (name
      ? name
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : '?');

  return (
    <div
      onClick={onClick}
      style={{
        width: `${dims.box}px`,
        height: `${dims.box}px`,
        minWidth: `${dims.box}px`,
        minHeight: `${dims.box}px`,
        maxWidth: `${dims.box}px`,
        maxHeight: `${dims.box}px`,
        aspectRatio: '1 / 1',
        backgroundColor: color,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 600,
        fontSize: dims.font,
        flexShrink: 0,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      className={className}
      title={name}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* If image is not yet 100% loaded or errored, cleanly show initials or icon without chunk tearing */}
        {!activeLoadedUrl && (
          icon ? (
            <i
              className={`fa-solid ${icon}`}
              style={{ fontSize: `${dims.icon}px`, lineHeight: 1 }}
            />
          ) : (
            <span>{computedInitials}</span>
          )
        )}

        {/* Once 100% decoded in memory, instantly render the complete photo */}
        {activeLoadedUrl && (
          <img
            src={activeLoadedUrl}
            alt={name || 'Avatar'}
            referrerPolicy="no-referrer"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}
      </div>

      {isOnline !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: `${Math.max(10, dims.indicator + 1)}px`,
            height: `${Math.max(10, dims.indicator + 1)}px`,
            borderRadius: '50%',
            backgroundColor: isOnline ? '#22c55e' : 'var(--text-secondary)',
            border: '2.5px solid var(--surface-color)',
            boxShadow: isOnline ? '0 0 0 1px rgba(0,0,0,0.1), 0 0 6px rgba(34, 197, 94, 0.7)' : 'none',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
});
