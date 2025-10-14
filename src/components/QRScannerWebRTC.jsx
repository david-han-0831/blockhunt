import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * WebRTC API를 직접 사용하는 QR 스캐너 컴포넌트
 * html5-qrcode의 Html5QrcodeScanner 대신 Html5Qrcode를 직접 사용
 * 
 * 사용법:
 * <QRScannerWebRTC 
 *   onScan={(qrData) => console.log('Scanned:', qrData)} 
 *   onClose={() => setShowScanner(false)} 
 * />
 */
function QRScannerWebRTC({ onScan, onClose }) {
  const videoRef = useRef(null);
  const qrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQRData, setManualQRData] = useState('');
  const [cameraPermission, setCameraPermission] = useState('pending');
  const [isInitialized, setIsInitialized] = useState(false);

  // 카메라 스트림 정리
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // QR 스캐너 정리
  const stopQRScanner = useCallback(() => {
    if (qrCodeRef.current) {
      try {
        qrCodeRef.current.stop();
        qrCodeRef.current.clear();
      } catch (err) {
        console.warn('⚠️ [QRScannerWebRTC] Error stopping QR scanner:', err);
      }
      qrCodeRef.current = null;
    }
  }, []);

  // 안전한 cleanup
  const safeCleanup = useCallback(() => {
    console.log('🧹 [QRScannerWebRTC] Starting cleanup...');
    stopQRScanner();
    stopCamera();
    setIsScanning(false);
    setIsInitialized(false);
    setError(null);
    console.log('✅ [QRScannerWebRTC] Cleanup completed');
  }, [stopQRScanner, stopCamera]);

  // QR 스캐너 시작
  const startQRScanner = useCallback(async () => {
    if (isInitialized) {
      console.log('⚠️ [QRScannerWebRTC] Already initialized, skipping...');
      return;
    }

    try {
      console.log('🔍 [QRScannerWebRTC] Starting QR scanner...');
      setError(null);
      setIsScanning(true);

      // Html5Qrcode 인스턴스 생성
      const qrCode = new Html5Qrcode('qr-reader-webrtc');
      qrCodeRef.current = qrCode;

      // 카메라 시작
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      // 후면 카메라 사용
      const cameraId = await Html5Qrcode.getCameras().then(cameras => {
        // 후면 카메라 우선 선택
        const backCamera = cameras.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('rear') ||
          camera.label.toLowerCase().includes('environment')
        );
        return backCamera ? backCamera.id : cameras[0].id;
      });

      await qrCode.start(
        cameraId,
        config,
        (decodedText) => {
          console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
          setIsScanning(false);
          
          // 스캔 성공 시 cleanup
          setTimeout(() => {
            safeCleanup();
            onScan(decodedText);
          }, 100);
        },
        (error) => {
          // 스캔 실패는 정상적인 상황
          if (error && !error.includes('No QR code found')) {
            console.log('📷 [QRScannerWebRTC] Scan error (normal):', error);
          }
        }
      );

      setIsInitialized(true);
      setCameraPermission('granted');
      console.log('✅ [QRScannerWebRTC] QR scanner ready!');

    } catch (err) {
      console.error('❌ [QRScannerWebRTC] QR scanner failed:', err);
      setError(`QR 스캐너 초기화 실패: ${err.message}`);
      setCameraPermission('denied');
      setIsScanning(false);
      safeCleanup();
    }
  }, [isInitialized, onScan, safeCleanup]);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialized) {
        startQRScanner();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      safeCleanup();
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행

  const handleClose = () => {
    safeCleanup();
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setIsInitialized(false);
    startQRScanner();
  };

  return (
    <div className="modal-backdrop show" onClick={handleClose}>
      <div className="modal show d-block" tabIndex="-1">
        <div className={`modal-dialog modal-dialog-centered ${/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'modal-fullscreen-sm-down' : 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
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

              {/* 모바일 환경 안내 */}
              {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                <div className="alert alert-info mb-3">
                  <i className="bi bi-phone me-2"></i>
                  <strong>모바일 최적화:</strong> 모바일 환경에 맞게 최적화된 QR 스캐너입니다.
                </div>
              )}

              {/* 상태 표시 */}
              {cameraPermission === 'pending' && !error && !isScanning && (
                <div className="alert alert-info mb-3">
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div>카메라를 준비하는 중...</div>
                  </div>
                  <small className="d-block mt-2">
                    브라우저에서 카메라 권한 요청 알림이 표시되면 "허용"을 눌러주세요.
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
                      className="btn btn-outline-primary me-2"
                      onClick={handleRetry}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      다시 시도
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setShowManualInput(true)}
                    >
                      <i className="bi bi-keyboard me-1"></i>
                      QR 데이터 직접 입력
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
                  {/* QR 스캐너 컨테이너 */}
                  <div 
                    id="qr-reader-webrtc"
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

export default QRScannerWebRTC;
