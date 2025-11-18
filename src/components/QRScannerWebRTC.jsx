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
  const videoRef = useRef(null);
  const qrCodeRef = useRef(null);
  const arCanvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationIdRef = useRef(null);
  const blocksRef = useRef([]);
  const qrScannedRef = useRef(false);
  const blocksDataRef = useRef([]); // Firebase에서 가져온 블록 데이터
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
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

  // Three.js AR 애니메이션 초기화
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

    // video 요소가 로드될 때까지 기다리는 함수
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
        // Scene 생성 (투명 배경 - 블록만 표시)
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // 조명 추가 (GLTF 모델의 원래 색상이 보이도록)
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 환경광 (전체 밝기)
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 방향광 (그림자와 입체감)
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const aspect = width / height;

        // Camera 생성 (AR 오버레이용)
        const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        camera.position.z = 3;
        cameraRef.current = camera;

        // Renderer 생성 (투명 배경 - 카메라 피드가 보이도록)
        const renderer = new THREE.WebGLRenderer({
          canvas: arCanvasRef.current,
          alpha: true,  // 투명 배경 활성화
          antialias: true
        });
        
        // Canvas 크기를 video와 완전히 동일하게 설정
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
          arCanvasRef.current.style.zIndex = '1000';
          arCanvasRef.current.style.pointerEvents = 'none';
          arCanvasRef.current.style.backgroundColor = 'transparent';
          arCanvasRef.current.style.touchAction = 'none'; // 모바일 터치 기본 동작 방지
          
          console.log('🎨 [QRScannerWebRTC] Canvas size set to match video:', {
            width: arCanvasRef.current.width,
            height: arCanvasRef.current.height,
            styleWidth: arCanvasRef.current.style.width,
            styleHeight: arCanvasRef.current.style.height
          });
        }
        
        renderer.setSize(width, height);
        // 모바일에서는 성능을 위해 pixelRatio 제한
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;

        // Raycaster 초기화 (클릭 감지용)
        raycasterRef.current = new THREE.Raycaster();

        console.log('✅ [QRScannerWebRTC] Renderer created:', { width, height });

      // QR 스캔 전에는 블록을 표시하지 않음 (빈 배열로 초기화)
      blocksRef.current = [];

      // 애니메이션 루프
      let isAnimating = true; // 로컬 플래그로 애니메이션 상태 관리
      
      const animate = () => {
        // cleanup 체크
        if (!isAnimating || !animationIdRef.current) {
          console.log('🛑 [QRScannerWebRTC] Animation stopped');
          return;
        }
        
        const blocks = blocksRef.current;
        if (!blocks || blocks.length === 0) {
          console.warn('⚠️ [QRScannerWebRTC] No blocks to animate');
          animationIdRef.current = requestAnimationFrame(animate);
          return;
        }
        
        if (!qrScannedRef.current) {
          // QR 스캔 전: 블록 고정 (회전 애니메이션 없음)
          blocks.forEach((block) => {
            // 회전 및 위치 고정 - 애니메이션 없음
          });
        } else {
          // QR 스캔 후: 수집 완료 애니메이션 (펄스만)
          blocks.forEach((block) => {
            // 펄스 효과 (크기 변화) - 원래 scale 값을 기준으로 적용
            const baseScale = block.userData.baseScale || 20; // 기본값 20 (config에서 설정한 값)
            const pulseFactor = 1 + Math.sin(Date.now() * 0.01 + (block.userData.blockId?.charCodeAt(0) || 0)) * 0.2;
            const finalScale = baseScale * pulseFactor;
            block.scale.set(finalScale, finalScale, finalScale);
          });
        }
        
        if (rendererRef.current && cameraRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        // 다음 프레임 요청
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
            console.log('🖱️ [QRScannerWebRTC] QR Block clicked!', clickableObject);
            
            // QR 블록 클릭 시 수집 완료 처리
            if (scannedData) {
              // onScan 호출하여 수집 완료 처리
              onScan(scannedData);
              // 수집 완료 모달 표시
              setShowSuccessModal(true);
            }
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

  // 특정 카메라로 QR 스캐너 시작
  const startQRScannerWithCamera = useCallback(async (cameraId) => {
    try {
      console.log('🔍 [QRScannerWebRTC] Starting QR scanner with camera:', cameraId);
      setError(null);
      setIsScanning(true);

      // Canvas를 먼저 DOM에 추가 (html5-qrcode가 시작하기 전에)
      const container = document.getElementById('qr-reader-webrtc');
      if (container && arCanvasRef.current) {
        const existingCanvas = document.getElementById('ar-animation-canvas');
        if (!existingCanvas && arCanvasRef.current.parentNode !== container) {
          console.log('🔧 [QRScannerWebRTC] Adding Canvas to DOM before QR scanner starts...');
          container.appendChild(arCanvasRef.current);
        }
      }

      // Html5Qrcode 인스턴스 생성
      const qrCode = new Html5Qrcode('qr-reader-webrtc');
      qrCodeRef.current = qrCode;

      // 모바일 환경 감지
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // 카메라 시작
      const config = {
        fps: isMobile ? 5 : 10, // 모바일에서는 FPS 낮춤 (배터리 절약)
        qrbox: isMobile ? { width: 200, height: 200 } : { width: 250, height: 250 },
        aspectRatio: 1.0,
        // 모바일 환경에 최적화된 카메라 제약 조건
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: isMobile ? { ideal: 640, max: 1280 } : { ideal: 1280, max: 1920 },
          height: isMobile ? { ideal: 480, max: 720 } : { ideal: 720, max: 1080 }
        }
      };

      await qrCode.start(
        cameraId,
        config,
        async (decodedText, result) => {
          console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
          console.log('📍 [QRScannerWebRTC] QR Code result:', result);
          
          // 이미 스캔 완료된 경우 중복 처리 방지
          if (qrScannedRef.current) {
            console.log('⚠️ [QRScannerWebRTC] QR already scanned, ignoring duplicate scan');
            return;
          }
          
          // QR 스캔 완료 플래그 설정
          setScannedData(decodedText);
          setQrScanned(true);  // AR 애니메이션 상태 변경
          qrScannedRef.current = true; // ref도 업데이트
          
          // QR 스캔 완료 후 스캐너 중지 (카메라는 유지하되 스캔은 중지)
          try {
            if (qrCodeRef.current) {
              await qrCodeRef.current.stop();
              console.log('🛑 [QRScannerWebRTC] QR scanner stopped after successful scan');
            }
          } catch (err) {
            console.warn('⚠️ [QRScannerWebRTC] Error stopping QR scanner:', err);
          }
          
          // QR 데이터 파싱하여 블록 ID 추출
          let blockId = null;
          try {
            console.log('🔍 [QRScannerWebRTC] Parsing QR data:', decodedText);
            const qrPayload = JSON.parse(decodedText);
            console.log('✅ [QRScannerWebRTC] Parsed QR payload:', qrPayload);
            blockId = qrPayload.block;
            console.log('📦 [QRScannerWebRTC] Extracted blockId:', blockId, `(type: ${typeof blockId})`);
            
            if (!blockId) {
              console.error('❌ [QRScannerWebRTC] blockId is null or undefined in QR payload');
            }
          } catch (err) {
            console.error('❌ [QRScannerWebRTC] Failed to parse QR data:', err);
            console.error('❌ [QRScannerWebRTC] Raw decodedText:', decodedText);
            // QR 데이터 파싱 실패 시에도 기본 처리 진행
          }
          
          // QR 코드 스캔 시 화면 중앙에 실제 블록 GLTF 모델 표시
          // Three.js가 초기화되어 있는지 확인하고 블록 로드
          const loadBlockModel = () => {
            if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
              console.warn('⚠️ [QRScannerWebRTC] Three.js not initialized yet, retrying...');
              // Three.js 초기화를 기다림 (최대 2초)
              let retryCount = 0;
              const maxRetries = 20;
              const retryInterval = setInterval(() => {
                retryCount++;
                if (sceneRef.current && cameraRef.current && rendererRef.current && blockId) {
                  clearInterval(retryInterval);
                  loadBlockModelInternal(blockId);
                } else if (retryCount >= maxRetries) {
                  clearInterval(retryInterval);
                  console.error('❌ [QRScannerWebRTC] Three.js initialization timeout');
                }
              }, 100);
              return;
            }
            
            if (blockId) {
              loadBlockModelInternal(blockId);
            }
          };
          
          // 실제 블록 로드 함수
          const loadBlockModelInternal = (blockIdToLoad) => {
            if (!sceneRef.current || !cameraRef.current) {
              console.error('❌ [QRScannerWebRTC] Scene or camera not available');
              return;
            }
            
            // 이미 블록이 로드되어 있는지 확인 (중복 로드 방지)
            const existingBlocks = sceneRef.current.children.filter(
              child => child.userData.isQRBlock === true && child.userData.blockId === blockIdToLoad
            );
            
            if (existingBlocks.length > 0) {
              console.log('⚠️ [QRScannerWebRTC] Block already loaded, skipping duplicate load:', blockIdToLoad);
              return;
            }
            
            // 다른 블록들 제거 (같은 블록이 아닌 경우)
            const otherBlocks = sceneRef.current.children.filter(
              child => child.userData.isQRBlock === true && child.userData.blockId !== blockIdToLoad
            );
            otherBlocks.forEach(block => {
              sceneRef.current.remove(block);
              block.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              });
            });
            
            // 실제 블록 GLTF 모델 로드
            const gltfPath = getBlockGLTFPath(blockIdToLoad);
            const loader = new GLTFLoader();
            
            console.log(`📦 [QRScannerWebRTC] Loading ${blockIdToLoad}.gltf from ${gltfPath}...`);
            loader.load(
              gltfPath,
              (gltf) => {
                console.log(`✅ [QRScannerWebRTC] ${blockIdToLoad}.gltf loaded successfully`);
                const model = gltf.scene.clone(); // 클론하여 사용
                
                // userData 설정
                model.userData = {
                  clickable: true,
                  isQRBlock: true,
                  blockId: blockIdToLoad
                };
                
                // 머티리얼 설정 및 clickable 설정 (C4D Export 호환성)
                model.traverse((child) => {
                  if (child.isMesh) {
                    // 모든 mesh에 clickable 설정
                    child.userData.clickable = true;
                    child.userData.isQRBlock = true;
                    child.userData.blockId = blockIdToLoad;
                    
                    if (child.material) {
                      const materials = Array.isArray(child.material) ? child.material : [child.material];
                      materials.forEach((material) => {
                        if (material) {
                          material.side = THREE.DoubleSide;
                          material.needsUpdate = true;
                        }
                      });
                    }
                  }
                });
                
                // 블록별 설정 적용 (크기, 위치, 회전, 자동 중앙 정렬)
                applyBlockDisplayConfig(model, blockIdToLoad);
                
                // 블록의 bounding box 계산 및 로그 출력
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                console.log(`📦 [QRScannerWebRTC] Block ${blockIdToLoad} after applyBlockDisplayConfig:`, {
                  modelScale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
                  boundingBoxSize: { x: size.x, y: size.y, z: size.z },
                  center: { x: center.x, y: center.y, z: center.z },
                  position: { x: model.position.x, y: model.position.y, z: model.position.z }
                });
                
                sceneRef.current.add(model);
                blocksRef.current = [model];
                
                // Scene에 추가한 후 다시 확인
                const boxAfterAdd = new THREE.Box3().setFromObject(model);
                const sizeAfterAdd = boxAfterAdd.getSize(new THREE.Vector3());
                console.log(`✅ [QRScannerWebRTC] ${blockIdToLoad}.gltf model added to scene. Final scale:`, {
                  modelScale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
                  boundingBoxSize: { x: sizeAfterAdd.x, y: sizeAfterAdd.y, z: sizeAfterAdd.z }
                });
              },
              (progress) => {
                if (progress.total > 0) {
                  const percent = (progress.loaded / progress.total) * 100;
                  console.log(`📦 [QRScannerWebRTC] Loading progress: ${percent.toFixed(2)}%`);
                }
              },
              (error) => {
                console.error(`❌ [QRScannerWebRTC] Error loading ${blockIdToLoad}.gltf:`, error);
                // 에러 발생 시 기본 블록 생성
                if (sceneRef.current && cameraRef.current) {
                  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
                  const material = new THREE.MeshBasicMaterial({ 
                    color: 0x5CA65C,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                  });
                  const fallbackBlock = new THREE.Mesh(geometry, material);
                  fallbackBlock.position.set(0, 0.2, -1);
                  fallbackBlock.scale.set(2.5, 2.5, 2.5);
                  fallbackBlock.userData = {
                    clickable: true,
                    isQRBlock: true,
                    blockId: blockIdToLoad
                  };
                  sceneRef.current.add(fallbackBlock);
                  blocksRef.current = [fallbackBlock];
                  console.log('✅ [QRScannerWebRTC] Fallback block created');
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
  }, [onScan, safeCleanup]);

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

  // 클릭 이벤트 리스너 관리 (별도 useEffect로 분리)
  useEffect(() => {
    // QR 스캔 후에도 클릭 가능하도록 isScanning 또는 qrScanned 조건 추가
    if ((!isScanning && !qrScanned) || !arCanvasRef.current || !raycasterRef.current || !cameraRef.current || !sceneRef.current) {
      return;
    }

    const handleClick = (event) => {
      console.log('🖱️ [QRScannerWebRTC] Canvas clicked/touched in useEffect!', event.type);
      
      // 모바일 터치 이벤트의 기본 동작 방지 (스크롤, 줌 등)
      if (event.type === 'touchend' || event.type === 'touchstart') {
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
          console.log('✅ [QRScannerWebRTC] QR Block clicked!', clickableObject);
          
          // QR 블록 클릭 시 수집 완료 처리
          if (scannedData) {
            // onScan 호출하여 수집 완료 처리
            onScan(scannedData);
            // 수집 완료 모달 표시
            setShowSuccessModal(true);
          }
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
    
    // 클릭 및 터치 이벤트 모두 처리 (모바일 지원)
    // 모바일에서는 touchstart와 touchend 모두 처리
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleClick, { passive: false }); // passive: false로 preventDefault 허용
    canvas.addEventListener('touchend', handleClick, { passive: false });
    console.log('🖱️ [QRScannerWebRTC] Click and touch listeners added in useEffect');

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleClick);
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
                        pointerEvents: 'auto',  // 클릭 이벤트 활성화
                        backgroundColor: 'transparent' // 투명 배경
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
                          Block Collected Successfully! 🎉
                        </h4>
                        <div className="alert alert-success border-0" style={{ backgroundColor: '#d4edda' }}>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <i className="bi bi-puzzle-fill" style={{ fontSize: '1.5rem' }}></i>
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
