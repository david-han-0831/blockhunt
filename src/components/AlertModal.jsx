import React from 'react';
import Modal from './Modal';

function AlertModal({ 
  isOpen, 
  onClose, 
  type = 'info',
  title, 
  message, 
  confirmText = '확인',
  onConfirm 
}) {
  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'bi-check-circle-fill',
          iconColor: '#16a34a',
          bgColor: '#ecfdf5',
          borderColor: '#bbf7d0'
        };
      case 'error':
        return {
          icon: 'bi-exclamation-triangle-fill',
          iconColor: '#ef4444',
          bgColor: '#fef2f2',
          borderColor: '#fecaca'
        };
      case 'warning':
        return {
          icon: 'bi-exclamation-circle-fill',
          iconColor: '#f59e0b',
          bgColor: '#fffbeb',
          borderColor: '#fde68a'
        };
      default:
        return {
          icon: 'bi-info-circle-fill',
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
    } else {
      onClose();
    }
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
        
        {title && (
          <h5 className="mb-3" style={{ color: 'var(--brand-ink)', fontWeight: '700' }}>
            {title}
          </h5>
        )}
        
        <p className="mb-4 text-muted" style={{ lineHeight: '1.5' }}>
          {message}
        </p>
        
        <button 
          className="btn btn-brand px-4 py-2"
          onClick={handleConfirm}
          style={{ minWidth: '100px' }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

export default AlertModal;
