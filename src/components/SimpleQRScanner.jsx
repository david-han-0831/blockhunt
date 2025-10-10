import React, { useState } from 'react';

/**
 * 간단한 QR 스캐너 컴포넌트 (테스트용)
 * 실제 카메라 스캔 대신 수동 입력을 제공합니다.
 */
function SimpleQRScanner({ onScan, onClose }) {
  const [qrData, setQrData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!qrData.trim()) {
      alert('QR 데이터를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // JSON 유효성 검사
      JSON.parse(qrData);
      onScan(qrData.trim());
    } catch (err) {
      alert('올바른 JSON 형식의 QR 데이터를 입력해주세요.');
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
                <strong>테스트 모드:</strong> 실제 카메라 대신 QR 데이터를 직접 입력하여 테스트할 수 있습니다.
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" style={{ color: '#212529' }}>
                    <i className="bi bi-keyboard me-2"></i>
                    QR 데이터 입력
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
                    Admin에서 생성한 QR의 <code style={{ backgroundColor: '#f8f9fa', color: '#e83e8c' }}>qrData</code> 필드 내용을 복사해서 붙여넣으세요.
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
                        처리 중...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        QR 데이터 처리
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={handleClose}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    취소
                  </button>
                </div>
              </form>

              <div className="mt-4" style={{ color: '#212529' }}>
                <h6 style={{ color: '#212529' }}>사용 방법:</h6>
                <ol className="small" style={{ color: '#6c757d' }}>
                  <li>Admin 페이지에서 QR 코드를 생성합니다</li>
                  <li>생성된 QR의 <code style={{ backgroundColor: '#f8f9fa', color: '#e83e8c' }}>qrData</code> 필드를 복사합니다</li>
                  <li>위 텍스트 영역에 붙여넣습니다</li>
                  <li>"QR 데이터 처리" 버튼을 클릭합니다</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleQRScanner;
