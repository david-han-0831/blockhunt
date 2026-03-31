import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getBlocks } from '../firebase/firestore';
import { getBlockGLTFPath, applyBlockDisplayConfig } from '../utils/blockDisplayConfig';

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
  // ==================== Ref 및 State 정의 ====================
  
  /**
   * 카메라 관련 Ref
   * - videoRef: HTML video 요소 참조 (카메라 스트림 표시)
   * - qrCodeRef: Html5Qrcode 인스턴스 참조 (QR 스캔 기능)
   */
  const videoRef = useRef(null);
  const qrCodeRef = useRef(null);
  
  /**
   * Three.js 3D 렌더링 관련 Ref
   * - arCanvasRef: AR 애니메이션을 그릴 Canvas 요소 참조
   * - sceneRef: Three.js Scene 객체 (3D 객체들을 담는 컨테이너)
   * - rendererRef: Three.js Renderer 객체 (실제로 화면에 그리는 객체)
   * - cameraRef: Three.js Camera 객체 (화면에 보이는 영역 정의)
   * - animationIdRef: requestAnimationFrame ID (애니메이션 루프 제어)
   * - blocksRef: 현재 표시 중인 3D 블록 객체 배열
   * - raycasterRef: Raycaster 객체 (마우스/터치 클릭 감지용)
   * - mouseRef: 마우스/터치 좌표 (정규화된 디바이스 좌표: -1 ~ 1)
   */
  const arCanvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationIdRef = useRef(null);
  const blocksRef = useRef([]);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  
  /**
   * 블록 회전 기능을 위한 Ref 및 상수
   * - touchStartRef: 터치/드래그 시작 위치 및 상태
   *   - x, y: 시작 좌표
   *   - isRotating: 회전 모드인지 여부
   *   - hasMoved: 이동이 있었는지 여부 (클릭과 드래그 구분)
   *   - isActive: 터치가 활성화되었는지 여부
   * - rotationSensitivity: 회전 감도 (값이 작을수록 부드러운 회전)
   * - clickThreshold: 클릭과 회전을 구분하는 픽셀 임계값 (10px)
   * - lastDeltaRef: 부드러운 회전을 위한 이전 delta 값 (smoothing에 사용)
   */
  const touchStartRef = useRef({ x: 0, y: 0, isRotating: false, hasMoved: false, isActive: false });
  const rotationSensitivity = 0.006; // 회전 감도 (더 부드러운 회전을 위해 낮춤: 0.01 → 0.006)
  const clickThreshold = 10; // 클릭과 회전을 구분하는 픽셀 임계값
  const lastDeltaRef = useRef({ x: 0, y: 0 }); // 부드러운 회전을 위한 이전 delta 값
  
  /**
   * Firebase에서 가져온 블록 데이터
   * - blocksDataRef: 모든 블록 정보 배열 (이름, 카테고리 등)
   * - qrScannedRef: QR 스캔 완료 여부 (애니메이션 상태 제어)
   */
  const blocksDataRef = useRef([]);
  const qrScannedRef = useRef(false);
  // eslint-disable-next-line no-unused-vars
  const [isRotating, setIsRotating] = useState(false);
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
  const [qrScanned, setQrScanned] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [debugInfo, setDebugInfo] = useState(null); // 디버깅 정보 상태
  // eslint-disable-next-line no-unused-vars
  const [showDebugPanel, setShowDebugPanel] = useState(false); // 디버그 패널 표시 여부
  const [blockLoadError, setBlockLoadError] = useState(null); // 블록 로드 에러 상태

  // ==================== 카메라 및 QR 스캐너 관리 함수 ====================
  
  /**
   * 카메라 스트림 정리 함수
   * 
   * 카메라 스트림을 안전하게 종료합니다.
   * 
   * 동작 과정:
   * 1. video 요소의 srcObject 확인
   * 2. MediaStream의 모든 track 가져오기
   * 3. 각 track을 stop()하여 카메라 종료
   * 4. srcObject를 null로 설정하여 참조 해제
   * 
   * 중요:
   * - 카메라를 사용한 후 반드시 정리해야 합니다.
   * - 정리하지 않으면 카메라가 계속 켜져 있어 배터리 소모가 발생합니다.
   * - 다른 앱에서 카메라를 사용할 수 없게 됩니다.
   */
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      // MediaStream의 모든 track 가져오기
      // track은 비디오/오디오 스트림의 개별 소스입니다.
      const tracks = videoRef.current.srcObject.getTracks();
      
      // 각 track을 stop()하여 카메라 종료
      tracks.forEach(track => track.stop());
      
      // srcObject를 null로 설정하여 참조 해제
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * QR 스캐너 정리 함수
   * 
   * Html5Qrcode 인스턴스를 안전하게 종료합니다.
   * 
   * 동작 과정:
   * 1. qrCodeRef.current가 있는지 확인
   * 2. stop() 메서드 호출하여 스캐너 중지
   * 3. ref를 null로 설정하여 참조 해제
   * 
   * 에러 처리:
   * - stop() 중 에러가 발생해도 계속 진행 (이미 정리된 경우)
   */
  const stopQRScanner = useCallback(async () => {
    if (qrCodeRef.current) {
      try {
        // 먼저 스캔 중지
        // stop()은 비동기 함수이므로 await 사용
        await qrCodeRef.current.stop();
        console.log('✅ [QRScannerWebRTC] QR scanner stopped');
      } catch (err) {
        // 이미 정리되었거나 에러가 발생해도 계속 진행
        console.warn('⚠️ [QRScannerWebRTC] Error stopping QR scanner:', err);
      }
      // ref를 null로 설정하여 참조 해제
      qrCodeRef.current = null;
    }
  }, []);

  /**
   * 카메라 전환 함수
   * 
   * 전면 카메라와 후면 카메라를 전환합니다.
   * 
   * 동작 과정:
   * 1. 현재 스캐너 및 카메라 정지
   * 2. 사용 가능한 카메라 개수 확인
   * 3. 여러 카메라가 있으면 다음 카메라로 전환
   * 4. 카메라가 1개만 있으면 facingMode로 전환 시도
   * 
   * facingMode:
   * - 'environment': 후면 카메라 (QR 스캔에 적합)
   * - 'user': 전면 카메라 (셀카용)
   * 
   * 모바일 환경:
   * - 대부분의 모바일 기기는 전면/후면 카메라를 facingMode로 구분합니다.
   * - 카메라가 1개만 감지되는 경우 facingMode를 변경하여 전환합니다.
   */
  // eslint-disable-next-line no-unused-vars
  const switchCamera = useCallback(async () => {
    // 이미 전환 중이면 중복 실행 방지
    if (isSwitchingCamera) {
      return;
    }

    try {
      setIsSwitchingCamera(true);
      console.log('🔄 [QRScannerWebRTC] Switching camera...');
      
      /**
       * 1단계: 현재 스캐너 및 카메라 정지
       * 
       * 카메라 전환 전에 기존 카메라를 반드시 정지해야 합니다.
       * 그렇지 않으면 여러 카메라가 동시에 켜져 에러가 발생할 수 있습니다.
       */
      stopQRScanner();
      stopCamera();
      
      /**
       * 2단계: 사용 가능한 카메라 개수 확인
       * 
       * 카메라 전환 방법:
       * - 여러 카메라가 있으면: 카메라 ID로 전환
       * - 카메라가 1개만 있으면: facingMode로 전환 (모바일)
       */
      if (availableCameras.length > 1) {
        /**
         * 여러 카메라가 있는 경우: 다음 카메라로 전환
         * 
         * 순환 방식으로 전환:
         * - 현재 인덱스 + 1
         * - 마지막 카메라 다음은 첫 번째 카메라로 (% 연산자 사용)
         */
        const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
        setCurrentCameraIndex(nextIndex);
        
        // 500ms 대기 후 새 카메라로 시작 (기존 카메라 정리 시간 확보)
        setTimeout(() => {
          startQRScannerWithCamera(availableCameras[nextIndex].id);
        }, 500);
      } else {
        /**
         * 카메라가 1개만 감지된 경우: facingMode로 전환 시도
         * 
         * 모바일 환경에서는 전면/후면 카메라가 같은 카메라 ID를 사용하지만
         * facingMode로 구분할 수 있습니다.
         */
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          console.log('🔄 [QRScannerWebRTC] Trying to switch facingMode...');
          
          /**
           * 현재 facingMode와 반대로 설정
           * 
           * currentCameraIndex로 현재 모드를 추정:
           * - 0: 'environment' (후면 카메라)
           * - 1: 'user' (전면 카메라)
           */
          const currentFacingMode = currentCameraIndex === 0 ? 'environment' : 'user';
          const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
          
          /**
           * 새로운 facingMode로 카메라 재시작
           * 
           * 500ms 대기 후 새 facingMode로 시작
           * 기존 카메라가 완전히 정리될 시간을 확보합니다.
           */
          setTimeout(async () => {
            try {
              /**
               * 새로운 Html5Qrcode 인스턴스 생성
               * 
               * facingMode 전환을 위해 새 인스턴스를 생성합니다.
               */
              const qrCode = new Html5Qrcode('qr-reader-webrtc');
              qrCodeRef.current = qrCode;
              
              /**
               * facingMode 전환용 설정
               * 
               * config에서 facingMode만 변경하고 나머지는 기본값 사용
               */
              const config = {
                fps: 10,  // 기본 FPS
                qrbox: { width: 250, height: 250 },  // 기본 QR 박스 크기
                aspectRatio: 1.0,  // 정사각형 비율
                videoConstraints: {
                  facingMode: newFacingMode  // 새로운 facingMode 설정
                }
              };
              
              /**
               * facingMode로 카메라 시작
               * 
               * cameraId 대신 config만 전달하면 facingMode로 카메라를 선택합니다.
               */
              await qrCode.start(
                config,  // cameraId 대신 config 전달
                (decodedText) => {
                  // QR 스캔 성공 콜백
                  console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
                  setIsScanning(false);
                  setScannedData(decodedText);
                  setShowSuccessModal(true);
                  onScan(decodedText);
                },
                (error) => {
                  // 스캔 실패는 정상적인 상황 (QR 코드가 없을 때)
                  if (error && !error.includes('No QR code found')) {
                    console.log('📷 [QRScannerWebRTC] Scan error (normal):', error);
                  }
                }
              );
              
              // 전환 성공
              setIsInitialized(true);
              setCameraPermission('granted');
              setIsSwitchingCamera(false);
              setCurrentCameraIndex(currentCameraIndex === 0 ? 1 : 0);  // 인덱스 업데이트
              console.log('✅ [QRScannerWebRTC] Camera switched to:', newFacingMode);
              
            } catch (err) {
              /**
               * facingMode 전환 실패 처리
               * 
               * 실패 시 원래 카메라로 복구합니다.
               */
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
  }, [availableCameras, currentCameraIndex, isSwitchingCamera, stopQRScanner, stopCamera, onScan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Firebase에서 블록 데이터 로드
  useEffect(() => {
    const loadBlocksData = async () => {
      try {
        console.log('🔄 [QRScannerWebRTC] Loading blocks from Firebase...');
        const result = await getBlocks();
        
        if (result.success && result.data) {
          blocksDataRef.current = result.data;
          console.log('✅ [QRScannerWebRTC] Loaded', result.data.length, 'blocks from Firebase');
        } else {
          console.warn('⚠️ [QRScannerWebRTC] Failed to load blocks:', result.error);
        }
      } catch (error) {
        console.error('❌ [QRScannerWebRTC] Error loading blocks:', error);
      }
    };
    
    loadBlocksData();
  }, []);

  /**
   * Three.js AR 애니메이션 초기화
   * 
   * Three.js는 WebGL을 사용하여 3D 그래픽을 렌더링하는 라이브러리입니다.
   * 
   * 주요 구성 요소:
   * 1. Scene: 3D 객체들을 담는 컨테이너
   * 2. Camera: 화면에 보이는 영역을 정의
   * 3. Renderer: Scene과 Camera를 사용하여 실제로 화면에 그리는 객체
   * 4. Light: 조명 (객체가 보이도록)
   * 5. Mesh: 3D 모델 (Geometry + Material)
   * 
   * 동작 과정:
   * 1. Scene 생성
   * 2. 조명 추가 (AmbientLight, DirectionalLight)
   * 3. Camera 생성 (PerspectiveCamera)
   * 4. Renderer 생성 (WebGLRenderer)
   * 5. Canvas 크기 설정 (video와 동일하게)
   * 6. 애니메이션 루프 시작
   * 
   * AR 오버레이:
   * - Canvas는 투명 배경으로 설정되어 카메라 피드 위에 3D 블록을 표시합니다.
   * - z-index를 높게 설정하여 video 위에 렌더링됩니다.
   */
  const initThreeJS = useCallback(() => {
    if (!arCanvasRef.current) {
      console.warn('⚠️ [QRScannerWebRTC] Canvas ref not available');
      return;
    }

    if (rendererRef.current) {
      console.warn('⚠️ [QRScannerWebRTC] Three.js already initialized');
      return;
    }

    console.log('🎨 [QRScannerWebRTC] Initializing Three.js AR animation...');

    /**
     * video 요소가 로드될 때까지 기다리는 함수
     * 
     * html5-qrcode가 video 요소를 생성하는 데 시간이 걸릴 수 있으므로,
     * video가 완전히 로드될 때까지 대기한 후 Three.js를 초기화합니다.
     * 
     * 재시도 로직:
     * - video가 없거나 크기가 0이면 100ms 후 재시도
     * - 최대 재시도 횟수는 없지만, 일반적으로 몇 초 내에 로드됩니다.
     */
    const waitForVideoAndInit = () => {
      const container = document.getElementById('qr-reader-webrtc');
      if (!container) {
        console.warn('⚠️ [QRScannerWebRTC] Container not found');
        return;
      }

      const video = container.querySelector('video');
      
      // video가 없거나 크기가 0이면 재시도
      if (!video || video.clientWidth === 0 || video.clientHeight === 0) {
        console.log('⏳ [QRScannerWebRTC] Waiting for video to load...');
        setTimeout(waitForVideoAndInit, 100);
        return;
      }

      // video의 실제 렌더링 크기 가져오기
      const width = video.clientWidth || video.offsetWidth || container.clientWidth || 640;
      const height = video.clientHeight || video.offsetHeight || container.clientHeight || 480;

      console.log('📹 [QRScannerWebRTC] Video loaded, dimensions:', {
        width,
        height,
        videoClientWidth: video.clientWidth,
        videoClientHeight: video.clientHeight,
        videoOffsetWidth: video.offsetWidth,
        videoOffsetHeight: video.offsetHeight,
        videoStyleWidth: video.style.width,
        videoStyleHeight: video.style.height
      });

      try {
        /**
         * 1단계: Scene 생성
         * Scene은 3D 객체들을 담는 컨테이너입니다.
         * 모든 3D 객체(Mesh, Light 등)는 Scene에 추가되어야 화면에 표시됩니다.
         */
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        /**
         * 2단계: 조명 추가
         * 조명이 없으면 객체가 검은색으로 보입니다.
         * 
         * AmbientLight (환경광):
         * - 모든 방향에서 균일하게 빛을 비춥니다.
         * - 그림자를 만들지 않습니다.
         * - 전체적인 밝기를 제공합니다.
         * 
         * DirectionalLight (방향광):
         * - 특정 방향에서 빛을 비춥니다 (태양광과 유사).
         * - 그림자와 입체감을 제공합니다.
         * - position.set(x, y, z)로 빛의 방향을 설정합니다.
         */
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 색상: 흰색, 강도: 1.0
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 색상: 흰색, 강도: 0.8
        directionalLight.position.set(5, 5, 5); // 빛의 위치 (x, y, z)
        scene.add(directionalLight);

        /**
         * 3단계: Camera 생성
         * PerspectiveCamera는 원근감이 있는 카메라입니다 (실제 눈과 유사).
         * 
         * 파라미터:
         * - FOV (Field of View): 시야각 (도 단위, 75도는 일반적인 값)
         * - aspect: 화면 비율 (width / height)
         * - near: 가까운 거리 (이보다 가까운 객체는 렌더링되지 않음)
         * - far: 먼 거리 (이보다 먼 객체는 렌더링되지 않음)
         * 
         * position.z = 3: 카메라를 z축으로 3만큼 뒤로 이동
         * (음수 z축이 화면 안쪽 방향)
         */
        const aspect = width / height;
        const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        camera.position.z = 3;
        cameraRef.current = camera;

        /**
         * 4단계: Renderer 생성
         * WebGLRenderer는 WebGL을 사용하여 3D 그래픽을 렌더링합니다.
         * 
         * 옵션:
         * - canvas: 렌더링할 Canvas 요소
         * - alpha: true면 투명 배경 활성화 (카메라 피드가 보이도록)
         * - antialias: true면 안티앨리어싱 활성화 (부드러운 가장자리)
         */
        const renderer = new THREE.WebGLRenderer({
          canvas: arCanvasRef.current,
          alpha: true,  // 투명 배경 활성화 (카메라 피드가 보이도록)
          antialias: true  // 안티앨리어싱 (부드러운 가장자리)
        });
        
        /**
         * 5단계: Canvas 크기 및 스타일 설정
         * Canvas는 video 요소와 완전히 동일한 크기와 위치에 배치되어야 합니다.
         * 
         * 크기 설정:
         * - width/height 속성: Canvas의 실제 해상도 (픽셀 수)
         * - style.width/height: CSS 스타일 크기 (화면에 표시되는 크기)
         * - 두 값이 일치해야 선명하게 렌더링됩니다.
         * 
         * 위치 설정:
         * - position: 'absolute' - 절대 위치 지정
         * - top/left: 0px - video와 동일한 위치
         * - zIndex: 1000 - video 위에 표시 (AR 오버레이)
         * 
         * 이벤트 설정:
         * - pointerEvents: 'auto' - 터치 및 클릭 이벤트 활성화 (블록 회전을 위해 필수)
         * - touchAction: 'none' - 모바일 기본 터치 동작 방지 (스크롤, 줌 등)
         */
        if (arCanvasRef.current) {
          // 실제 크기와 스타일 크기를 동일하게 설정
          arCanvasRef.current.width = width;
          arCanvasRef.current.height = height;
          
          // video와 동일한 위치와 크기로 설정
          arCanvasRef.current.style.position = 'absolute';
          arCanvasRef.current.style.top = '0px';
          arCanvasRef.current.style.left = '0px';
          arCanvasRef.current.style.width = `${width}px`;
          arCanvasRef.current.style.height = `${height}px`;
          arCanvasRef.current.style.zIndex = '1000';  // video 위에 표시
          arCanvasRef.current.style.pointerEvents = 'auto'; // 터치 및 클릭 이벤트 활성화 (드래그를 위해 필수)
          arCanvasRef.current.style.backgroundColor = 'transparent';
          arCanvasRef.current.style.touchAction = 'none'; // 모바일 터치 기본 동작 방지 (스크롤, 줌 등)
          
          console.log('🎨 [QRScannerWebRTC] Canvas size set to match video:', {
            width: arCanvasRef.current.width,
            height: arCanvasRef.current.height,
            styleWidth: arCanvasRef.current.style.width,
            styleHeight: arCanvasRef.current.style.height
          });
        }
        
        /**
         * Renderer 크기 및 픽셀 비율 설정
         * 
         * setSize: Renderer의 출력 크기 설정
         * setPixelRatio: 픽셀 비율 설정 (고해상도 디스플레이 대응)
         * 
         * 모바일 최적화:
         * - pixelRatio를 1.5로 제한하여 성능 향상
         * - 데스크톱은 2로 제한 (일반적으로 충분)
         * 
         * devicePixelRatio:
         * - 1: 일반 디스플레이
         * - 2: Retina 디스플레이 (iPhone, 고해상도 모니터)
         * - 3: 초고해상도 디스플레이
         */
        renderer.setSize(width, height);
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;

        /**
         * Raycaster 초기화 (클릭 감지용)
         * 
         * Raycaster는 마우스/터치 위치에서 광선을 쏘아 3D 객체와의 교차를 감지합니다.
         * 
         * 동작 원리:
         * 1. 마우스/터치 좌표를 정규화된 디바이스 좌표로 변환 (-1 ~ 1)
         * 2. Camera의 시점에서 광선(ray) 생성
         * 3. Scene의 객체들과 교차하는지 확인
         * 4. 교차하는 객체 중 가장 가까운 객체 반환
         * 
         * 사용 예시:
         * raycaster.setFromCamera(mousePosition, camera);
         * const intersects = raycaster.intersectObjects(scene.children);
         * if (intersects.length > 0) {
         *   const clickedObject = intersects[0].object;
         * }
         */
        raycasterRef.current = new THREE.Raycaster();

        console.log('✅ [QRScannerWebRTC] Renderer created:', { width, height });

      /**
       * 6단계: 블록 배열 초기화
       * QR 스캔 전에는 블록을 표시하지 않으므로 빈 배열로 초기화합니다.
       */
      blocksRef.current = [];

      /**
       * 7단계: 애니메이션 루프
       * 
       * requestAnimationFrame을 사용하여 매 프레임마다 화면을 다시 그립니다.
       * 
       * 동작:
       * 1. 블록 애니메이션 업데이트 (펄스 효과 등)
       * 2. Scene을 Camera의 시점에서 렌더링
       * 3. 다음 프레임 요청
       * 
       * 성능:
       * - 일반적으로 60fps로 실행됩니다 (브라우저가 최적화)
       * - 모바일에서는 성능에 따라 낮아질 수 있습니다.
       * 
       * cleanup:
       * - 컴포넌트 언마운트 시 cancelAnimationFrame으로 중지해야 합니다.
       */
      let isAnimating = true; // 로컬 플래그로 애니메이션 상태 관리
      
      const animate = () => {
        // cleanup 체크 (컴포넌트가 언마운트되었는지 확인)
        if (!isAnimating || !animationIdRef.current) {
          console.log('🛑 [QRScannerWebRTC] Animation stopped');
          return;
        }
        
        const blocks = blocksRef.current;
        if (!blocks || blocks.length === 0) {
          // 블록이 없으면 렌더링만 수행 (애니메이션 없음)
          animationIdRef.current = requestAnimationFrame(animate);
          return;
        }
        
        if (!qrScannedRef.current) {
          /**
           * QR 스캔 전: 블록 고정 (애니메이션 없음)
           * 아직 QR 코드를 스캔하지 않았으므로 블록을 표시하지 않습니다.
           */
          blocks.forEach((block) => {
            // 회전 및 위치 고정 - 애니메이션 없음
          });
        } else {
          /**
           * QR 스캔 후: 수집 완료 애니메이션 (펄스 효과)
           * 
           * 펄스 효과:
           * - Math.sin()을 사용하여 부드러운 크기 변화
           * - baseScale을 기준으로 ±20% 범위에서 변화
           * - 각 블록마다 다른 위상(phase)을 사용하여 독립적인 애니메이션
           * 
           * 애니메이션 속도:
           * - 0.003: 느린 펄스 (약 3초 주기)
           * - blockId의 첫 글자 코드를 위상으로 사용하여 블록마다 다른 타이밍
           */
          blocks.forEach((block) => {
            const baseScale = block.userData.baseScale || 20; // 기본값 20 (config에서 설정한 값)
            const pulseFactor = 1 + Math.sin(Date.now() * 0.003 + (block.userData.blockId?.charCodeAt(0) || 0)) * 0.2;
            const finalScale = baseScale * pulseFactor;
            block.scale.set(finalScale, finalScale, finalScale);
          });
        }
        
        /**
         * Scene 렌더링
         * render()는 Scene과 Camera를 사용하여 실제로 화면에 그립니다.
         * 이 함수는 매 프레임마다 호출되어 애니메이션을 만듭니다.
         */
        if (rendererRef.current && cameraRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        /**
         * 다음 프레임 요청
         * requestAnimationFrame은 브라우저가 다음 프레임을 그릴 준비가 되면
         * 콜백 함수를 호출합니다. (일반적으로 60fps)
         */
        animationIdRef.current = requestAnimationFrame(animate);
      };
      
      // 애니메이션 시작
      animationIdRef.current = requestAnimationFrame(animate);
      console.log('✅ [QRScannerWebRTC] Animation loop started');
      
      // 클릭 이벤트 리스너 추가 (모델 로드와 관계없이 먼저 추가)
      const handleCanvasClick = (event) => {
        console.log('🖱️ [QRScannerWebRTC] Canvas clicked!', {
          hasCanvas: !!arCanvasRef.current,
          hasCamera: !!cameraRef.current,
          hasScene: !!sceneRef.current,
          hasRaycaster: !!raycasterRef.current
        });
        
        if (!arCanvasRef.current || !cameraRef.current || !sceneRef.current || !raycasterRef.current) {
          console.warn('⚠️ [QRScannerWebRTC] Missing required refs for click detection');
          return;
        }
        
        const canvas = arCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // 클릭 좌표를 정규화된 디바이스 좌표로 변환 (-1 ~ 1)
        const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        mouseRef.current.set(mouseX, mouseY);
        
        console.log('🖱️ [QRScannerWebRTC] Mouse position:', { x: mouseX, y: mouseY });
        
        // Raycaster로 클릭한 위치의 객체 감지
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
        
        console.log('🖱️ [QRScannerWebRTC] Intersects found:', intersects.length);
        
        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          console.log('🖱️ [QRScannerWebRTC] Clicked object:', clickedObject);
          
          // 클릭 가능한 객체인지 확인 (모델의 루트 또는 자식)
          let clickableObject = clickedObject;
          let depth = 0;
          while (clickableObject && !clickableObject.userData.clickable && depth < 10) {
            clickableObject = clickableObject.parent;
            depth++;
          }
          
          console.log('🖱️ [QRScannerWebRTC] Clickable object found:', !!clickableObject, 'depth:', depth);
          
          if (clickableObject && clickableObject.userData.clickable && clickableObject.userData.isQRBlock) {
            console.log('🖱️ [QRScannerWebRTC] QR Block clicked! (Click disabled - use Catch button instead)', clickableObject);
            
            // 블록 클릭 시 모달 표시하지 않음 - 캐치 버튼으로만 수집 처리
            // 클릭은 무시하고 캐치 버튼 사용 안내만 표시
          } else {
            console.log('⚠️ [QRScannerWebRTC] Clicked object is not a QR block');
          }
        } else {
          console.log('⚠️ [QRScannerWebRTC] No objects intersected');
        }
      };
      
      // Canvas에 클릭 이벤트 추가 (지연 없이 즉시 추가)
      const addClickListener = () => {
        if (arCanvasRef.current) {
          // 기존 리스너 제거 후 추가 (중복 방지)
          arCanvasRef.current.removeEventListener('click', handleCanvasClick);
          arCanvasRef.current.addEventListener('click', handleCanvasClick);
          console.log('🖱️ [QRScannerWebRTC] Click event listener added');
        } else {
          // Canvas가 아직 없으면 재시도
          setTimeout(addClickListener, 100);
        }
      };
      
      // 즉시 시도하고, 실패하면 재시도
      addClickListener();
      
      // cleanup 시 이벤트 리스너 제거를 위해 저장
      // eslint-disable-next-line no-unused-vars
      const cleanupClickHandler = () => {
        if (arCanvasRef.current) {
          arCanvasRef.current.removeEventListener('click', handleCanvasClick);
        }
      };
      
        console.log('✅ [QRScannerWebRTC] Three.js AR animation initialized and started');
      } catch (error) {
        console.error('❌ [QRScannerWebRTC] Three.js initialization error:', error);
      }
    };

    // video가 로드될 때까지 기다리기 시작
    waitForVideoAndInit();
  }, []);

  // Three.js cleanup
  const cleanupThreeJS = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    
    // 클릭 이벤트 리스너 제거
    if (arCanvasRef.current) {
      // 모든 클릭 이벤트 리스너 제거 (새로운 이벤트 리스너를 위해)
      const newCanvas = arCanvasRef.current.cloneNode(false);
      arCanvasRef.current.parentNode?.replaceChild(newCanvas, arCanvasRef.current);
      arCanvasRef.current = newCanvas;
    }
    
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    if (sceneRef.current) {
      // Scene의 모든 객체 정리
      sceneRef.current.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      sceneRef.current = null;
    }
    
    blocksRef.current = [];
    raycasterRef.current = null;
    console.log('🧹 [QRScannerWebRTC] Three.js cleanup completed');
  }, []);

  // 안전한 cleanup
  const safeCleanup = useCallback(() => {
    console.log('🧹 [QRScannerWebRTC] Starting cleanup...');
    stopQRScanner();
    stopCamera();
    cleanupThreeJS();
    setIsScanning(false);
    setIsInitialized(false);
    setError(null);
    setIsSwitchingCamera(false);
    setQrScanned(false);
    qrScannedRef.current = false;
    console.log('✅ [QRScannerWebRTC] Cleanup completed');
  }, [stopQRScanner, stopCamera, cleanupThreeJS]);

  /**
   * 특정 카메라로 QR 스캐너 시작
   * 
   * @param {string} cameraId - 카메라 ID (getUserMedia에서 반환된 ID)
   * 
   * 동작 과정:
   * 1. Html5Qrcode 인스턴스 생성
   * 2. 카메라 설정 (FPS, QR 박스 크기, 해상도 등)
   * 3. 카메라 스트림 시작
   * 4. QR 코드 스캔 콜백 등록
   * 5. Three.js AR Canvas 추가 (3D 블록 표시용)
   * 
   * 카메라 설정:
   * - fps: 초당 프레임 수 (모바일: 5, 데스크톱: 10)
   * - qrbox: QR 코드 인식 영역 크기
   * - videoConstraints: 카메라 해상도 및 facingMode 설정
   * 
   * 모바일 최적화:
   * - FPS 낮춤 (배터리 절약)
   * - 해상도 제한 (성능 최적화)
   * - 후면 카메라 우선 (facingMode: 'environment')
   * 
   * AR 오버레이:
   * - Canvas를 video 위에 배치하여 3D 블록을 표시합니다.
   * - z-index를 높게 설정하여 video 위에 렌더링됩니다.
   */
  const startQRScannerWithCamera = useCallback(async (cameraId) => {
    try {
      console.log('🔍 [QRScannerWebRTC] Starting QR scanner with camera:', cameraId);
      setError(null);
      setIsScanning(true);

      /**
       * 1단계: Canvas를 먼저 DOM에 추가
       * 
       * html5-qrcode가 시작하기 전에 Three.js Canvas를 추가해야 합니다.
       * 그렇지 않으면 html5-qrcode가 DOM을 변경하면서 Canvas가 제거될 수 있습니다.
       * 
       * Canvas 역할:
       * - 3D 블록을 렌더링하는 오버레이
       * - 투명 배경으로 카메라 피드 위에 표시
       */
      const container = document.getElementById('qr-reader-webrtc');
      if (container && arCanvasRef.current) {
        const existingCanvas = document.getElementById('ar-animation-canvas');
        if (!existingCanvas && arCanvasRef.current.parentNode !== container) {
          console.log('🔧 [QRScannerWebRTC] Adding Canvas to DOM before QR scanner starts...');
          container.appendChild(arCanvasRef.current);
        }
      }

      /**
       * 2단계: Html5Qrcode 인스턴스 생성
       * 
       * 'qr-reader-webrtc'는 QR 스캐너가 렌더링될 DOM 요소의 ID입니다.
       * 이 요소 안에 video 요소와 QR 인식 영역이 생성됩니다.
       */
      const qrCode = new Html5Qrcode('qr-reader-webrtc');
      qrCodeRef.current = qrCode;

      /**
       * 3단계: 모바일 환경 감지
       * 
       * User Agent를 확인하여 모바일 기기인지 판단합니다.
       * 모바일과 데스크톱의 카메라 설정을 다르게 적용합니다.
       */
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      /**
       * 4단계: 카메라 설정
       * 
       * 설정 옵션:
       * - fps: 초당 프레임 수
       *   - 모바일: 5fps (배터리 절약)
       *   - 데스크톱: 10fps (부드러운 스캔)
       * 
       * - qrbox: QR 코드 인식 영역 크기
       *   - 모바일: 200x200px (작은 화면)
       *   - 데스크톱: 250x250px (큰 화면)
       * 
       * - aspectRatio: 비디오 비율 (1.0 = 정사각형)
       * 
       * - videoConstraints: 카메라 제약 조건
       *   - facingMode: 'environment' (후면 카메라 우선)
       *   - width/height: 해상도 설정
       *     - 모바일: 640x480 (이상), 최대 1280x720
       *     - 데스크톱: 1280x720 (이상), 최대 1920x1080
       */
      const config = {
        fps: isMobile ? 5 : 10,  // 모바일: 5fps (배터리 절약), 데스크톱: 10fps
        qrbox: isMobile ? { width: 200, height: 200 } : { width: 250, height: 250 }, // QR 인식 영역
        aspectRatio: 1.0,  // 정사각형 비율
        // 모바일 환경에 최적화된 카메라 제약 조건
        videoConstraints: {
          facingMode: { ideal: 'environment' },  // 후면 카메라 우선
          width: isMobile ? { ideal: 640, max: 1280 } : { ideal: 1280, max: 1920 },
          height: isMobile ? { ideal: 480, max: 720 } : { ideal: 720, max: 1080 }
        }
      };

      /**
       * 5단계: 카메라 스트림 시작 및 QR 스캔 콜백 등록
       * 
       * qrCode.start()는 3개의 파라미터를 받습니다:
       * 1. cameraId: 사용할 카메라 ID
       * 2. config: 카메라 설정 (FPS, QR 박스 크기 등)
       * 3. onScanSuccess: QR 코드 스캔 성공 시 호출되는 콜백
       * 4. onScanError: QR 코드 스캔 실패 시 호출되는 콜백 (선택)
       * 
       * 동작:
       * - 카메라 스트림을 시작하고 video 요소에 표시
       * - QR 코드를 실시간으로 인식
       * - QR 코드를 발견하면 onScanSuccess 콜백 호출
       */
      await qrCode.start(
        cameraId,  // 카메라 ID
        config,    // 카메라 설정
        async (decodedText, result) => {
          /**
           * QR 코드 스캔 성공 콜백
           * 
           * @param {string} decodedText - QR 코드에서 읽은 텍스트 (JSON 문자열)
           * @param {object} result - 스캔 결과 상세 정보
           * 
           * 동작 과정:
           * 1. 중복 스캔 방지 체크
           * 2. QR 스캔 완료 플래그 설정
           * 3. QR 스캐너 중지 (카메라는 유지)
           * 4. QR 데이터 파싱하여 블록 ID 추출
           * 5. 3D 블록 모델 로드
           */
          console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
          console.log('📍 [QRScannerWebRTC] QR Code result:', result);
          
          /**
           * 중복 스캔 방지
           * 
           * 같은 QR 코드를 여러 번 스캔하는 것을 방지합니다.
           * qrScannedRef는 ref이므로 상태 변경 없이 즉시 확인할 수 있습니다.
           */
          if (qrScannedRef.current) {
            console.log('⚠️ [QRScannerWebRTC] QR already scanned, ignoring duplicate scan');
            return;
          }
          
          /**
           * QR 스캔 완료 플래그 설정
           * 
           * - setScannedData: 스캔된 QR 데이터 저장
           * - setQrScanned: AR 애니메이션 상태 변경 (펄스 효과 시작)
           * - qrScannedRef: ref도 업데이트 (즉시 확인 가능)
           */
          setScannedData(decodedText);
          setQrScanned(true);  // AR 애니메이션 상태 변경
          qrScannedRef.current = true; // ref도 업데이트
          
          /**
           * QR 스캔 완료 후 스캐너 중지
           * 
           * 카메라는 유지하되 QR 스캔은 중지합니다.
           * 이렇게 하면 카메라 피드는 계속 보이지만 QR 인식은 중지되어
           * 중복 스캔을 방지할 수 있습니다.
           */
          try {
            if (qrCodeRef.current) {
              await qrCodeRef.current.stop();
              console.log('🛑 [QRScannerWebRTC] QR scanner stopped after successful scan');
            }
          } catch (err) {
            console.warn('⚠️ [QRScannerWebRTC] Error stopping QR scanner:', err);
          }
          
          /**
           * QR 데이터 파싱하여 블록 ID 추출
           * 
           * QR 코드는 JSON 문자열로 인코딩되어 있습니다.
           * 예: '{"type":"blockhunt_blocks","qrId":"qr_abc123","block":"controls_if"}'
           * 
           * 파싱 과정:
           * 1. JSON.parse()로 문자열을 객체로 변환
           * 2. payload.block에서 블록 ID 추출
           * 3. 디버깅 정보 업데이트
           */
          let blockId = null;
          try {
            console.log('🔍 [QRScannerWebRTC] Parsing QR data:', decodedText);
            const qrPayload = JSON.parse(decodedText);
            console.log('✅ [QRScannerWebRTC] Parsed QR payload:', qrPayload);
            blockId = qrPayload.block;  // 블록 ID 추출
            console.log('📦 [QRScannerWebRTC] Extracted blockId:', blockId, `(type: ${typeof blockId})`);
            
            // 디버깅 정보 업데이트 (화면에 표시용)
            setDebugInfo(prev => ({
              ...prev,
              qrData: decodedText,
              parsedPayload: qrPayload,
              extractedBlockId: blockId,
              blockIdType: typeof blockId
            }));
            
            if (!blockId) {
              console.error('❌ [QRScannerWebRTC] blockId is null or undefined in QR payload');
            }
          } catch (err) {
            console.error('❌ [QRScannerWebRTC] Failed to parse QR data:', err);
            console.error('❌ [QRScannerWebRTC] Raw decodedText:', decodedText);
            // QR 데이터 파싱 실패 시에도 기본 처리 진행
          }
          
          /**
           * QR 코드 스캔 시 화면 중앙에 실제 블록 GLTF 모델 표시
           * 
           * Three.js가 초기화되어 있는지 확인하고 블록을 로드합니다.
           * 
           * 로드 과정:
           * 1. Three.js 초기화 확인 (Scene, Camera, Renderer)
           * 2. 초기화되지 않았으면 재시도 (최대 2초)
           * 3. 블록 ID로 GLTF 파일 경로 생성
           * 4. GLTFLoader로 모델 로드
           * 5. 모델에 설정 적용 (크기, 위치, 회전)
           * 6. Scene에 추가하여 화면에 표시
           */
          const loadBlockModel = () => {
            /**
             * Three.js 초기화 확인
             * 
             * Scene, Camera, Renderer가 모두 초기화되어 있어야 블록을 로드할 수 있습니다.
             * 초기화되지 않았으면 재시도합니다.
             */
            if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
              console.warn('⚠️ [QRScannerWebRTC] Three.js not initialized yet, retrying...');
              
              /**
               * Three.js 초기화를 기다림 (최대 2초)
               * 
               * 재시도 로직:
               * - 100ms마다 확인
               * - 최대 20회 재시도 (총 2초)
               * - 초기화 완료되면 블록 로드 시작
               * - 타임아웃되면 에러 로그 출력
               */
              let retryCount = 0;
              const maxRetries = 20;  // 최대 20회 재시도 (2초)
              const retryInterval = setInterval(() => {
                retryCount++;
                if (sceneRef.current && cameraRef.current && rendererRef.current && blockId) {
                  // 초기화 완료: 블록 로드 시작
                  clearInterval(retryInterval);
                  loadBlockModelInternal(blockId);
                } else if (retryCount >= maxRetries) {
                  // 타임아웃: 재시도 중지
                  clearInterval(retryInterval);
                  console.error('❌ [QRScannerWebRTC] Three.js initialization timeout');
                }
              }, 100);  // 100ms마다 확인
              return;
            }
            
            // Three.js가 초기화되었으면 바로 블록 로드
            if (blockId) {
              loadBlockModelInternal(blockId);
            }
          };
          
          /**
           * 실제 블록 GLTF 모델 로드 함수
           * 
           * @param {string} blockIdToLoad - 로드할 블록 ID (예: "controls_if")
           * 
           * 동작 과정:
           * 1. Scene과 Camera 확인
           * 2. 중복 로드 방지 (이미 같은 블록이 로드되어 있는지 확인)
           * 3. 다른 블록 제거 (같은 블록이 아닌 경우)
           * 4. GLTF 파일 경로 생성
           * 5. GLTFLoader로 모델 로드
           * 6. 모델 설정 적용 및 Scene에 추가
           */
          const loadBlockModelInternal = (blockIdToLoad) => {
            // Scene과 Camera가 있는지 확인
            if (!sceneRef.current || !cameraRef.current) {
              console.error('❌ [QRScannerWebRTC] Scene or camera not available');
              return;
            }
            
            /**
             * 중복 로드 방지
             * 
             * 같은 블록이 이미 로드되어 있는지 확인합니다.
             * userData.isQRBlock과 userData.blockId로 식별합니다.
             */
            const existingBlocks = sceneRef.current.children.filter(
              child => child.userData.isQRBlock === true && child.userData.blockId === blockIdToLoad
            );
            
            if (existingBlocks.length > 0) {
              console.log('⚠️ [QRScannerWebRTC] Block already loaded, skipping duplicate load:', blockIdToLoad);
              return;
            }
            
            /**
             * 다른 블록들 제거
             * 
             * 같은 블록이 아닌 다른 블록들을 Scene에서 제거합니다.
             * 메모리 정리를 위해 Geometry와 Material도 dispose()합니다.
             * 
             * dispose() 중요:
             * - 메모리 누수 방지
             * - WebGL 리소스 해제
             * - 성능 최적화
             */
            const otherBlocks = sceneRef.current.children.filter(
              child => child.userData.isQRBlock === true && child.userData.blockId !== blockIdToLoad
            );
            otherBlocks.forEach(block => {
              // Scene에서 제거
              sceneRef.current.remove(block);
              
              // 메모리 정리: 모든 자식 요소의 Geometry와 Material dispose
              block.traverse((child) => {
                if (child.geometry) {
                  child.geometry.dispose();  // Geometry 메모리 해제
                }
                if (child.material) {
                  // Material은 배열일 수 있으므로 배열 처리
                  if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());  // 각 Material 해제
                  } else {
                    child.material.dispose();  // 단일 Material 해제
                  }
                }
              });
            });
            
            /**
             * GLTF 파일 경로 생성 및 로더 초기화
             * 
             * GLTF (GL Transmission Format)는 3D 모델 파일 형식입니다.
             * Three.js의 GLTFLoader를 사용하여 GLTF 파일을 로드합니다.
             * 
             * GLTF 파일 위치:
             * - public/block_gltf/{blockId}.gltf
             * - 예: public/block_gltf/controls_if.gltf
             * 
             * getBlockGLTFPath() 함수:
             * - 블록 ID를 GLTF 파일 경로로 변환
             * - 예: "controls_if" → "/block_gltf/controls_if.gltf"
             */
            const gltfPath = getBlockGLTFPath(blockIdToLoad);
            const loader = new GLTFLoader();  // GLTF 로더 인스턴스 생성
            
            // 에러 상태 초기화 (이전 에러 메시지 제거)
            setBlockLoadError(null);
            
            console.log(`📦 [QRScannerWebRTC] Loading ${blockIdToLoad}.gltf from ${gltfPath}...`);
            
            /**
             * GLTF 파일 로드
             * 
             * loader.load()는 3개의 콜백을 받습니다:
             * 1. onLoad: 로드 성공 시 호출 (필수)
             * 2. onProgress: 로드 진행 중 호출 (선택, 진행률 표시용)
             * 3. onError: 로드 실패 시 호출 (필수, 에러 처리용)
             * 
             * 비동기 처리:
             * - GLTF 파일은 네트워크를 통해 로드되므로 비동기입니다.
             * - 파일 크기에 따라 로드 시간이 달라질 수 있습니다.
             */
            loader.load(
              gltfPath,  // 파일 경로
              (gltf) => {
                /**
                 * 로드 성공 콜백
                 * 
                 * gltf 객체 구조:
                 * - gltf.scene: Three.js Scene 객체 (모든 3D 객체 포함)
                 *   - 이 Scene을 복제하여 사용합니다.
                 * - gltf.animations: 애니메이션 데이터 (있는 경우)
                 * - gltf.cameras: 카메라 데이터 (있는 경우, 사용 안 함)
                 * - gltf.asset: 파일 메타데이터 (버전, 생성자 등)
                 */
                setBlockLoadError(null);
                console.log(`✅ [QRScannerWebRTC] ${blockIdToLoad}.gltf loaded successfully`);
                
                /**
                 * 모델 클론
                 * 
                 * clone()을 사용하여 원본 모델을 보존합니다.
                 * 
                 * 클론하는 이유:
                 * - 같은 모델을 여러 번 사용할 때 유용
                 * - 원본 모델을 보존하여 재사용 가능
                 * - 각 인스턴스가 독립적으로 동작
                 */
                const model = gltf.scene.clone();
                
                /**
                 * userData 설정 (루트 모델)
                 * 
                 * userData는 Three.js 객체에 메타데이터를 저장하는 공간입니다.
                 * 클릭 감지 및 블록 식별에 사용됩니다.
                 * 
                 * userData 필드:
                 * - clickable: 클릭 가능한 객체임을 표시 (Raycaster에서 사용)
                 * - isQRBlock: QR 블록임을 표시 (필터링용)
                 * - blockId: 블록 ID 저장 (블록 식별용)
                 */
                model.userData = {
                  clickable: true,      // 클릭 가능한 객체임을 표시
                  isQRBlock: true,      // QR 블록임을 표시
                  blockId: blockIdToLoad // 블록 ID 저장
                };
                
                /**
                 * Material 설정 및 모든 Mesh에 userData 설정
                 * 
                 * traverse()는 객체의 모든 자식 요소를 재귀적으로 순회합니다.
                 * GLTF 모델은 여러 Mesh로 구성될 수 있으므로 모든 Mesh를 처리해야 합니다.
                 * 
                 * Material 설정:
                 * - side: THREE.DoubleSide (양면 렌더링)
                 *   - 앞면과 뒷면 모두 표시 (어느 각도에서 봐도 보임)
                 *   - 기본값은 THREE.FrontSide (앞면만 표시)
                 * - needsUpdate: Material 업데이트 플래그
                 *   - Material 속성을 변경한 후 반드시 true로 설정해야 변경사항이 적용됨
                 *   - Three.js의 최적화를 위한 플래그
                 * 
                 * userData 설정 (각 Mesh):
                 * - 모든 Mesh에도 userData를 설정하여 클릭 감지가 정확하게 동작하도록 합니다.
                 * - Raycaster는 Mesh 단위로 교차를 감지하므로 각 Mesh에 설정이 필요합니다.
                 */
                let materialCount = 0;
                let colorInfo = [];
                model.traverse((child) => {
                  // Mesh인 경우만 처리
                  if (child.isMesh) {
                    /**
                     * 모든 mesh에 userData 설정 (클릭 감지용)
                     * 
                     * Raycaster는 Mesh 단위로 교차를 감지하므로
                     * 각 Mesh에 userData를 설정해야 정확한 클릭 감지가 가능합니다.
                     */
                    child.userData.clickable = true;
                    child.userData.isQRBlock = true;
                    child.userData.blockId = blockIdToLoad;
                    
                    if (child.material) {
                      /**
                       * Material 처리
                       * 
                       * Material은 단일 객체일 수도 있고 배열일 수도 있습니다.
                       * 배열인 경우: 여러 Material을 사용하는 Mesh (예: 텍스처가 다른 부분)
                       * 단일인 경우: 하나의 Material을 사용하는 Mesh
                       */
                      const materials = Array.isArray(child.material) ? child.material : [child.material];
                      materials.forEach((material) => {
                        if (material) {
                          /**
                           * Material 속성 설정
                           * 
                           * side: THREE.DoubleSide
                           * - 양면 렌더링 활성화
                           * - 앞면과 뒷면 모두 표시 (AR 환경에서 유용)
                           * 
                           * needsUpdate: true
                           * - Material 속성을 변경한 후 반드시 설정
                           * - Three.js가 변경사항을 인식하도록 함
                           */
                          material.side = THREE.DoubleSide;  // 양면 렌더링
                          material.needsUpdate = true;        // Material 업데이트 플래그
                          
                          /**
                           * 색상 정보 확인 및 로그 (디버깅용)
                           * 
                           * Material의 색상 정보를 수집하여 로그로 출력합니다.
                           * 디버깅 시 블록의 색상이 제대로 로드되었는지 확인할 수 있습니다.
                           */
                          materialCount++;
                          if (material.color) {
                            const colorHex = '#' + material.color.getHexString();
                            colorInfo.push({
                              type: material.type,      // Material 타입 (MeshStandardMaterial 등)
                              color: colorHex,          // 색상 (16진수)
                              name: material.name || 'unnamed'  // Material 이름
                            });
                          }
                        }
                      });
                    }
                  }
                });
                
                /**
                 * 색상 적용 확인 로그
                 * 
                 * Material 정보를 콘솔에 출력하여 디버깅에 활용합니다.
                 * 블록의 색상이 제대로 로드되었는지 확인할 수 있습니다.
                 */
                console.log(`🎨 [QRScannerWebRTC] Material info for ${blockIdToLoad}:`, {
                  materialCount,      // Material 개수
                  colors: colorInfo,  // 색상 정보 배열
                  hasColors: colorInfo.length > 0  // 색상이 있는지 여부
                });
                
                /**
                 * 블록별 설정 적용
                 * 
                 * applyBlockDisplayConfig는 블록의 크기, 위치, 회전을 설정합니다.
                 * 설정은 blockDisplayConfigs.json 파일에서 가져옵니다.
                 * 
                 * 적용되는 설정:
                 * - scale: 크기 (예: 20)
                 *   - 모델의 크기를 조절합니다.
                 *   - 값이 클수록 큰 블록이 표시됩니다.
                 * - position: 위치 (x, y, z)
                 *   - 모델의 3D 공간에서의 위치
                 *   - z축이 음수면 카메라에 가까움
                 * - rotation: 회전 (x, y, z, 라디안 단위)
                 *   - 각 축의 회전 각도
                 *   - Math.PI = 180도
                 * - autoCenter: 자동 중앙 정렬 여부
                 *   - true: 바운딩 박스를 계산하여 모델을 중앙에 배치
                 *   - false: 설정된 위치를 그대로 사용
                 * 
                 * 자동 중앙 정렬:
                 * - autoCenter가 true면 바운딩 박스를 계산하여 모델을 중앙에 배치합니다.
                 * - 각 블록의 모양이 다르므로 자동 중앙 정렬이 유용합니다.
                 * - 바운딩 박스는 모델의 모든 정점을 포함하는 최소 상자입니다.
                 */
                applyBlockDisplayConfig(model, blockIdToLoad, setDebugInfo);
                
                /**
                 * 바운딩 박스 계산 및 로그 출력
                 * 
                 * 바운딩 박스는 모델의 경계를 나타내는 상자입니다.
                 * 
                 * Box3().setFromObject():
                 * - 모델의 모든 정점을 포함하는 최소 상자를 계산합니다.
                 * - min, max 좌표를 반환합니다.
                 * 
                 * getSize():
                 * - 바운딩 박스의 크기 (width, height, depth)를 반환합니다.
                 * 
                 * getCenter():
                 * - 바운딩 박스의 중심점을 반환합니다.
                 * - 자동 중앙 정렬에 사용됩니다.
                 */
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                console.log(`📦 [QRScannerWebRTC] Block ${blockIdToLoad} after applyBlockDisplayConfig:`, {
                  modelScale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
                  boundingBoxSize: { x: size.x, y: size.y, z: size.z },
                  center: { x: center.x, y: center.y, z: center.z },
                  position: { x: model.position.x, y: model.position.y, z: model.position.z }
                });
                
                /**
                 * 디버깅 정보 업데이트 (모델 정보)
                 * 
                 * 화면에 표시할 디버깅 정보를 업데이트합니다.
                 * 개발자 도구나 디버그 패널에서 확인할 수 있습니다.
                 */
                setDebugInfo(prev => ({
                  ...prev,
                  modelInfo: {
                    blockId: blockIdToLoad,
                    scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
                    baseScale: model.userData.baseScale,  // 애니메이션용 기본 크기
                    boundingBoxSize: { x: size.x, y: size.y, z: size.z },
                    position: { x: model.position.x, y: model.position.y, z: model.position.z },
                    materialCount,
                    colors: colorInfo
                  }
                }));
                
                /**
                 * Scene에 모델 추가
                 * 
                 * Scene에 추가해야 화면에 표시됩니다.
                 * blocksRef에도 추가하여 애니메이션 루프에서 접근할 수 있도록 합니다.
                 */
                sceneRef.current.add(model);
                blocksRef.current = [model];  // 현재 표시 중인 블록 배열 업데이트
                
                // Scene에 추가한 후 다시 확인
                const boxAfterAdd = new THREE.Box3().setFromObject(model);
                const sizeAfterAdd = boxAfterAdd.getSize(new THREE.Vector3());
                console.log(`✅ [QRScannerWebRTC] ${blockIdToLoad}.gltf model added to scene. Final scale:`, {
                  modelScale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
                  boundingBoxSize: { x: sizeAfterAdd.x, y: sizeAfterAdd.y, z: sizeAfterAdd.z }
                });
                
                // 최종 디버깅 정보 업데이트
                setDebugInfo(prev => ({
                  ...prev,
                  finalModelInfo: {
                    scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
                    boundingBoxSize: { x: sizeAfterAdd.x, y: sizeAfterAdd.y, z: sizeAfterAdd.z }
                  }
                }));
              },
              (progress) => {
                /**
                 * 로드 진행 콜백
                 * 
                 * 파일 로드 진행률을 표시합니다.
                 * 
                 * progress 객체:
                 * - loaded: 현재까지 로드된 바이트 수
                 * - total: 전체 파일 크기 (바이트)
                 * 
                 * 사용 예시:
                 * - 로딩 바 표시
                 * - 진행률 퍼센트 표시
                 */
                if (progress.total > 0) {
                  const percent = (progress.loaded / progress.total) * 100;
                  console.log(`📦 [QRScannerWebRTC] Loading progress: ${percent.toFixed(2)}%`);
                }
              },
              (error) => {
                /**
                 * 로드 실패 콜백
                 * 
                 * 에러 원인:
                 * - GLTF 파일이 없음 (가장 흔한 경우)
                 * - 파일 경로가 잘못됨
                 * - 파일 형식이 잘못됨
                 * - 네트워크 오류
                 * 
                 * 에러 처리:
                 * 1. 에러 상태 설정 (사용자에게 알림)
                 * 2. 디버깅 정보 업데이트
                 * 3. 기본 블록 생성 (빨간색 박스로 대체 표시)
                 */
                console.error(`❌ [QRScannerWebRTC] Error loading ${blockIdToLoad}.gltf:`, error);
                console.error(`❌ [QRScannerWebRTC] GLTF file not found: /block_gltf/${blockIdToLoad}.gltf`);
                
                // 블록 정보 가져오기 (에러 메시지에 사용)
                const blockInfo = blocksDataRef.current.find(b => b.id === blockIdToLoad);
                const blockName = blockInfo ? blockInfo.name : blockIdToLoad;
                
                // 에러 상태 설정 (사용자에게 알림 표시)
                setBlockLoadError({
                  blockId: blockIdToLoad,
                  blockName: blockName,
                  gltfPath: `/block_gltf/${blockIdToLoad}.gltf`,
                  message: `GLTF file not found: ${blockIdToLoad}.gltf`
                });
                
                // 디버깅 정보 업데이트
                setDebugInfo(prev => ({
                  ...prev,
                  error: {
                    message: `GLTF file not found for block: ${blockIdToLoad}`,
                    blockName: blockName,
                    gltfPath: `/block_gltf/${blockIdToLoad}.gltf`,
                    errorDetails: error.message || error.toString()
                  }
                }));
                
                /**
                 * 에러 발생 시 기본 블록 생성
                 * 
                 * GLTF 파일이 없어도 사용자에게 시각적 피드백을 제공하기 위해
                 * 빨간색 박스를 생성합니다.
                 * 
                 * BoxGeometry: 정육면체 형태의 Geometry
                 * MeshBasicMaterial: 기본 Material (조명 없이도 보임)
                 * 
                 * 에러 블록 특징:
                 * - 빨간색 (에러임을 표시)
                 * - 반투명 (opacity: 0.8)
                 * - userData에 isErrorBlock 플래그 설정
                 */
                if (sceneRef.current && cameraRef.current) {
                  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);  // 정육면체
                  const material = new THREE.MeshBasicMaterial({ 
                    color: 0xff6b6b,  // 빨간색 (에러 표시)
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                  });
                  const fallbackBlock = new THREE.Mesh(geometry, material);
                  fallbackBlock.position.set(0, 0.2, -1);
                  fallbackBlock.scale.set(2.5, 2.5, 2.5);
                  fallbackBlock.userData = {
                    clickable: true,
                    isQRBlock: true,
                    blockId: blockIdToLoad,
                    isErrorBlock: true,  // 에러 블록임을 표시
                    errorMessage: `GLTF file missing: ${blockIdToLoad}.gltf`
                  };
                  sceneRef.current.add(fallbackBlock);
                  blocksRef.current = [fallbackBlock];
                  console.warn(`⚠️ [QRScannerWebRTC] Fallback error block created for missing GLTF: ${blockIdToLoad}`);
                  console.warn(`⚠️ [QRScannerWebRTC] Block name: ${blockName}`);
                  console.warn(`⚠️ [QRScannerWebRTC] Please add GLTF file: /block_gltf/${blockIdToLoad}.gltf`);
                }
              }
            );
          };
          
          // 블록 로드 시작
          loadBlockModel();
          
          // 모달은 블록 클릭 시에만 표시하도록 변경 (여기서는 표시하지 않음)
          // onScan은 블록 클릭 시 호출하도록 변경
        },
        (error) => {
          // 스캔 실패는 정상적인 상황 (QR 코드가 없을 때)
          // 사용자에게 오류로 보이지 않도록 조용히 처리
          // 디버깅을 위해서만 콘솔에 기록 (verbose 모드)
          const errorString = error?.toString() || '';
          if (error && 
              !errorString.includes('No QR code found') && 
              !errorString.includes('NotFoundException') &&
              !errorString.includes('IndexSizeError') &&
              !errorString.includes('getImageData') &&
              !errorString.includes('source width is 0') &&
              !errorString.includes('No MultiFormat Readers') &&
              !errorString.includes('QR code parse error')) {
            // 정상적인 스캔 실패 외의 실제 오류만 로그
            console.warn('📷 [QRScannerWebRTC] Scan error:', error);
          }
        }
      );

      // html5-qrcode가 시작된 후 Canvas가 여전히 있는지 확인하고 재추가
      const ensureCanvasAfterQRStart = () => {
        const container = document.getElementById('qr-reader-webrtc');
        if (!container) return;
        
        let canvas = document.getElementById('ar-animation-canvas');
        
        // Canvas가 없거나 컨테이너의 자식이 아니면 추가
        if (!canvas && arCanvasRef.current) {
          console.log('🔧 [QRScannerWebRTC] Canvas was removed by html5-qrcode, re-adding...');
          container.appendChild(arCanvasRef.current);
          canvas = arCanvasRef.current;
        }
        
        // z-index 조정
        if (canvas) {
          canvas.style.position = 'absolute';
          canvas.style.zIndex = '1000';
          canvas.style.pointerEvents = 'auto'; // 클릭 이벤트 활성화
          canvas.style.touchAction = 'none'; // 모바일 터치 기본 동작 방지
        }
      };

      // 여러 번 확인하여 Canvas가 유지되도록 함
      setTimeout(ensureCanvasAfterQRStart, 100);
      setTimeout(ensureCanvasAfterQRStart, 300);
      setTimeout(ensureCanvasAfterQRStart, 500);
      setTimeout(ensureCanvasAfterQRStart, 1000);

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
  }, [safeCleanup]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * QR 스캐너 시작 함수
   * 
   * 이 함수는 QR 스캐너를 초기화하고 카메라 권한을 요청합니다.
   * 
   * 동작 과정:
   * 1. 사용 가능한 카메라 목록 가져오기 (getCameras)
   * 2. 후면 카메라 우선 선택 (모바일 환경)
   * 3. 선택된 카메라로 QR 스캐너 시작
   * 
   * 카메라 권한:
   * - 브라우저가 사용자에게 카메라 권한을 요청합니다.
   * - 사용자가 "허용"을 선택하면 카메라가 시작됩니다.
   * - 사용자가 "거부"를 선택하면 에러가 발생합니다.
   * 
   * 모바일 최적화:
   * - 후면 카메라 우선 선택 (facingMode: 'environment')
   * - FPS 낮춤 (배터리 절약)
   * - QR 박스 크기 조정
   * 
   * 에러 처리:
   * - 카메라 권한 거부: cameraPermission을 'denied'로 설정
   * - 카메라 없음: 에러 메시지 표시
   * - 기타 오류: 에러 메시지 표시 및 cleanup
   */
  const startQRScanner = useCallback(async () => {
    if (isInitialized) {
      console.log('⚠️ [QRScannerWebRTC] Already initialized, skipping...');
      return;
    }

    try {
      console.log('🔍 [QRScannerWebRTC] Starting QR scanner...');
      setError(null);
      setIsScanning(true);

      /**
       * 1단계: 사용 가능한 카메라 목록 가져오기
       * 
       * Html5Qrcode.getCameras()는 브라우저의 MediaDevices API를 사용합니다.
       * 이 과정에서 브라우저가 사용자에게 카메라 권한을 요청할 수 있습니다.
       * 
       * 반환값:
       * - cameras 배열: 각 카메라의 id와 label 정보
       * - 예: [{ id: 'camera1', label: 'Back Camera' }, ...]
       * 
       * 권한 요청:
       * - 첫 호출 시 브라우저가 사용자에게 권한을 요청합니다.
       * - 사용자가 허용하면 카메라 목록이 반환됩니다.
       * - 사용자가 거부하면 에러가 발생합니다.
       */
      const cameras = await Html5Qrcode.getCameras();
      setAvailableCameras(cameras);
      console.log('📷 [QRScannerWebRTC] Available cameras:', cameras.length);

      /**
       * 2단계: 후면 카메라 우선 선택
       * 
       * 모바일 환경에서는 후면 카메라가 QR 코드 스캔에 더 적합합니다.
       * 카메라 label에서 'back', 'rear', 'environment' 키워드를 찾습니다.
       * 
       * facingMode:
       * - 'environment': 후면 카메라 (모바일)
       * - 'user': 전면 카메라 (셀카)
       */
      const backCameraIndex = cameras.findIndex(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );
      
      // 후면 카메라가 없으면 첫 번째 카메라 사용
      const initialCameraIndex = backCameraIndex >= 0 ? backCameraIndex : 0;
      setCurrentCameraIndex(initialCameraIndex);
      
      /**
       * 3단계: 선택된 카메라로 스캐너 시작
       * 
       * startQRScannerWithCamera는 실제로 카메라 스트림을 시작하고
       * QR 코드 스캔을 시작합니다.
       */
      await startQRScannerWithCamera(cameras[initialCameraIndex].id);

    } catch (err) {
      /**
       * 에러 처리
       * 
       * 가능한 에러:
       * - NotAllowedError: 사용자가 카메라 권한을 거부함
       * - NotFoundError: 카메라를 찾을 수 없음
       * - NotReadableError: 카메라가 다른 앱에서 사용 중
       * - OverconstrainedError: 요청한 카메라 설정을 지원하지 않음
       */
      console.error('❌ [QRScannerWebRTC] QR scanner failed:', err);
      setError(`QR scanner initialization failed: ${err.message}`);
      setCameraPermission('denied');
      setIsScanning(false);
      safeCleanup();
    }
  }, [isInitialized, safeCleanup, startQRScannerWithCamera]);

  // Three.js 초기화 (isScanning이 true일 때)
  useEffect(() => {
    if (!isScanning) {
      // isScanning이 false가 되면 cleanup
      // 단, QR 스캔 후 블록이 표시되는 동안에는 cleanup하지 않음
      // (qrScanned 상태로 확인)
      if (!qrScanned) {
        cleanupThreeJS();
      }
      return;
    }
    
    console.log('🎨 [QRScannerWebRTC] Setting up Three.js initialization...', {
      isScanning,
      hasCanvasRef: !!arCanvasRef.current,
      hasRenderer: !!rendererRef.current
    });

    // Canvas가 DOM에 있는지 확인하고 없으면 추가
    const ensureCanvasInDOM = () => {
      const container = document.getElementById('qr-reader-webrtc');
      if (!container) {
        console.warn('⚠️ [QRScannerWebRTC] Container not found');
        return false;
      }

      // Canvas가 이미 있는지 확인
      let canvas = document.getElementById('ar-animation-canvas');
      
      if (!canvas && arCanvasRef.current) {
        // Canvas가 DOM에 없으면 추가
        console.log('🔧 [QRScannerWebRTC] Canvas not in DOM, appending...');
        container.appendChild(arCanvasRef.current);
        canvas = arCanvasRef.current;
      }
      
      return !!canvas;
    };

    // html5-qrcode가 생성한 video 요소의 z-index를 낮추기
    const adjustVideoZIndex = () => {
      const container = document.getElementById('qr-reader-webrtc');
      if (container) {
        const video = container.querySelector('video');
        const shadedRegion = container.querySelector('#qr-shaded-region');
        
        if (video) {
          video.style.position = 'relative';
          video.style.zIndex = '1';
          console.log('✅ [QRScannerWebRTC] Video z-index adjusted');
        }
        
        if (shadedRegion) {
          shadedRegion.style.zIndex = '2';
          console.log('✅ [QRScannerWebRTC] Shaded region z-index adjusted');
        }
        
        return !!video;
      }
      return false;
    };

    // 초기화 시도 - video 요소를 기다리지 않고 먼저 Three.js 초기화
    let retryCount = 0;
    const maxRetries = 10; // 최대 1초 대기 (줄임)
    
    const tryInit = () => {
      // 이미 초기화되었는지 확인
      if (rendererRef.current) {
        console.log('⚠️ [QRScannerWebRTC] Already initialized, skipping');
        return;
      }

      // Canvas가 DOM에 있는지 확인
      if (!ensureCanvasInDOM()) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(tryInit, 100);
        } else {
          // Canvas가 없어도 Three.js 초기화 시도 (나중에 추가될 수 있음)
          console.warn('⚠️ [QRScannerWebRTC] Canvas not found after retries, initializing anyway...');
          initThreeJS();
        }
        return;
      }

      // Canvas ref가 있는지 확인
      if (!arCanvasRef.current) {
        console.warn('⚠️ [QRScannerWebRTC] Canvas ref not available');
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(tryInit, 100);
        } else {
          console.warn('⚠️ [QRScannerWebRTC] Canvas ref not available after retries');
        }
        return;
      }

      // Three.js는 video 요소를 기다리지 않고 먼저 초기화
      // video 요소는 나중에 z-index만 조정하면 됨
      console.log('✅ [QRScannerWebRTC] Initializing Three.js immediately (video will be adjusted later)...');
      initThreeJS();
      
      // video 요소는 별도로 조정 (비동기)
      setTimeout(() => {
        adjustVideoZIndex();
      }, 500);
    };

    // MutationObserver로 html5-qrcode가 DOM을 변경할 때 감지
    const container = document.getElementById('qr-reader-webrtc');
    let resizeObserver = null;
    
    if (container) {
      const observer = new MutationObserver(() => {
        // DOM 변경 시 Canvas가 여전히 있는지 확인
        ensureCanvasInDOM();
        adjustVideoZIndex();
        // video 요소 확인 (AR.js 제거로 인해 더 이상 초기화 불필요)
      });

      observer.observe(container, {
        childList: true,
        subtree: true
      });

      // 컨테이너 크기 변경 감지 (ResizeObserver)
      const resizeHandler = () => {
        if (rendererRef.current && cameraRef.current && container) {
          // video 요소의 표시 크기를 우선 사용
          const video = container.querySelector('video');
          let newWidth, newHeight;
          
          if (video && video.clientWidth > 0 && video.clientHeight > 0) {
            // video 요소의 표시 크기 사용 (clientWidth/clientHeight)
            newWidth = video.clientWidth;
            newHeight = video.clientHeight;
          } else {
            // video가 없으면 컨테이너 크기 사용
            newWidth = container.offsetWidth || container.clientWidth || 640;
            newHeight = container.offsetHeight || container.clientHeight || 480;
          }
          
          // 이전 크기와 비교하여 실제로 변경되었는지 확인
          const currentWidth = rendererRef.current.domElement.width;
          const currentHeight = rendererRef.current.domElement.height;
          
          // 크기 변경이 5픽셀 이상일 때만 업데이트
          const widthDiff = Math.abs(newWidth - currentWidth);
          const heightDiff = Math.abs(newHeight - currentHeight);
          
          if (widthDiff < 5 && heightDiff < 5) {
            // 크기 변경이 미미하면 무시
            return;
          }
          
          console.log('🔄 [QRScannerWebRTC] Resizing canvas to match video:', {
            current: { width: currentWidth, height: currentHeight },
            new: { width: newWidth, height: newHeight },
            videoClientWidth: video?.clientWidth,
            videoClientHeight: video?.clientHeight
          });
          
          if (arCanvasRef.current) {
            // 캔버스의 실제 크기와 스타일 크기를 동일하게 설정
            arCanvasRef.current.width = newWidth;
            arCanvasRef.current.height = newHeight;
            arCanvasRef.current.style.width = `${newWidth}px`;
            arCanvasRef.current.style.height = `${newHeight}px`;
          }
          
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        }
      };
      
      // 초기 리사이즈 (video가 로드될 때까지 기다림)
      const initialResize = () => {
        const video = container.querySelector('video');
        if (video && video.clientWidth > 0 && video.clientHeight > 0) {
          resizeHandler();
        } else {
          setTimeout(initialResize, 100);
        }
      };
      
      setTimeout(initialResize, 200);
      
      // ResizeObserver로 컨테이너와 video 크기 변경 감지
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          resizeHandler();
        });
        resizeObserver.observe(container);
        
        // video 요소도 관찰
        const video = container.querySelector('video');
        if (video) {
          resizeObserver.observe(video);
        }
      }

      // 초기화 시작
      const timer = setTimeout(tryInit, 300);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        // cleanup은 isScanning이 false일 때만 호출되도록 수정
      };
    } else {
      const timer = setTimeout(tryInit, 500);
      return () => clearTimeout(timer);
    }
  }, [isScanning, qrScanned, initThreeJS, cleanupThreeJS]);

  // qrScanned 상태 변경 시 애니메이션 업데이트
  useEffect(() => {
    qrScannedRef.current = qrScanned;
  }, [qrScanned]);

  // 블록 회전 기능을 위한 터치 이벤트 핸들러
  useEffect(() => {
    // qrScanned가 true이고 canvas가 있으면 이벤트 리스너 등록
    // blocksRef는 나중에 로드될 수 있으므로 조건에서 제외
    if (!qrScanned || !arCanvasRef.current) {
      console.log('⚠️ [QRScannerWebRTC] Rotation listeners not added:', { qrScanned, hasCanvas: !!arCanvasRef.current });
      return;
    }

    const canvas = arCanvasRef.current;
    console.log('🔄 [QRScannerWebRTC] Setting up rotation listeners, blocks:', blocksRef.current.length);

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) return; // 단일 터치만 처리
      
      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        isRotating: false,
        hasMoved: false, // 이동 여부 플래그 초기화
        isActive: true // 터치가 활성화되었음을 표시
      };
      setIsRotating(false);
      console.log('🔄 [QRScannerWebRTC] Touch started at:', { x: touch.clientX, y: touch.clientY });
      event.preventDefault();
      event.stopPropagation(); // 다른 이벤트 핸들러와의 충돌 방지
    };

    /**
     * 터치 이동 핸들러 (모바일)
     * 
     * @param {TouchEvent} event - 터치 이벤트
     * 
     * 동작:
     * 1. 이동 거리 계산
     * 2. 클릭과 드래그 구분 (clickThreshold 기준)
     * 3. 드래그인 경우 블록 회전 적용
     * 4. 부드러운 회전을 위한 delta smoothing
     * 
     * 회전 계산:
     * - 수평 드래그: Y축 회전 (좌우)
     * - 수직 드래그: X축 회전 (상하, 제한: -90도 ~ +90도)
     */
    const handleTouchMove = (event) => {
      // 단일 터치만 처리
      if (event.touches.length !== 1) return;
      
      // 블록이 없으면 무시
      if (blocksRef.current.length === 0) {
        console.log('⚠️ [QRScannerWebRTC] Touch move ignored - no blocks');
        return;
      }
      
      // touchStart가 활성화되지 않았으면 무시
      if (!touchStartRef.current.isActive) {
        console.log('⚠️ [QRScannerWebRTC] Touch move ignored - not active');
        return;
      }
      
      const touch = event.touches[0];
      
      /**
       * 이동 거리 계산
       * 
       * rawDeltaX: 수평 이동 거리 (픽셀)
       * rawDeltaY: 수직 이동 거리 (픽셀)
       * distance: 총 이동 거리 (피타고라스 정리)
       */
      const rawDeltaX = touch.clientX - touchStartRef.current.x;
      const rawDeltaY = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY);

      /**
       * 이동 감지 및 hasMoved 플래그 설정
       * 
       * 3px 이상 이동하면 드래그로 간주하여 hasMoved를 true로 설정합니다.
       * 이렇게 하면 나중에 클릭 이벤트를 방지할 수 있습니다.
       */
      if (distance > 3) {  // 3px 이상 이동하면 드래그로 간주
        touchStartRef.current.hasMoved = true;
      }

      /**
       * 회전 모드 전환
       * 
       * 이동 거리가 clickThreshold(10px) 이상이면 회전 모드로 전환합니다.
       */
      if (distance > clickThreshold) {
        // 회전 모드 시작
        if (!touchStartRef.current.isRotating) {
          touchStartRef.current.isRotating = true;
          setIsRotating(true);
          console.log('🔄 [QRScannerWebRTC] Rotation started');
          // 회전 시작 시 이전 delta 초기화 (부드러운 시작)
          lastDeltaRef.current = { x: 0, y: 0 };
        }

        /**
         * 부드러운 회전을 위한 delta smoothing
         * 
         * 이전 delta 값과의 평균을 사용하여 부드러운 회전을 구현합니다.
         * 
         * smoothingFactor: 0.3
         * - 0에 가까울수록 더 부드러움 (이전 값에 더 많이 의존)
         * - 1에 가까울수록 더 즉각적 (현재 값에 더 많이 의존)
         * 
         * 공식:
         * smoothedDelta = rawDelta * (1 - factor) + lastDelta * factor
         * 
         * 예시:
         * - rawDelta = 10, lastDelta = 5, factor = 0.3
         * - smoothedDelta = 10 * 0.7 + 5 * 0.3 = 7 + 1.5 = 8.5
         */
        const smoothingFactor = 0.3;  // 0~1 사이 값, 낮을수록 더 부드러움
        const smoothedDeltaX = rawDeltaX * (1 - smoothingFactor) + lastDeltaRef.current.x * smoothingFactor;
        const smoothedDeltaY = rawDeltaY * (1 - smoothingFactor) + lastDeltaRef.current.y * smoothingFactor;

        /**
         * 블록 회전 적용
         * 
         * rotationSensitivity를 사용하여 회전 속도를 조절합니다.
         * 값이 작을수록 느린 회전 (더 정밀한 제어)
         */
        const block = blocksRef.current[0];
        if (block) {
          /**
           * Y축 회전 (수평 드래그)
           * 
           * 수평으로 드래그하면 블록이 Y축을 중심으로 회전합니다.
           * 제한 없음 (360도 자유 회전)
           */
          block.rotation.y += smoothedDeltaX * rotationSensitivity;
          
          /**
           * X축 회전 (수직 드래그)
           * 
           * 수직으로 드래그하면 블록이 X축을 중심으로 회전합니다.
           * 제한: -90도 ~ +90도 (Math.PI / 2)
           * 
           * 제한하는 이유:
           * - 너무 많이 회전하면 블록이 뒤집혀 보일 수 있음
           * - 사용자 경험 개선
           */
          block.rotation.x += smoothedDeltaY * rotationSensitivity;
          block.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, block.rotation.x));
        }

        /**
         * 이전 delta 값 저장
         * 
         * 다음 프레임에서 smoothing에 사용하기 위해 저장합니다.
         */
        lastDeltaRef.current = { x: smoothedDeltaX, y: smoothedDeltaY };

        /**
         * 시작점 업데이트
         * 
         * 상대적 회전을 위해 시작점을 현재 위치로 업데이트합니다.
         * 이렇게 하면 연속적인 드래그가 자연스럽게 동작합니다.
         */
        touchStartRef.current.x = touch.clientX;
        touchStartRef.current.y = touch.clientY;
      } else {
        /**
         * 작은 이동 처리
         * 
         * clickThreshold 미만의 작은 이동도 시작점을 업데이트합니다.
         * 누적 이동 거리 계산을 위해 필요합니다.
         */
        touchStartRef.current.x = touch.clientX;
        touchStartRef.current.y = touch.clientY;
        // 작은 이동 시 delta 초기화 (회전이 아니므로)
        lastDeltaRef.current = { x: 0, y: 0 };
      }

      // 기본 동작 방지 (스크롤, 줌 등)
      event.preventDefault();
    };

    /**
     * 터치 종료 핸들러 (모바일)
     * 
     * @param {TouchEvent} event - 터치 이벤트
     * 
     * 동작:
     * 1. 클릭과 드래그 구분
     * 2. 회전 상태 초기화
     * 3. 드래그였으면 클릭 이벤트 방지
     * 
     * 클릭 판단:
     * - hasMoved가 false이고 isRotating이 false면 클릭
     * - 그 외의 경우는 드래그(회전)
     */
    const handleTouchEnd = (event) => {
      /**
       * 클릭 여부 판단
       * 
       * hasMoved가 false이고 isRotating이 false면 클릭으로 간주합니다.
       * 그 외의 경우는 드래그(회전)였으므로 클릭 이벤트를 무시합니다.
       */
      const wasClick = !touchStartRef.current.hasMoved && !touchStartRef.current.isRotating;
      
      console.log('🔄 [QRScannerWebRTC] Touch ended:', { 
        wasClick, 
        hasMoved: touchStartRef.current.hasMoved, 
        isRotating: touchStartRef.current.isRotating 
      });
      
      /**
       * 회전 상태 초기화
       * 
       * 모든 상태를 초기값으로 되돌립니다.
       * 다음 터치를 위해 준비합니다.
       */
      touchStartRef.current = { x: 0, y: 0, isRotating: false, hasMoved: false, isActive: false };
      lastDeltaRef.current = { x: 0, y: 0 };  // delta 값도 초기화
      setIsRotating(false);
      
      /**
       * 클릭 이벤트 방지
       * 
       * 드래그(회전)였으면 클릭 이벤트를 방지합니다.
       * preventDefault()와 stopPropagation()으로 클릭 핸들러가 실행되지 않도록 합니다.
       */
      if (!wasClick) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    /**
     * 마우스 드래그 지원 (데스크톱)
     * 
     * 터치 이벤트와 동일한 로직을 마우스 이벤트에도 적용합니다.
     * 데스크톱 사용자도 블록을 회전시킬 수 있습니다.
     */
    
    /**
     * 마우스 다운 핸들러 (데스크톱)
     * 
     * @param {MouseEvent} event - 마우스 이벤트
     * 
     * 터치 이벤트와 동일한 방식으로 시작 위치를 저장합니다.
     */
    const handleMouseDown = (event) => {
      touchStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        isRotating: false,
        hasMoved: false,
        isActive: true
      };
      setIsRotating(false);
      console.log('🖱️ [QRScannerWebRTC] Mouse down at:', { x: event.clientX, y: event.clientY });
    };

    /**
     * 마우스 이동 핸들러 (데스크톱)
     * 
     * @param {MouseEvent} event - 마우스 이벤트
     * 
     * 터치 이동 핸들러와 동일한 로직을 사용합니다.
     * event.buttons !== 1: 왼쪽 버튼만 처리 (드래그 중인지 확인)
     */
    const handleMouseMove = (event) => {
      // 왼쪽 버튼만 처리 (event.buttons: 1 = 왼쪽, 2 = 오른쪽, 4 = 가운데)
      if (event.buttons !== 1) return;
      
      // 블록이 없으면 무시
      if (blocksRef.current.length === 0) {
        return;
      }
      
      // touchStart가 활성화되지 않았으면 무시
      if (!touchStartRef.current.isActive) {
        return;
      }
      
      // 터치 이동 핸들러와 동일한 로직
      const rawDeltaX = event.clientX - touchStartRef.current.x;
      const rawDeltaY = event.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY);

      // 이동이 감지되면 hasMoved 플래그 설정
      if (distance > 3) {
        touchStartRef.current.hasMoved = true;
      }

      if (distance > clickThreshold) {
        if (!touchStartRef.current.isRotating) {
          touchStartRef.current.isRotating = true;
          setIsRotating(true);
          console.log('🔄 [QRScannerWebRTC] Rotation started (mouse)');
          // 회전 시작 시 이전 delta 초기화
          lastDeltaRef.current = { x: 0, y: 0 };
        }

        // 부드러운 회전을 위한 delta smoothing (터치와 동일)
        const smoothingFactor = 0.3;
        const smoothedDeltaX = rawDeltaX * (1 - smoothingFactor) + lastDeltaRef.current.x * smoothingFactor;
        const smoothedDeltaY = rawDeltaY * (1 - smoothingFactor) + lastDeltaRef.current.y * smoothingFactor;

        const block = blocksRef.current[0];
        if (block) {
          block.rotation.y += smoothedDeltaX * rotationSensitivity;
          block.rotation.x += smoothedDeltaY * rotationSensitivity;
          block.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, block.rotation.x));
        }

        // 이전 delta 값 저장
        lastDeltaRef.current = { x: smoothedDeltaX, y: smoothedDeltaY };

        touchStartRef.current.x = event.clientX;
        touchStartRef.current.y = event.clientY;
      } else {
        // 작은 이동도 시작점 업데이트
        touchStartRef.current.x = event.clientX;
        touchStartRef.current.y = event.clientY;
        // 작은 이동 시 delta 초기화
        lastDeltaRef.current = { x: 0, y: 0 };
      }
    };

    /**
     * 마우스 업 핸들러 (데스크톱)
     * 
     * @param {MouseEvent} event - 마우스 이벤트
     * 
     * 터치 종료 핸들러와 동일한 로직을 사용합니다.
     */
    const handleMouseUp = (event) => {
      const wasClick = !touchStartRef.current.hasMoved && !touchStartRef.current.isRotating;
      console.log('🖱️ [QRScannerWebRTC] Mouse up:', { 
        wasClick, 
        hasMoved: touchStartRef.current.hasMoved, 
        isRotating: touchStartRef.current.isRotating 
      });
      
      // 회전 상태 초기화
      touchStartRef.current = { x: 0, y: 0, isRotating: false, hasMoved: false, isActive: false };
      lastDeltaRef.current = { x: 0, y: 0 };
      setIsRotating(false);
      
      // 드래그였으면 클릭 이벤트 방지
      if (!wasClick && event) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    /**
     * 이벤트 리스너 등록
     * 
     * 터치 이벤트와 마우스 이벤트를 모두 등록하여
     * 모바일과 데스크톱 모두에서 블록 회전이 가능하도록 합니다.
     * 
     * passive: false
     * - preventDefault()를 사용할 수 있도록 설정
     * - 스크롤, 줌 등 기본 동작을 방지하기 위해 필요
     */
    
    // 터치 이벤트 리스너 추가 (모바일)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // 마우스 이벤트 리스너 추가 (데스크톱)
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);  // 마우스가 캔버스 밖으로 나갈 때도 처리

    console.log('🔄 [QRScannerWebRTC] Rotation touch listeners added');

    /**
     * Cleanup 함수
     * 
     * 컴포넌트가 언마운트되거나 qrScanned가 false가 되면
     * 모든 이벤트 리스너를 제거합니다.
     * 
     * 메모리 누수 방지:
     * - 이벤트 리스너를 제거하지 않으면 메모리 누수가 발생할 수 있습니다.
     * - useEffect의 cleanup 함수에서 반드시 제거해야 합니다.
     */
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      console.log('🔄 [QRScannerWebRTC] Rotation touch listeners removed');
    };
  }, [qrScanned, rotationSensitivity, clickThreshold]); // blocksRef는 ref이므로 dependency에 포함하지 않음

  // 클릭 이벤트 리스너 관리 (별도 useEffect로 분리)
  useEffect(() => {
    // QR 스캔 후에도 클릭 가능하도록 isScanning 또는 qrScanned 조건 추가
    if ((!isScanning && !qrScanned) || !arCanvasRef.current || !raycasterRef.current || !cameraRef.current || !sceneRef.current) {
      return;
    }

    const handleClick = (event) => {
      // 회전 중이거나 이동이 있었으면 클릭 이벤트 무시
      if (touchStartRef.current.isRotating || touchStartRef.current.hasMoved) {
        console.log('🔄 [QRScannerWebRTC] Ignoring click - was rotation/drag');
        return;
      }

      console.log('🖱️ [QRScannerWebRTC] Canvas clicked/touched in useEffect!', event.type);
      
      // touchstart에서는 클릭 처리하지 않음 (touchend에서만 처리)
      if (event.type === 'touchstart') {
        console.log('🔄 [QRScannerWebRTC] Ignoring touchstart - waiting for touchend');
        return;
      }
      
      // 모바일 터치 이벤트의 기본 동작 방지 (스크롤, 줌 등)
      if (event.type === 'touchend') {
        event.preventDefault();
        event.stopPropagation();
      }
      
      if (!arCanvasRef.current || !cameraRef.current || !sceneRef.current || !raycasterRef.current) {
        return;
      }

      const canvas = arCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      
      // 터치 이벤트와 마우스 이벤트 모두 처리
      let clientX, clientY;
      if (event.touches && event.touches.length > 0) {
        // touchstart 이벤트
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if (event.changedTouches && event.changedTouches.length > 0) {
        // touchend 이벤트
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else {
        // 마우스 이벤트
        clientX = event.clientX;
        clientY = event.clientY;
      }
      
      const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;
      
      console.log('🖱️ [QRScannerWebRTC] Touch/Click coordinates:', {
        clientX, clientY,
        mouseX, mouseY,
        canvasRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      });
      
      mouseRef.current.set(mouseX, mouseY);
      
      // Raycaster 설정 - 터치 영역 확대를 위해 threshold 증가
      if (raycasterRef.current.params.Points) {
        raycasterRef.current.params.Points.threshold = 1.0;
      }
      if (raycasterRef.current.params.Line) {
        raycasterRef.current.params.Line.threshold = 1.0;
      }
      
      // 모든 블록 객체 가져오기 (자식 mesh 포함)
      const allObjects = [];
      sceneRef.current.children.forEach(child => {
        if (child.userData && child.userData.isQRBlock) {
          allObjects.push(child);
          // 모든 자식 mesh도 포함
          child.traverse((obj) => {
            if (obj.isMesh) {
              allObjects.push(obj);
            }
          });
        }
      });
      
      // 블록이 없으면 전체 scene의 children 사용
      const targetObjects = allObjects.length > 0 ? allObjects : sceneRef.current.children;
      
      console.log('🎯 [QRScannerWebRTC] Raycasting against objects:', {
        totalObjects: targetObjects.length,
        qrBlocks: allObjects.length,
        blockIds: allObjects.map(obj => obj.userData?.blockId || 'unknown')
      });
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(targetObjects, true);
      
      console.log('🖱️ [QRScannerWebRTC] Raycast results:', {
        totalObjects: allObjects.length,
        intersects: intersects.length,
        intersectsDetails: intersects.map(i => ({
          object: i.object.userData,
          distance: i.distance,
          point: i.point
        }))
      });
      
      if (intersects.length > 0) {
        let clickableObject = intersects[0].object;
        let depth = 0;
        
        // 부모를 따라 올라가며 clickable 객체 찾기
        while (clickableObject && !clickableObject.userData.clickable && depth < 10) {
          clickableObject = clickableObject.parent;
          depth++;
        }
        
        console.log('🖱️ [QRScannerWebRTC] Found clickable object:', {
          clickable: !!clickableObject,
          isQRBlock: clickableObject?.userData?.isQRBlock,
          depth,
          userData: clickableObject?.userData
        });
        
        if (clickableObject && clickableObject.userData.clickable && clickableObject.userData.isQRBlock) {
          console.log('✅ [QRScannerWebRTC] QR Block clicked! (Click disabled - use Catch button instead)', clickableObject);
          
          // 블록 클릭 시 모달 표시하지 않음 - 캐치 버튼으로만 수집 처리
          // 클릭은 무시하고 캐치 버튼 사용 안내만 표시 (선택사항)
        } else {
          console.warn('⚠️ [QRScannerWebRTC] Clicked object is not a QR block:', clickableObject);
        }
      } else {
        console.warn('⚠️ [QRScannerWebRTC] No intersects found. Block positions:', 
          blocksRef.current.map(b => ({
            position: b.position,
            scale: b.scale,
            userData: b.userData
          }))
        );
      }
    };

    const canvas = arCanvasRef.current;
    
    // 클릭 및 터치 이벤트 처리 (모바일 지원)
    // touchstart는 제외하고 touchend와 click만 처리 (드래그와 클릭 구분을 위해)
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchend', handleClick, { passive: false });
    console.log('🖱️ [QRScannerWebRTC] Click and touch listeners added in useEffect');

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchend', handleClick);
      console.log('🖱️ [QRScannerWebRTC] Click and touch listeners removed');
    };
  }, [isScanning, qrScanned, scannedData, onScan]);

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
  }, [isInitialized, startQRScanner]); // eslint-disable-line react-hooks/exhaustive-deps

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      safeCleanup();
    };
  }, [safeCleanup]);

  const handleClose = () => {
    safeCleanup();
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setIsInitialized(false);
    startQRScanner();
  };

  // 캐치 버튼 핸들러
  const handleCatchButton = () => {
    if (scannedData) {
      onScan(scannedData);
      setShowSuccessModal(true);
    }
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
              zIndex: 1,
              maxHeight: '100vh', // 화면 높이를 넘지 않도록
              display: 'flex',
              flexDirection: 'column'
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
                color: '#0f1224',
                maxHeight: 'calc(100vh - 200px)', // 모달 헤더와 푸터 공간 확보
                overflowY: 'auto', // 내용이 길면 스크롤 가능
                overflowX: 'hidden'
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
                  {/* QR 스캐너 컨테이너 - QR 스캔 완료 시 카메라 영역 숨김 */}
                  <div 
                    id="qr-reader-webrtc"
                    className="mb-3"
                    style={{ 
                      minHeight: '300px',
                      backgroundColor: qrScanned ? 'transparent' : '#f8f9fa',
                      border: qrScanned ? 'none' : '2px dashed #dee2e6',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      width: '100%',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Three.js AR 애니메이션 Canvas (오버레이) - 항상 렌더링 */}
                    <canvas
                      ref={arCanvasRef}
                      id="ar-animation-canvas"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 1000,  // 매우 높은 z-index
                        pointerEvents: 'auto',  // 터치 및 클릭 이벤트 활성화
                        backgroundColor: 'transparent', // 투명 배경
                        touchAction: 'none' // 모바일 기본 터치 동작 방지 (스크롤, 줌 등)
                      }}
                    />
                    {/* html5-qrcode가 생성한 요소들의 z-index 조정 및 QR 스캔 완료 시 카메라 숨김 */}
                    <style>{`
                      #qr-reader-webrtc video {
                        position: relative !important;
                        z-index: 1 !important;
                        ${qrScanned ? 'display: none !important;' : ''}
                      }
                      #qr-reader-webrtc #qr-shaded-region {
                        z-index: 2 !important;
                        ${qrScanned ? 'display: none !important;' : ''}
                      }
                      #qr-reader-webrtc #qr-reader__dashboard {
                        ${qrScanned ? 'display: none !important;' : ''}
                      }
                      #qr-reader-webrtc #ar-animation-canvas {
                        position: absolute !important;
                        z-index: 1000 !important;
                        pointer-events: auto !important; /* 클릭 이벤트 활성화 */
                        background-color: transparent !important; /* 투명 배경 */
                      }
                    `}</style>
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
                    
                    {/* 텍스트 안내문 - AR 카메라 화면 하단 (QR 스캔 완료 전에만 표시) */}
                    {isScanning && cameraPermission === 'granted' && !qrScanned && (
                      <div 
                        className="qr-scanner-guide"
                        style={{
                          position: 'absolute',
                          bottom: '20px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          zIndex: 1001,
                          pointerEvents: 'none',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Scan a QR code to discover blocks
                      </div>
                    )}
                    
                  </div>
                </>
              )}
            </div>
            <div 
              className="modal-footer qr-scanner-modal-footer" 
              style={{ 
                backgroundColor: '#ffffff', 
                borderTop: '1px solid #dee2e6', 
                opacity: 1,
                borderRadius: '0 0 16px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexShrink: 0, // 푸터가 축소되지 않도록
                position: 'sticky', // 스크롤 시에도 하단에 고정
                bottom: 0,
                zIndex: 10
              }}
            >
              {/* 캐치 버튼 - QR 스캔 완료 후 블록이 표시될 때만 표시 */}
              {/* 블록 로드 에러 알림 */}
              {blockLoadError && (
                <div className="alert alert-warning alert-dismissible fade show mb-3" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>블록 모델 파일을 찾을 수 없습니다:</strong>
                  <div className="small mt-1">
                    블록: <code>{blockLoadError.blockName || blockLoadError.blockId}</code>
                    <br />
                    파일 경로: <code>{blockLoadError.gltfPath}</code>
                    <br />
                    <span className="text-muted">GLTF 파일이 없어 기본 블록이 표시됩니다.</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setBlockLoadError(null)}
                    aria-label="Close"
                  ></button>
                </div>
              )}
              
              {qrScanned && blocksRef.current.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={handleCatchButton}
                  style={{ 
                    opacity: 1,
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
                    transition: 'all 0.3s ease',
                    animation: 'pulse 2s infinite'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(40, 167, 69, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
                  }}
                >
                  <i className="bi bi-hand-index-thumb-fill me-2"></i>
                  Catch Block
                </button>
              )}
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
      
      {/* CSS 애니메이션 스타일 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
        .catch-button-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
      
      {/* QR 스캔 성공 모달 */}
      {showSuccessModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Block Collected Successfully!
                </h5>
              </div>
              <div className="modal-body text-center">
                <div className="mb-3">
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
                </div>
                {(() => {
                  try {
                    const parsedData = JSON.parse(scannedData);
                    const blockId = parsedData.block || 'Unknown Block';
                    // 블록 정보 가져오기
                    const blockInfo = blocksDataRef.current.find(b => b.id === blockId);
                    const blockName = blockInfo ? blockInfo.name : blockId;
                    
                    return (
                      <>
                        <h4 className="mb-3 fw-bold text-success">
                          Block Collected Successfully!
                        </h4>
                        <div className="alert alert-success border-0" style={{ backgroundColor: '#d4edda' }}>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            
                            <div>
                              <div className="fw-bold">{blockName}</div>
                              <div className="small text-muted mt-1">
                                You can now use this block in Studio!
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  } catch (err) {
                    return (
                      <>
                        <h4 className="mb-3 fw-bold text-success">
                          Block Collected Successfully! 🎉
                        </h4>
                        <div className="alert alert-success border-0" style={{ backgroundColor: '#d4edda' }}>
                          <div className="small">
                            You can now use this block in Studio!
                          </div>
                        </div>
                      </>
                    );
                  }
                })()}
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
