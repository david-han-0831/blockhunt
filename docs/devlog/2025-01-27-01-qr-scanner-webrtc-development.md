# [DevLog] QR 스캐너 WebRTC 기반 완전 재구현

## 📅 날짜
2025-01-27

## ✏️ 요약
- QR 스캐너의 `removeChild` 에러 및 아이폰 호환성 문제 해결
- `html5-qrcode-scanner`에서 `Html5Qrcode` 직접 사용으로 전환
- WebRTC API 기반 카메라 제어 및 모바일 최적화
- 카메라 전환 기능 및 성공 모달 UI 추가

## 🔍 상세 내용

### 🚨 초기 문제점 분석

#### 1. `removeChild` 에러 발생
```
ERROR Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
```

**원인 분석:**
- `html5-qrcode-scanner`가 React의 Virtual DOM과 충돌
- 컴포넌트 언마운트 시 직접 DOM 조작으로 인한 에러
- `scanner.clear()` 호출 시 DOM 요소가 이미 제거된 상태에서 접근 시도

#### 2. 아이폰 호환성 문제
- 카메라가 열리지 않거나 페이지가 사라지는 현상
- `Cannot clear while scan is ongoing` 에러
- 모바일 환경에서 카메라 권한 처리 문제

### 🔧 해결 과정

#### 1단계: 기존 QRScanner.jsx 수정 시도
```javascript
// 초기 수정 시도
const cleanupScanner = () => {
  if (scannerRef.current) {
    try {
      const qrReaderElement = document.getElementById('qr-reader');
      if (qrReaderElement && qrReaderElement.querySelectorAll('video, canvas').length > 0) {
        scannerRef.current.clear();
      }
    } catch (err) {
      console.warn('Cleanup error (ignored):', err);
    } finally {
      scannerRef.current = null;
    }
  }
};
```

**결과:** 여전히 `removeChild` 에러 발생

#### 2단계: QRScannerV2.jsx 완전 재작성
```javascript
// containerRef를 통한 전용 DOM 영역 관리
const containerRef = useRef(null);

const safeCleanup = useCallback(() => {
  if (containerRef.current) {
    try {
      const videoElements = containerRef.current.querySelectorAll('video');
      const canvasElements = containerRef.current.querySelectorAll('canvas');
      [...videoElements, ...canvasElements].forEach(element => {
        try {
          if (element.srcObject) {
            element.srcObject.getTracks().forEach(track => track.stop());
          }
          if (element.parentNode) {
            element.parentNode.removeChild(element); // 여전히 문제 발생
          }
        } catch (err) {
          console.warn('Error removing element:', err);
        }
      });
      containerRef.current.innerHTML = '';
    } catch (err) {
      console.warn('Container cleanup error:', err);
    }
  }
}, []);
```

**결과:** `removeChild` 에러는 해결되었지만 카메라 무한 로딩 문제 발생

#### 3단계: QRScannerWebRTC.jsx 최종 구현

### 🎯 최종 해결책: WebRTC API 직접 제어

#### 핵심 설계 원칙
1. **`html5-qrcode-scanner` 완전 제거**
2. **`Html5Qrcode` 직접 사용**
3. **WebRTC API 기반 카메라 스트림 관리**
4. **React 생명주기와 분리된 DOM 조작**

#### 주요 컴포넌트 구조

```javascript
function QRScannerWebRTC({ onScan, onClose }) {
  const videoRef = useRef(null);
  const qrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('pending');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scannedData, setScannedData] = useState('');
}
```

#### 카메라 관리 시스템

##### 1. 카메라 권한 확인
```javascript
const checkCameraPermission = useCallback(async () => {
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'camera' });
      setCameraPermission(permission.state);
      
      permission.onchange = () => {
        setCameraPermission(permission.state);
      };
    } else {
      // permissions API가 지원되지 않는 경우 직접 확인
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
    }
  } catch (err) {
    console.error('Camera permission check failed:', err);
    setCameraPermission('denied');
  }
}, []);
```

##### 2. 사용 가능한 카메라 목록 가져오기
```javascript
const getAvailableCameras = useCallback(async () => {
  try {
    const cameras = await Html5Qrcode.getCameras();
    console.log('📷 Available cameras:', cameras);
    
    // 후면 카메라 우선 정렬
    const sortedCameras = cameras.sort((a, b) => {
      if (a.label.includes('back') || a.label.includes('rear')) return -1;
      if (b.label.includes('back') || b.label.includes('rear')) return 1;
      return 0;
    });
    
    setAvailableCameras(sortedCameras);
    return sortedCameras;
  } catch (err) {
    console.error('Failed to get cameras:', err);
    setAvailableCameras([]);
    return [];
  }
}, []);
```

