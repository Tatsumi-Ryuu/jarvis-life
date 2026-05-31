import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  panelStyle?: React.CSSProperties;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, className = '', panelStyle }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {/* Panel */}
      <div
        className={`relative flex flex-col ${className}`}
        style={{
          backgroundColor: 'var(--color-panel)',
          borderWidth: 6,
          borderStyle: 'solid',
          borderColor: 'var(--color-border-strong)',
          borderRadius: 0,
          maxWidth: 800,
          width: '90%',
          padding: '32px 40px',
          zIndex: 101,
          ...panelStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
};
