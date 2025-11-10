import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import AlertModal from './AlertModal';

/**
 * QR 코드를 표시하는 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.show - 모달 표시 여부
 * @param {Function} props.onHide - 모달 닫기 핸들러
 * @param {Object} props.qrData - QR 코드 데이터 (id, name, block, etc.)
 * @param {Object} props.blockInfo - 블록 정보 (name, icon, category)
 */
function QRViewModal({ show, onHide, qrData, blockInfo }) {
  const canvasRef = useRef(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const generateQRCode = useCallback(async () => {
    try {
      // QR 코드에 담을 데이터 (JSON 형태)
      const qrPayload = {
        type: 'blockhunt_blocks',
        qrId: qrData.id,
        block: qrData.block,
        name: qrData.name,
        timestamp: new Date().toISOString()
      };

      // Canvas에 QR 코드 생성
      await QRCode.toCanvas(canvasRef.current, JSON.stringify(qrPayload), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // 이미지 URL도 생성 (다운로드용)
      const imageUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        width: 600,
        margin: 2
      });
      setQrImageUrl(imageUrl);
    } catch (error) {
      console.error('QR code generation error:', error);
    }
  }, [qrData]);

  useEffect(() => {
    if (show && qrData && canvasRef.current) {
      generateQRCode();
    }
  }, [show, qrData, generateQRCode]);

  const handleDownload = () => {
    if (qrImageUrl) {
      const link = document.createElement('a');
      link.href = qrImageUrl;
      link.download = `qr-${qrData.name.replace(/\s+/g, '-')}-${qrData.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyQRData = () => {
    const qrPayload = {
      type: 'blockhunt_blocks',
      qrId: qrData.id,
      block: qrData.block,
      name: qrData.name,
      timestamp: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(qrPayload, null, 2));
    setAlertModal({
      isOpen: true,
      type: 'success',
      title: 'Copied!',
      message: 'QR data has been copied to clipboard.'
    });
  };

  if (!show) return null;

  return (
    <>
      <div 
        className="modal-backdrop fade show" 
        onClick={onHide}
        style={{ zIndex: 1050 }}
      ></div>
      <div 
        className="modal fade show d-block" 
        tabIndex="-1"
        style={{ zIndex: 1055 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-qr-code me-2"></i>
                View QR Code
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onHide}
              ></button>
            </div>
            
            <div className="modal-body text-center">
              {qrData && (
                <>
                  <h6 className="mb-3">{qrData.name}</h6>
                  
                  {blockInfo && (
                    <div className="mb-3">
                      <span className="badge bg-light text-dark">
                        <i className={`${blockInfo.icon} me-1`}></i>
                        {blockInfo.name}
                      </span>
                      <span className="badge bg-secondary ms-2">
                        {blockInfo.category}
                      </span>
                    </div>
                  )}

                  {/* QR 코드 캔버스 */}
                  <div className="d-flex justify-content-center mb-3">
                    <canvas ref={canvasRef} className="border rounded"></canvas>
                  </div>

                  {/* QR 코드 정보 */}
                  <div className="small text-start bg-light p-3 rounded">
                    <div className="mb-2">
                      <strong>QR ID:</strong> <code className="small">{qrData.id}</code>
                    </div>
                    <div className="mb-2">
                      <strong>Block ID:</strong> <code className="small">{qrData.block}</code>
                    </div>
                    <div className="mb-2">
                      <strong>Status:</strong>{' '}
                      <span className={`badge ${qrData.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {qrData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {qrData.startDate && (
                      <div className="mb-2">
                        <strong>Start Date:</strong> {qrData.startDate}
                      </div>
                    )}
                    {qrData.endDate && (
                      <div>
                        <strong>End Date:</strong> {qrData.endDate}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-sm btn-outline-secondary"
                onClick={handleCopyQRData}
              >
                <i className="bi bi-clipboard me-1"></i>
                Copy Data
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-brand"
                onClick={handleDownload}
              >
                <i className="bi bi-download me-1"></i>
                Download
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={onHide}
              >
                Close
              </button>
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
    </>
  );
}

export default QRViewModal;

