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
  const [cameraPermission, setCameraPermission] = useState('pending'); // 'pending', 'granted', 'denied'

  useEffect(() => {
    let scanner = null;
    let isMounted = true;
    
    const requestCameraPermission = async () => {
      try {
        console.log('📸 Requesting camera permission...');
        
        // 명시적으로 카메라 권한 요청
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // 후면 카메라 우선
        });
        
        console.log('✅ Camera permission granted');
        setCameraPermission('granted');
        
        // 권한 획득 후 스트림 즉시 중지 (스캐너가 다시 시작할 것)
        stream.getTracks().forEach(track => track.stop());
        
        return true;
      } catch (err) {
        console.error('❌ Camera permission denied:', err);
        setCameraPermission('denied');
        setError(`카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.`);
        return false;
      }
    };
    
    const initializeScanner = async () => {
      try {
        console.log('🔍 [QRScanner] Initializing QR scanner...');
        
        // 카메라 권한 먼저 요청
        const hasPermission = await requestCameraPermission();
        console.log('📸 [QRScanner] Permission result:', hasPermission);
        
        if (!hasPermission || !isMounted) {
          console.log('⚠️ [QRScanner] No permission or unmounted');
          return;
        }
        
        // DOM 요소가 존재하는지 확인하고 안정화 대기
        let qrReaderElement = document.getElementById('qr-reader');
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!qrReaderElement && attempts < maxAttempts && isMounted) {
          console.log(`🔍 [QRScanner] Waiting for DOM element... attempt ${attempts + 1}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          qrReaderElement = document.getElementById('qr-reader');
          attempts++;
        }
        
        if (!qrReaderElement || !isMounted) {
          console.log('⚠️ [QRScanner] QR reader element not found after waiting');
          return;
        }
        
        console.log('🎯 [QRScanner] DOM element found and stable:', qrReaderElement);
        
        // DOM 요소 내용을 완전히 비우기
        qrReaderElement.innerHTML = '';
        
        console.log('🎥 [QRScanner] Creating Html5QrcodeScanner...');
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
            rememberLastUsedCamera: true,
            // 모바일 최적화
            videoConstraints: {
              facingMode: 'environment', // 후면 카메라
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          false // verbose
        );

        const onScanSuccess = (decodedText, decodedResult) => {
          console.log('✅ [QRScanner] QR Code scanned:', decodedText);
          if (isMounted) {
            setIsScanning(false);
            if (scanner) {
              try {
                scanner.clear();
              } catch (err) {
                console.warn('⚠️ [QRScanner] Scanner clear error:', err);
              }
            }
            onScan(decodedText);
          }
        };

        const onScanFailure = (error) => {
          // 대부분의 스캔 실패는 정상적인 상황 (QR 코드가 없을 때)
          // console.warn('QR scan error:', error);
        };

        console.log('🚀 [QRScanner] Rendering scanner...');
        
        // 렌더링 전 최종 DOM 확인
        const finalCheck = document.getElementById('qr-reader');
        if (!finalCheck || !isMounted) {
          console.log('⚠️ [QRScanner] DOM element disappeared before render');
          return;
        }
        
        await scanner.render(onScanSuccess, onScanFailure);
        
        if (isMounted) {
          setIsScanning(true);
          scannerRef.current = scanner;
          console.log('✅ [QRScanner] Scanner initialized successfully, isScanning=true');
          
          // 렌더링 완료 후 DOM 상태 확인
          setTimeout(() => {
            const finalElement = document.getElementById('qr-reader');
            console.log('🔍 [QRScanner] Final DOM check:', finalElement);
            if (finalElement) {
              console.log('📊 [QRScanner] Element children:', finalElement.children.length);
              console.log('📊 [QRScanner] Element has video element:', finalElement.querySelector('video') !== null);
            }
          }, 200);
        }
        
      } catch (err) {
        console.error('❌ [QRScanner] Failed to initialize scanner:', err);
        console.error('❌ [QRScanner] Error details:', err.message, err.stack);
        if (isMounted) {
          setError(`QR 스캐너를 초기화할 수 없습니다: ${err.message}`);
          setCameraPermission('denied');
        }
      }
    };

    // DOM이 완전히 렌더링된 후 초기화 (React Strict Mode 고려하여 지연 시간 증가)
    const timer = setTimeout(initializeScanner, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
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
              {/* HTTPS 경고 */}
              {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
                <div className="alert alert-warning mb-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>주의:</strong> 카메라는 HTTPS 연결에서만 작동합니다.
                </div>
              )}

              {/* 카메라 권한 및 초기화 상태 표시 */}
              {cameraPermission === 'pending' && !error && (
                <div className="alert alert-info mb-3">
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div>카메라 권한을 요청하는 중...</div>
                  </div>
                  <small className="d-block mt-2">
                    브라우저에서 카메라 권한 요청 알림이 표시되면 "허용"을 눌러주세요.
                  </small>
                </div>
              )}
              
              {cameraPermission === 'granted' && !isScanning && !error && !showManualInput && (
                <div className="alert alert-info mb-3">
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div>카메라를 시작하는 중...</div>
                  </div>
                </div>
              )}

              {error ? (
                <div>
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                  {cameraPermission === 'denied' && (
                    <div className="alert alert-info">
                      <strong>카메라 권한 허용 방법:</strong>
                      <ol className="mb-0 mt-2 small">
                        <li>브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭</li>
                        <li>"카메라" 또는 "권한" 메뉴 선택</li>
                        <li>카메라 권한을 "허용"으로 변경</li>
                        <li>페이지 새로고침 후 다시 시도</li>
                      </ol>
                    </div>
                  )}
                  <div className="text-center mt-3">
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => setShowManualInput(true)}
                    >
                      <i className="bi bi-keyboard me-1"></i>
                      QR 데이터 직접 입력 (테스트용)
                    </button>
                  </div>
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
                      position: 'relative',
                      width: '100%'
                    }}
                  >
                    {/* React가 렌더링하는 내용을 완전히 제거하고 Html5QrcodeScanner가 직접 렌더링하도록 함 */}
                    {!isScanning && cameraPermission === 'pending' && (
                      <div className="text-center text-muted">
                        <div className="spinner-border text-primary mb-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div>카메라 권한을 요청하는 중...</div>
                      </div>
                    )}
                    {!isScanning && cameraPermission === 'granted' && (
                      <div className="text-center text-muted">
                        <div className="spinner-border text-primary mb-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div>카메라를 시작하는 중...</div>
                      </div>
                    )}
                    {!isScanning && cameraPermission === 'denied' && (
                      <div className="text-center text-muted">
                        <i className="bi bi-camera-off" style={{ fontSize: '3rem' }}></i>
                        <div className="mt-2">카메라 권한이 거부되었습니다</div>
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
