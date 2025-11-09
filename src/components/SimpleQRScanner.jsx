import React, { useState } from 'react';
import AlertModal from './AlertModal';

/**
 * Simple QR Scanner Component (Test Mode)
 * Provides manual input instead of actual camera scanning.
 */
function SimpleQRScanner({ onScan, onClose }) {
  const [qrData, setQrData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', title: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!qrData.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Input Required',
        message: 'Please enter QR data.'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // JSON validation
      JSON.parse(qrData);
      onScan(qrData.trim());
    } catch (err) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Invalid Format',
        message: 'Please enter valid JSON format QR data.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setQrData('');
    onClose();
  };

  return (
    <div 
      className="modal-backdrop show" 
      onClick={handleClose}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1050
      }}
    >
      <div 
        className="modal show d-block" 
        tabIndex="-1"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1055,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div 
          className="modal-dialog modal-dialog-centered modal-lg" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 0 }}
        >
          <div 
            className="modal-content"
            style={{ 
              backgroundColor: 'white !important',
              opacity: '1 !important',
              zIndex: 1060,
              border: '1px solid #dee2e6',
              borderRadius: '0.375rem',
              boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
            }}
          >
            <div 
              className="modal-header"
              style={{ backgroundColor: 'white', borderBottom: '1px solid #dee2e6' }}
            >
              <h5 className="modal-title" style={{ color: '#212529' }}>
                <i className="bi bi-qr-code-scan me-2"></i>
                QR Code Scanner (Test Mode)
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <div 
              className="modal-body"
              style={{ backgroundColor: 'white' }}
            >
              <div className="alert alert-info" style={{ backgroundColor: '#d1ecf1', color: '#0c5460' }}>
                <i className="bi bi-info-circle me-2"></i>
                <strong>Test Mode:</strong> You can test by directly entering QR data instead of using the camera.
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" style={{ color: '#212529' }}>
                    <i className="bi bi-keyboard me-2"></i>
                    Enter QR Data
                  </label>
                  <textarea 
                    className="form-control" 
                    rows="6"
                    placeholder='{"type":"blockhunt_blocks","qrId":"qr_abc123","blocks":["procedures_defnoreturn","procedures_defreturn"],"timestamp":"2025-10-10T10:00:00.000Z"}'
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    required
                  />
                  <div className="form-text" style={{ color: '#6c757d' }}>
                    Copy the <code style={{ backgroundColor: '#f8f9fa', color: '#e83e8c' }}>qrData</code> field content from the QR created in Admin and paste it here.
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button 
                    type="submit"
                    className="btn btn-brand"
                    disabled={isProcessing || !qrData.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        Process QR Data
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={handleClose}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Cancel
                  </button>
                </div>
              </form>

              <div className="mt-4" style={{ color: '#212529' }}>
                <h6 style={{ color: '#212529' }}>How to Use:</h6>
                <ol className="small" style={{ color: '#6c757d' }}>
                  <li>Create a QR code in the Admin page</li>
                  <li>Copy the <code style={{ backgroundColor: '#f8f9fa', color: '#e83e8c' }}>qrData</code> field from the created QR</li>
                  <li>Paste it in the text area above</li>
                  <li>Click the "Process QR Data" button</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
}

export default SimpleQRScanner;
