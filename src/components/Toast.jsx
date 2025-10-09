import React, { useEffect, useState } from 'react';

function Toast({ 
  message, 
  type = 'info',
  duration = 3000,
  onClose 
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // 애니메이션 시간
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyle = () => {
    const baseStyle = {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '9999',
      minWidth: '300px',
      padding: '1rem 1.25rem',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      transform: isVisible ? 'translateY(0)' : 'translateY(100px)',
      opacity: isVisible ? 1 : 0,
      transition: 'all 0.3s ease-out'
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: '#ecfdf5',
          border: '1px solid #bbf7d0',
          color: '#166534'
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626'
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#d97706'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          color: '#2563eb'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-exclamation-triangle-fill';
      case 'warning':
        return 'bi-exclamation-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  };

  return (
    <div style={getToastStyle()}>
      <i className={`bi ${getIcon()}`} style={{ fontSize: '1.25rem' }}></i>
      <span style={{ fontWeight: '500' }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => {
            if (onClose) onClose();
          }, 300);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: '1.25rem',
          cursor: 'pointer',
          marginLeft: 'auto',
          padding: '0'
        }}
      >
        <i className="bi bi-x"></i>
      </button>
    </div>
  );
}

export default Toast;
