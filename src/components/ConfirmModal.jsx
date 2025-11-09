import React from 'react';
import Modal from './Modal';

function ConfirmModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  type = 'warning'
}) {
  const getIconAndColor = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'bi-exclamation-triangle-fill',
          iconColor: '#ef4444',
          bgColor: '#fef2f2',
          borderColor: '#fecaca'
        };
      case 'warning':
        return {
          icon: 'bi-question-circle-fill',
          iconColor: '#f59e0b',
          bgColor: '#fffbeb',
          borderColor: '#fde68a'
        };
      default:
        return {
          icon: 'bi-question-circle-fill',
          iconColor: '#3b82f6',
          bgColor: '#eff6ff',
          borderColor: '#dbeafe'
        };
    }
  };

  const { icon, iconColor, bgColor, borderColor } = getIconAndColor();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <div 
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{ 
            width: '64px', 
            height: '64px', 
            backgroundColor: bgColor,
            border: `2px solid ${borderColor}`
          }}
        >
          <i 
            className={`bi ${icon}`} 
            style={{ fontSize: '2rem', color: iconColor }}
          ></i>
        </div>
        
        <h5 className="mb-3" style={{ color: 'var(--ink)', fontWeight: '700' }}>
          {title}
        </h5>
        
        <p className="mb-4" style={{ lineHeight: '1.5', color: 'var(--muted)' }}>
          {message}
        </p>
        
        <div className="d-flex gap-2 justify-content-center">
          <button 
            className="btn-ghost"
            onClick={onClose}
            style={{ minWidth: '100px' }}
          >
            {cancelText}
          </button>
          <button 
            className={type === 'danger' ? 'btn-solve btn-wide' : 'btn-solve btn-wide'}
            onClick={handleConfirm}
            style={{ minWidth: '100px' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmModal;
