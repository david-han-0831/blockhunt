import React from 'react';

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-sm',
    md: '',
    lg: 'modal-lg',
    xl: 'modal-xl'
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal fade show" 
      style={{ 
        display: 'block',
        backgroundColor: 'rgba(15, 18, 36, 0.45)',
        backdropFilter: 'saturate(120%) blur(6px)',
        zIndex: 1050,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={handleBackdropClick}
    >
      <div className={`modal-dialog ${sizeClasses[size]} modal-dialog-centered`} style={{ zIndex: 1051 }}>
        <div className="modal-content" style={{ 
          borderRadius: '16px', 
          border: 'none', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          backgroundColor: 'var(--card)',
          zIndex: 1051
        }}>
          {title && (
            <div className="modal-header" style={{ 
              borderBottom: '1px solid var(--line)', 
              padding: '14px 16px',
              position: 'sticky',
              top: 0,
              background: '#fff'
            }}>
              <h5 className="modal-title" style={{ color: 'var(--ink)', fontWeight: '800' }}>
                {title}
              </h5>
              {showCloseButton && (
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={onClose}
                  style={{ fontSize: '0.75rem' }}
                ></button>
              )}
            </div>
          )}
          <div className="modal-body" style={{ padding: '16px', maxHeight: '70vh', overflow: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
