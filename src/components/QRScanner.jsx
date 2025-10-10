import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * QR 코드 스캐너 컴포넌트
 * 
 * 사용법:
 * <QRScanner 
 *   onScan={(qrData) => console.log('Scanned:', qrData)} 
 *   onClose={() => setShowScanner(false)} 
 * />
 */
function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQRData, setManualQRData] = useState('');

  useEffect(() => {
    let scanner = null;
    let isMounted = true;
    
    const initializeScanner = async () => {
      try {
        console.log('🔍 Initializing QR scanner...');
        
        // DOM 요소가 존재하는지 확인
        const qrReaderElement = document.getElementById('qr-reader');
        if (!qrReaderElement || !isMounted) {
          console.log('QR reader element not found or component unmounted');
          return;
        }
        
        scanner = new Html5QrcodeScanner(
          'qr-reader',
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2,
            useBarCodeDetectorIfSupported: true,
            rememberLastUsedCamera: true
          },
          false // verbose
        );

        const onScanSuccess = (decodedText, decodedResult) => {
          console.log('🔍 QR Code scanned:', decodedText);
          if (isMounted) {
            setIsScanning(false);
            if (scanner) {
              try {
                scanner.clear();
              } catch (err) {
                console.warn('Scanner clear error:', err);
              }
            }
            onScan(decodedText);
          }
        };

        const onScanFailure = (error) => {
          // 대부분의 스캔 실패는 정상적인 상황 (QR 코드가 없을 때)
          // console.warn('QR scan error:', error);
        };

        await scanner.render(onScanSuccess, onScanFailure);
        
        if (isMounted) {
          setIsScanning(true);
          scannerRef.current = scanner;
          console.log('✅ QR scanner initialized successfully');
        }
        
      } catch (err) {
        console.error('❌ Failed to initialize QR scanner:', err);
        if (isMounted) {
          setError(`QR 스캐너를 초기화할 수 없습니다: ${err.message}`);
        }
      }
    };

    // 약간의 지연 후 초기화 (DOM이 완전히 렌더링된 후)
    const timer = setTimeout(initializeScanner, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      
      if (scannerRef.current) {
        try {
          // DOM 요소가 여전히 존재하는지 확인
          const qrReaderElement = document.getElementById('qr-reader');
          if (qrReaderElement && qrReaderElement.contains(scannerRef.current._element)) {
            scannerRef.current.clear();
          }
        } catch (err) {
          console.warn('Scanner cleanup error (ignored):', err);
        }
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  const handleClose = () => {
    if (scannerRef.current) {
      try {
        // DOM 요소가 여전히 존재하는지 확인
        const qrReaderElement = document.getElementById('qr-reader');
        if (qrReaderElement && qrReaderElement.contains(scannerRef.current._element)) {
          scannerRef.current.clear();
        }
      } catch (err) {
        console.warn('Scanner cleanup error (ignored):', err);
      }
      scannerRef.current = null;
    }
    onClose();
  };

  return (
    <div className="modal-backdrop show" onClick={handleClose}>
      <div className="modal show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-qr-code-scan me-2"></i>
                Scan QR Code
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {error ? (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              ) : showManualInput ? (
                <div>
                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-keyboard me-2"></i>
                      QR 데이터 직접 입력 (테스트용)
                    </label>
                    <textarea 
                      className="form-control" 
                      rows="4"
                      placeholder='{"type":"blockhunt_blocks","qrId":"qr_abc123","block":"controls_if","timestamp":"2025-10-10T10:00:00.000Z"}'
                      value={manualQRData}
                      onChange={(e) => setManualQRData(e.target.value)}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-brand"
                      onClick={() => {
                        if (manualQRData.trim()) {
                          onScan(manualQRData.trim());
                        }
                      }}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      QR 데이터 처리
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setShowManualInput(false)}
                    >
                      <i className="bi bi-camera me-1"></i>
                      카메라로 돌아가기
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    id="qr-reader" 
                    className="mb-3"
                    style={{ 
                      minHeight: '300px',
                      backgroundColor: '#f8f9fa',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    {!isScanning && (
                      <div className="text-center text-muted">
                        <i className="bi bi-camera" style={{ fontSize: '3rem' }}></i>
                        <div className="mt-2">카메라를 초기화하는 중...</div>
                      </div>
                    )}
                  </div>
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>사용 방법:</strong>
                    <ul className="mb-0 mt-2">
                      <li>카메라에 QR 코드를 비춰주세요</li>
                      <li>QR 코드가 자동으로 인식됩니다</li>
                      <li>인식되면 블록을 획득할 수 있습니다</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setShowManualInput(true)}
                    >
                      <i className="bi bi-keyboard me-1"></i>
                      QR 데이터 직접 입력 (테스트용)
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleClose}
              >
                <i className="bi bi-x-circle me-1"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRScanner;