##### 3. QR 스캐너 시작
```javascript
const startQRScannerWithCamera = useCallback(async (cameraId) => {
  if (!cameraId) {
    console.error('❌ No camera ID provided');
    return;
  }

  try {
    console.log('🚀 Starting QR scanner with camera:', cameraId);
    const qrCode = new Html5Qrcode('qr-reader-webrtc');
    qrCodeRef.current = qrCode;
    
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      videoConstraints: {
        facingMode: cameraId === 'environment' ? 'environment' : 'user'
      }
    };

    await qrCode.start(
      cameraId,
      config,
      (decodedText) => {
        console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
        setIsScanning(false);
        setScannedData(decodedText);
        setShowSuccessModal(true);
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
    console.log('✅ [QRScannerWebRTC] QR scanner ready!');
  } catch (err) {
    console.error('❌ [QRScannerWebRTC] QR scanner failed:', err);
    setError(`QR 스캐너 초기화 실패: ${err.message}`);
    setCameraPermission('denied');
    setIsScanning(false);
    setIsSwitchingCamera(false);
  }
}, [onScan]);
```

##### 4. 안전한 정리 시스템
```javascript
const stopQRScanner = useCallback(async () => {
  if (qrCodeRef.current) {
    try {
      await qrCodeRef.current.stop();
      console.log('✅ [QRScannerWebRTC] QR scanner stopped');
    } catch (err) {
      console.warn('⚠️ [QRScannerWebRTC] Error stopping QR scanner:', err);
    }
    qrCodeRef.current = null;
  }
}, []);

const stopCamera = useCallback(() => {
  if (videoRef.current && videoRef.current.srcObject) {
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    videoRef.current.srcObject = null;
  }
}, []);

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
```

### 📱 모바일 최적화

#### 1. 카메라 전환 기능
```javascript
const switchCamera = useCallback(async () => {
  if (isSwitchingCamera) return;

  try {
    setIsSwitchingCamera(true);
    console.log('🔄 [QRScannerWebRTC] Switching camera...');
    
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
      // 모바일에서 facingMode 기반 전환
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        const currentFacingMode = currentCameraIndex === 0 ? 'environment' : 'user';
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        setTimeout(async () => {
          try {
            const qrCode = new Html5Qrcode('qr-reader-webrtc');
            qrCodeRef.current = qrCode;
            const config = {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              videoConstraints: { facingMode: newFacingMode }
            };
            
            await qrCode.start(config, onScanSuccess, onScanError);
            setIsInitialized(true);
            setCameraPermission('granted');
            setIsSwitchingCamera(false);
            setCurrentCameraIndex(currentCameraIndex === 0 ? 1 : 0);
            console.log('✅ [QRScannerWebRTC] Camera switched to:', newFacingMode);
          } catch (err) {
            console.error('❌ [QRScannerWebRTC] FacingMode switch failed:', err);
            setIsSwitchingCamera(false);
            startQRScanner();
          }
        }, 500);
      }
    }
  } catch (err) {
    console.error('❌ [QRScannerWebRTC] Camera switch failed:', err);
    setIsSwitchingCamera(false);
  }
}, [availableCameras, currentCameraIndex, isSwitchingCamera, stopQRScanner, stopCamera, startQRScannerWithCamera, onScan]);
```

#### 2. 모바일 UI 최적화
```javascript
// 모바일 환경 감지
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 모바일에서 카메라 전환 버튼 표시
{availableCameras.length === 1 && isMobile && (
  <button 
    className="btn btn-outline-secondary btn-sm"
    onClick={switchCamera}
    disabled={isSwitchingCamera}
  >
    {isSwitchingCamera ? (
      <>
        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        전환 중...
      </>
    ) : (
      <>
        <i className="bi bi-camera-reels me-1"></i>
        카메라 전환
      </>
    )}
  </button>
)}
```

### 🎉 성공 모달 UI

#### QR 스캔 성공 시 모달 표시
```javascript
{/* QR 스캔 성공 모달 */}
{showSuccessModal && (
  <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header bg-success text-white">
          <h5 className="modal-title">
            <i className="bi bi-check-circle-fill me-2"></i>
            QR 코드 스캔 성공!
          </h5>
        </div>
        <div className="modal-body text-center">
          <div className="mb-3">
            <i className="bi bi-qr-code-scan text-success" style={{ fontSize: '3rem' }}></i>
          </div>
          <h6 className="mb-3">스캔된 데이터:</h6>
          <div className="alert alert-light border">
            <code className="text-break">{scannedData}</code>
          </div>
          <p className="text-muted small">
            블록을 획득했습니다! 🎉
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
              onClose();
            }}
          >
            <i className="bi bi-check-lg me-1"></i>
            확인
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

### 🔧 기술적 해결책

#### 1. useCallback 순환 참조 문제 해결
```javascript
// 문제: safeCleanup이 정의되기 전에 의존성 배열에서 참조
}, [availableCameras, currentCameraIndex, isSwitchingCamera, stopQRScanner, stopCamera, startQRScannerWithCamera, safeCleanup, onScan]);

