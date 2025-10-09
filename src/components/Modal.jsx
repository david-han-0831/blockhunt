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
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdropClick}
    >
      <div className={`modal-dialog ${sizeClasses[size]} modal-dialog-centered`}>
        <div className="modal-content" style={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
          {title && (
            <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '1.5rem' }}>
              <h5 className="modal-title" style={{ color: 'var(--brand-ink)', fontWeight: '800' }}>
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
          <div className="modal-body" style={{ padding: '1.5rem' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
