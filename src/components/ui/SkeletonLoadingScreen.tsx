import React from 'react';

export const SkeletonLoadingScreen: React.FC = () => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-color)',
        overflow: 'hidden',
      }}
    >
      {/* Skeleton Top Header */}
      <div
        style={{
          height: '56px',
          padding: '0 16px',
          backgroundColor: 'var(--header-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.25)',
          }}
        />
        <div
          style={{
            width: '100px',
            height: '20px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}
        />
        <div style={{ width: '26px' }} />
      </div>

      {/* Skeleton Tabs Bar */}
      <div
        style={{
          height: '46px',
          backgroundColor: 'var(--header-bg)',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '70px',
              height: '16px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255,255,255,0.3)',
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '70px',
              height: '16px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          />
        </div>
      </div>

      {/* Skeleton Search Bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div
          style={{
            width: '100%',
            height: '38px',
            borderRadius: '12px',
            backgroundColor: 'var(--input-bg)',
            opacity: 0.6,
          }}
        />
      </div>

      {/* Skeleton Chat List Items */}
      <div style={{ flexGrow: 1, overflow: 'hidden', padding: '6px 0' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <div
            key={n}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
              gap: '12px',
              animation: 'skeletonPulse 1.4s ease-in-out infinite',
            }}
          >
            {/* Avatar skeleton */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-color)',
                flexShrink: 0,
                opacity: 0.8,
              }}
            />

            {/* Info skeleton */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: `${90 + (n * 17) % 60}px`,
                    height: '15px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--surface-color)',
                  }}
                />
                <div
                  style={{
                    width: '35px',
                    height: '12px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--surface-color)',
                    opacity: 0.6,
                  }}
                />
              </div>

              <div
                style={{
                  width: `${140 + (n * 23) % 90}px`,
                  height: '12px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--surface-color)',
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
