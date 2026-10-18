import React from 'react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (val: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeValue,
  placeholder = 'Search...',
  onClear,
  style,
  ...props
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--input-bg)',
        borderRadius: '12px',
        padding: '8px 12px',
        border: '1px solid var(--input-border)',
        gap: '8px',
        width: '100%',
        ...style,
      }}
    >
      <span
        className="material-icons-round"
        style={{ color: 'var(--text-secondary)', fontSize: '20px' }}
      >
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 'none',
          background: 'none',
          color: 'var(--text-color)',
          fontSize: '0.95rem',
        }}
        {...props}
      />
      {value && (
        <button
          onClick={() => {
            onChangeValue('');
            onClear?.();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            padding: '2px',
          }}
          title="Clear"
        >
          <span className="material-icons-round" style={{ fontSize: '18px' }}>
            close
          </span>
        </button>
      )}
    </div>
  );
};
