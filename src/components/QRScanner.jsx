import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * QR 코드 스캐너 컴포넌트
 * 
 * 주요 특징:
 * - 카메라 권한 요청 로직 개선
 * - 타이밍 문제 해결
 * - 중복 useEffect 정리
 * - 안전한 cleanup 로직
 * - 모바일 웹 환경 지원
 * 
 * 사용법:
 * <QRScanner 
 *   onScan={(qrData) => console.log('Scanned:', qrData)} 
 *   onClose={() => setShowScanner(false)} 
 * />
 */
function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQRData, setManualQRData] = useState('');
  const [cameraPermission, setCameraPermission] = useState('pending');
  const [isScanning, setIsScanning] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // 카메라 권한 확인 (실제 스트림 시작하지 않음)
  const checkCameraPermission = useCallback(async () => {
    try {
      console.log('📸 [QRScanner] Checking camera permission...');
      
      // 권한 상태만 확인 (스트림 시작하지 않음)
      const permission = await navigator.permissions.query({ name: 'camera' });
      
      if (permission.state === 'granted') {
        console.log('✅ [QRScanner] Camera permission already granted');
        setCameraPermission('granted');
        return true;
      } else if (permission.state === 'prompt') {
        console.log('⚠️ [QRScanner] Camera permission needs to be requested');
        setCameraPermission('pending');
        return false;
      } else {
        console.log('❌ [QRScanner] Camera permission denied');
        setCameraPermission('denied');
        return false;
      }
    } catch (err) {
      console.warn('⚠️ [QRScanner] Permission API not supported, will request directly:', err);
      setCameraPermission('pending');
      return false;
    }
  }, []);

  // 안전한 cleanup 함수
  const safeCleanup = useCallback(() => {
    try {
      console.log('🧹 [QRScanner] Starting cleanup...');
      
      // 1. 스캐너 정리
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          console.log('✅ [QRScanner] Scanner cleared successfully');
        } catch (clearErr) {
          console.warn('⚠️ [QRScanner] Scanner clear failed (ignored):', clearErr);
        }
        scannerRef.current = null;
      }
      
      // 2. 미디어 스트림 정리 (DOM 조작 없이)
      if (containerRef.current) {
        try {
          const videoElements = containerRef.current.querySelectorAll('video');
          videoElements.forEach(video => {
            try {
              if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
              }
            } catch (err) {
              console.warn('⚠️ [QRScanner] Error stopping video tracks:', err);
            }
          });
        } catch (err) {
          console.warn('⚠️ [QRScanner] Error cleaning video tracks:', err);
        }
      }
      
      // 3. 상태 초기화
      setIsInitialized(false);
      setIsScanning(false);
      setError(null);
      
      console.log('✅ [QRScanner] Cleanup completed');
      
    } catch (err) {
      console.warn('⚠️ [QRScanner] Cleanup error (ignored):', err);
    }
  }, []);

  // 스캐너 초기화
  const initializeScanner = useCallback(async () => {
    if (isInitialized || scannerRef.current) {
      console.log('⚠️ [QRScanner] Scanner already initialized, skipping...');
      return;
    }

    try {
      console.log('🔍 [QRScanner] Starting scanner initialization...');
      setError(null);
      
      // 1. DOM 요소 준비
      if (!containerRef.current) {
        throw new Error('Container ref not available');
      }
      
      console.log('🎯 [QRScanner] Container ready');
      
      // 2. 기존 내용 정리
      containerRef.current.innerHTML = '';
      
      // 3. Html5QrcodeScanner 생성
      console.log('🎥 [QRScanner] Creating scanner...');
      
      // 모바일 환경 감지
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      const scanner = new Html5QrcodeScanner(
        containerRef.current.id,
        { 
          fps: isMobile ? 5 : 10, // 모바일에서는 FPS 낮춤
          qrbox: isMobile ? { width: 200, height: 200 } : { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: !isMobile, // 모바일에서는 줌 슬라이더 숨김
          useBarCodeDetectorIfSupported: true,
          rememberLastUsedCamera: true,
          // 모바일 환경에 최적화된 카메라 제약 조건
          videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: isMobile ? { ideal: 640, max: 1280 } : { ideal: 1280, max: 1920 },
            height: isMobile ? { ideal: 480, max: 720 } : { ideal: 720, max: 1080 }
          }
        },
        false // verbose 모드 비활성화
      );

      // 4. 렌더링
      console.log('🚀 [QRScanner] Rendering scanner...');
      setIsScanning(true);
      
      await scanner.render(
        (decodedText) => {
          console.log('✅ [QRScanner] QR Code scanned:', decodedText);
          setIsScanning(false);
          
          // 스캔 성공 시 cleanup (모달 닫기 전에)
          setTimeout(() => {
            safeCleanup();
            onScan(decodedText);
          }, 100);
        },
        (error) => {
          // 스캔 실패는 정상적인 상황 (로그만 출력)
          if (error && !error.includes('No QR code found')) {
            console.log('📷 [QRScanner] Scan error (normal):', error);
          }
        }
      );
      
      scannerRef.current = scanner;
      setIsInitialized(true);
      setCameraPermission('granted');
      console.log('✅ [QRScanner] Scanner ready!');
      
    } catch (err) {
      console.error('❌ [QRScanner] Initialization failed:', err);
      setError(`QR scanner initialization failed: ${err.message}`);
      setCameraPermission('denied');
      setIsScanning(false);
      
      // 재시도 로직
      if (retryCount < maxRetries) {
        console.log(`🔄 [QRScanner] Retrying... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          initializeScanner();
        }, 1000);
      }
    }
  }, [isInitialized, retryCount, maxRetries]);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    let timer;
    
    const startInitialization = async () => {
      // 카메라 권한 확인
      const hasPermission = await checkCameraPermission();
      
      if (hasPermission) {
        // 권한이 있으면 바로 초기화
        timer = setTimeout(initializeScanner, 500);
      } else {
        // 권한이 없으면 사용자에게 요청할 시간을 주고 초기화
        timer = setTimeout(initializeScanner, 1000);
      }
    };
    
    startInitialization();
    
    return () => {
      if (timer) clearTimeout(timer);
      // cleanup은 컴포넌트가 실제로 언마운트될 때만 실행
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행

  // 컴포넌트 언마운트 시에만 cleanup 실행
  useEffect(() => {
    return () => {
      safeCleanup();
    };
  }, []);

  const handleClose = () => {
    safeCleanup();
    onClose();
  };

  const handleRetry = () => {
    setRetryCount(0);
    setError(null);
    setIsInitialized(false);
    initializeScanner();
  };

  return (
    <div className="modal-backdrop show" onClick={handleClose} style={{ backgroundColor: 'rgba(15, 18, 36, 0.95)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
      <div className="modal show d-block" tabIndex="-1" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1055 }}>
        <div className={`modal-dialog modal-dialog-centered ${/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'modal-fullscreen-sm-down' : 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', opacity: 1, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div className="modal-header" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #dee2e6' }}>
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
            <div className="modal-body" style={{ backgroundColor: '#ffffff' }}>
              {/* HTTPS 경고 */}
              {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
                <div className="alert alert-warning mb-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Note:</strong> Camera only works on HTTPS connections.
                </div>
              )}

              {/* 모바일 환경 안내 */}
              {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                <div className="alert alert-info mb-3">
                  <i className="bi bi-phone me-2"></i>
                  <strong>Mobile Optimized:</strong> QR scanner optimized for mobile devices.
                </div>
              )}

              {/* 상태 표시 */}
              {cameraPermission === 'pending' && !error && !isScanning && (
                <div className="alert alert-info mb-3">
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div>Preparing camera...</div>
                  </div>
                  <small className="d-block mt-2">
                    Please click "Allow" when the browser requests camera permission.
                  </small>
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
                      <strong>How to allow camera permission:</strong>
                      <ol className="mb-0 mt-2 small">
                        <li>Click the lock icon on the left side of the browser address bar</li>
                        <li>Select "Camera" or "Permissions" menu</li>
                        <li>Change camera permission to "Allow"</li>
                        <li>Refresh the page and try again</li>
                      </ol>
                    </div>
                  )}
                  
                  <div className="text-center mt-3">
                    <button 
                      className="btn btn-outline-primary me-2"
                      onClick={handleRetry}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Retry
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setShowManualInput(true)}
                    >
                      <i className="bi bi-keyboard me-1"></i>
                      Enter QR Data Manually
                    </button>
                  </div>
                </div>
              ) : showManualInput ? (
                <div>
                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-keyboard me-2"></i>
                      Enter QR Data Manually (for testing)
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
                      Process QR Data
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setShowManualInput(false)}
                    >
                      <i className="bi bi-camera me-1"></i>
                      Return to Camera
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 스캐너 컨테이너 */}
                  <div 
                    ref={containerRef}
                    id="qr-reader-v2"
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
                      width: '100%',
                      overflow: 'hidden'
                    }}
                  >
                    {/* 로딩 상태 표시 */}
                    {!isScanning && cameraPermission === 'pending' && (
                      <div className="text-center text-muted">
                        <div className="spinner-border text-primary mb-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div>Starting camera...</div>
                      </div>
                    )}
                    
                    {!isScanning && cameraPermission === 'denied' && (
                      <div className="text-center text-muted">
                        <i className="bi bi-camera-off" style={{ fontSize: '3rem' }}></i>
                        <div className="mt-2">Camera permission denied</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>How to use:</strong>
                    <ul className="mb-0 mt-2">
                      <li>Point the camera at the QR code</li>
                      <li>QR code will be automatically recognized</li>
                      <li>You can acquire blocks when recognized</li>
                    </ul>
                  </div>
                  
                  <div className="text-center">
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setShowManualInput(true)}
                    >
                      <i className="bi bi-keyboard me-1"></i>
                      Enter QR Data Manually (for testing)
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #dee2e6' }}>
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