// 해결: 불필요한 의존성 제거
}, [availableCameras, currentCameraIndex, isSwitchingCamera, stopQRScanner, stopCamera, onScan]);
```

#### 2. stop/clear 충돌 문제 해결
```javascript
// 문제: stop()과 clear() 동시 호출
qrCodeRef.current.stop();
qrCodeRef.current.clear(); // "Cannot clear while scan is ongoing" 에러

// 해결: stop()만 호출하고 clear() 제거
await qrCodeRef.current.stop();
console.log('✅ [QRScannerWebRTC] QR scanner stopped');
```

#### 3. 모달 표시 타이밍 문제 해결
```javascript
// 문제: QR 스캔 성공 시 즉시 스캐너 닫기
const handleQRScan = async (qrData) => {
  // ... 처리 로직
  setShowScanner(false); // 모달이 표시될 시간이 없음
};

// 해결: 성공 모달 확인 후 스캐너 닫기
onClick={() => {
  setShowSuccessModal(false);
  setScannedData('');
  safeCleanup();
  onClose(); // 사용자가 확인한 후 스캐너 닫기
}}
```

### 📊 성능 최적화

#### 1. 카메라 스트림 관리
- WebRTC API를 통한 직접적인 스트림 제어
- 메모리 누수 방지를 위한 적절한 cleanup
- 카메라 전환 시 스트림 중복 방지

#### 2. 모바일 성능 최적화
- FPS 10으로 설정하여 배터리 소모 최소화
- QR 박스 크기 250x250으로 모바일 화면에 최적화
- 카메라 전환 시 500ms 지연으로 안정성 확보

#### 3. 에러 처리 강화
- try-catch 블록을 통한 포괄적인 에러 처리
- 사용자 친화적인 에러 메시지
- 에러 발생 시 graceful degradation

### 🎯 최종 결과

#### 해결된 문제들
1. ✅ `removeChild` 에러 완전 해결
2. ✅ 아이폰 호환성 문제 해결
3. ✅ 카메라 무한 로딩 문제 해결
4. ✅ 모바일 카메라 전환 기능 추가
5. ✅ QR 스캔 성공 모달 UI 추가
6. ✅ useCallback 순환 참조 문제 해결
7. ✅ stop/clear 충돌 문제 해결

#### 개선된 사용자 경험
- 모바일에서 안정적인 QR 스캔
- 전면/후면 카메라 전환 가능
- 스캔 성공 시 명확한 피드백
- 직관적인 UI/UX

## 🙋 개선 및 회고

### 🎓 학습한 점
1. **React와 외부 라이브러리 통합의 복잡성**
   - Virtual DOM과 직접 DOM 조작의 충돌
   - 컴포넌트 생명주기와 외부 라이브러리 생명주기 동기화

2. **WebRTC API의 모바일 호환성**
   - 다양한 브라우저와 디바이스에서의 카메라 접근 방식
   - facingMode와 camera ID의 차이점

3. **에러 처리의 중요성**
   - 예상치 못한 에러 상황에 대한 대응
   - 사용자 경험을 해치지 않는 에러 처리

### 🚀 향후 개선 계획
1. **성능 최적화**
   - QR 스캔 속도 향상
   - 배터리 소모 최적화

2. **기능 확장**
   - 바코드 스캔 지원
   - 다중 QR 코드 동시 인식

3. **접근성 개선**
   - 스크린 리더 지원
   - 키보드 네비게이션 지원

### 💡 기술적 인사이트
- **라이브러리 선택의 중요성**: `html5-qrcode-scanner`보다 `Html5Qrcode` 직접 사용이 더 안정적
- **모바일 우선 설계**: 모바일 환경을 고려한 설계가 데스크톱에서도 안정적으로 작동
- **점진적 개선**: 한 번에 모든 문제를 해결하려 하지 않고 단계적으로 접근

이번 개발을 통해 QR 스캐너의 안정성과 사용자 경험을 크게 개선할 수 있었습니다. 특히 모바일 환경에서의 호환성 문제를 해결한 것이 가장 큰 성과였습니다.


















