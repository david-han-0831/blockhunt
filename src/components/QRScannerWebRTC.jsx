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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [cameraPermission, setCameraPermission] = useState('pending');
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // 카메라 스트림 정리
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // QR 스캐너 정리
  const stopQRScanner = useCallback(async () => {
    if (qrCodeRef.current) {
      try {
        // 먼저 스캔 중지
        await qrCodeRef.current.stop();
        console.log('✅ [QRScannerWebRTC] QR scanner stopped');
      } catch (err) {
        console.warn('⚠️ [QRScannerWebRTC] Error stopping QR scanner:', err);
      }
      qrCodeRef.current = null;
    }
  }, []);

  // 카메라 전환
  const switchCamera = useCallback(async () => {
    if (isSwitchingCamera) {
      return;
    }

    try {
      setIsSwitchingCamera(true);
      console.log('🔄 [QRScannerWebRTC] Switching camera...');
      
      // 현재 스캐너 정지
      stopQRScanner();
      stopCamera();
      
      if (availableCameras.length > 1) {
        // 여러 카메라가 있는 경우: 다음 카메라로 전환
        const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
        setCurrentCameraIndex(nextIndex);
        
        setTimeout(() => {
          startQRScannerWithCamera(availableCameras[nextIndex].id);
        }, 500);
      } else {
        // 카메라가 1개만 감지된 경우: facingMode로 전환 시도
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          console.log('🔄 [QRScannerWebRTC] Trying to switch facingMode...');
          
          // 현재 facingMode와 반대로 설정
          const currentFacingMode = currentCameraIndex === 0 ? 'environment' : 'user';
          const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
          
          // 새로운 facingMode로 카메라 재시작
          setTimeout(async () => {
            try {
              const qrCode = new Html5Qrcode('qr-reader-webrtc');
              qrCodeRef.current = qrCode;
              
              const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                videoConstraints: {
                  facingMode: newFacingMode
                }
              };
              
              await qrCode.start(
                config,
                (decodedText) => {
                  console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
                  setIsScanning(false);
                  setScannedData(decodedText);
                  setShowSuccessModal(true);
                  // 모달이 표시된 후 onScan 호출
                  onScan(decodedText);
                },
                (error) => {
                  if (error && !error.includes('No QR code found')) {
                    console.log('📷 [QRScannerWebRTC] Scan error (normal):', error);
                  }
                }
              );
              
              setIsInitialized(true);
              setCameraPermission('granted');
              setIsSwitchingCamera(false);
              setCurrentCameraIndex(currentCameraIndex === 0 ? 1 : 0);
              console.log('✅ [QRScannerWebRTC] Camera switched to:', newFacingMode);
              
            } catch (err) {
              console.error('❌ [QRScannerWebRTC] FacingMode switch failed:', err);
              setIsSwitchingCamera(false);
              // 실패 시 원래 카메라로 복구
              startQRScanner();
            }
          }, 500);
        }
      }
      
    } catch (err) {
      console.error('❌ [QRScannerWebRTC] Camera switch failed:', err);
      setIsSwitchingCamera(false);
    }
  }, [availableCameras, currentCameraIndex, isSwitchingCamera, stopQRScanner, stopCamera, onScan]);

  // 안전한 cleanup
  const safeCleanup = useCallback(() => {
    console.log('🧹 [QRScannerWebRTC] Starting cleanup...');
    stopQRScanner();
    stopCamera();
    setIsScanning(false);
    setIsInitialized(false);
    setError(null);
    setIsSwitchingCamera(false);
    console.log('✅ [QRScannerWebRTC] Cleanup completed');
  }, [stopQRScanner, stopCamera]);

  // 특정 카메라로 QR 스캐너 시작
  const startQRScannerWithCamera = useCallback(async (cameraId) => {
    try {
      console.log('🔍 [QRScannerWebRTC] Starting QR scanner with camera:', cameraId);
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

      await qrCode.start(
        cameraId,
        config,
        (decodedText) => {
          console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
          setIsScanning(false);
          setScannedData(decodedText);
          setShowSuccessModal(true);
          
          // 모달이 표시된 후 onScan 호출
          onScan(decodedText);
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
      setIsSwitchingCamera(false);
      console.log('✅ [QRScannerWebRTC] QR scanner ready!');

    } catch (err) {
      console.error('❌ [QRScannerWebRTC] QR scanner failed:', err);
      setError(`QR scanner initialization failed: ${err.message}`);
      setCameraPermission('denied');
      setIsScanning(false);
      setIsSwitchingCamera(false);
      safeCleanup();
    }
  }, [onScan]);

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

      // 사용 가능한 카메라 목록 가져오기
      const cameras = await Html5Qrcode.getCameras();
      setAvailableCameras(cameras);
      console.log('📷 [QRScannerWebRTC] Available cameras:', cameras.length);

      // 후면 카메라 우선 선택
      const backCameraIndex = cameras.findIndex(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );
      
      const initialCameraIndex = backCameraIndex >= 0 ? backCameraIndex : 0;
      setCurrentCameraIndex(initialCameraIndex);
      
      // 선택된 카메라로 스캐너 시작
      await startQRScannerWithCamera(cameras[initialCameraIndex].id);

    } catch (err) {
      console.error('❌ [QRScannerWebRTC] QR scanner failed:', err);
      setError(`QR scanner initialization failed: ${err.message}`);
      setCameraPermission('denied');
      setIsScanning(false);
      safeCleanup();
    }
  }, [isInitialized]);

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
    <div 
      className="modal-backdrop show" 
      onClick={handleClose} 
      style={{ 
        backgroundColor: 'rgba(15, 18, 36, 0.85)', 
        backdropFilter: 'blur(8px)', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 1050,
        opacity: 1
      }}
    >
      <div 
        className="modal show d-block" 
        tabIndex="-1" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 1055,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 1
        }}
      >
        <div 
          className={`modal-dialog modal-dialog-centered qr-scanner-modal-dialog ${/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'modal-fullscreen-sm-down' : 'modal-lg'}`} 
          onClick={(e) => e.stopPropagation()}
          style={{
            margin: 'auto',
            opacity: 1,
            maxWidth: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '100%' : '800px',
            width: '100%',
            padding: '1rem'
          }}
        >
          <div 
            className="modal-content qr-scanner-modal-content" 
            style={{ 
              backgroundColor: '#ffffff', 
              opacity: 1, 
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)', 
              backdropFilter: 'blur(10px)',
              border: 'none',
              borderRadius: '16px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div 
              className="modal-header qr-scanner-modal-header" 
              style={{ 
                backgroundColor: '#ffffff', 
                borderBottom: '1px solid #dee2e6', 
                opacity: 1,
                borderRadius: '16px 16px 0 0'
              }}
            >
              <h5 className="modal-title" style={{ opacity: 1, color: '#0f1224' }}>
                <i className="bi bi-qr-code-scan me-2"></i>
                Scan QR Code
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleClose}
                aria-label="Close"
                style={{ opacity: 1 }}
              ></button>
            </div>
            <div 
              className="modal-body qr-scanner-modal-body" 
              style={{ 
                backgroundColor: '#ffffff', 
                opacity: 1,
                color: '#0f1224'
              }}
            >
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
                  
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    {/* 카메라 전환 버튼 */}
                    {availableCameras.length > 1 && (
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={switchCamera}
                        disabled={isSwitchingCamera}
                      >
                        {isSwitchingCamera ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Switching...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-camera-reels me-1"></i>
                            Switch Camera
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* 모바일에서 카메라가 1개만 감지되어도 전환 버튼 표시 */}
                    {availableCameras.length === 1 && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={switchCamera}
                        disabled={isSwitchingCamera}
                      >
                        {isSwitchingCamera ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Switching...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-camera-reels me-1"></i>
                            Switch Camera
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* 수동 입력 버튼 */}
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setShowManualInput(true)}
                    >
                      <i className="bi bi-keyboard me-1"></i>
                      Enter QR Data Manually (for testing)
                    </button>
                  </div>
                  
                  {/* 현재 카메라 정보 */}
                  {availableCameras.length > 0 && (
                    <div className="text-center mt-2">
                      <small className="text-muted">
                        <i className="bi bi-camera me-1"></i>
                        Current camera: {
                          availableCameras.length > 1 
                            ? (availableCameras[currentCameraIndex]?.label || 'Unknown')
                            : (currentCameraIndex === 0 ? 'Rear camera' : 'Front camera')
                        }
                        {availableCameras.length > 1 && (
                          <span className="ms-2">
                            ({currentCameraIndex + 1}/{availableCameras.length})
                          </span>
                        )}
                      </small>
                    </div>
                  )}
                </>
              )}
            </div>
            <div 
              className="modal-footer qr-scanner-modal-footer" 
              style={{ 
                backgroundColor: '#ffffff', 
                borderTop: '1px solid #dee2e6', 
                opacity: 1,
                borderRadius: '0 0 16px 16px'
              }}
            >
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleClose}
                style={{ opacity: 1 }}
              >
                <i className="bi bi-x-circle me-1"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* QR 스캔 성공 모달 */}
      {showSuccessModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  QR Code Scan Successful!
                </h5>
              </div>
              <div className="modal-body text-center">
                <div className="mb-3">
                  <i className="bi bi-qr-code-scan text-success" style={{ fontSize: '3rem' }}></i>
                </div>
                <h6 className="mb-3">Scanned data:</h6>
                <div className="alert alert-light border">
                  <code className="text-break">{scannedData}</code>
                </div>
                <p className="text-muted small">
                  Block acquired! 🎉
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={() => {
                    setShowSuccessModal(false);
                    setScannedData('');
                    safeCleanup();
                    onClose(); // Close scanner modal
                  }}
                >
                  <i className="bi bi-check-lg me-1"></i>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QRScannerWebRTC;
