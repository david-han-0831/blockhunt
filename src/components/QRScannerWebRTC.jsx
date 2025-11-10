import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import * as THREE from 'three';
import { getBlocks } from '../firebase/firestore';

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
  }, [availableCameras, currentCameraIndex, isSwitchingCamera, stopQRScanner, stopCamera, onScan]);

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

        console.log('✅ [QRScannerWebRTC] Renderer created:', { width, height });

      // Firebase에서 가져온 블록 데이터로 3D 객체 생성 (하나만 표시)
      const blocks = [];
      const blocksData = blocksDataRef.current;
      
      if (blocksData.length === 0) {
        console.warn('⚠️ [QRScannerWebRTC] No blocks data available, using default block');
        // 기본 블록 생성 (데이터가 없을 때)
        const geometry = new THREE.BoxGeometry(2.0, 0.7, 0.4); // 크기 축소
        const material = new THREE.MeshBasicMaterial({ 
          color: 0x5CA65C, // Logic 색상 (녹색)
          transparent: true,
          opacity: 0.9
        });
        const block = new THREE.Mesh(geometry, material);
        block.position.set(0, 0, -1.5);
        block.userData = {
          rotationSpeed: { x: 0, y: 0.01, z: 0 },
          floatSpeed: 0,
          initialY: block.position.y
        };
        scene.add(block);
        blocks.push(block);
      } else {
        // QR Required 블록만 필터링 (isDefaultBlock === false)
        const qrRequiredBlocks = blocksData.filter(block => block.isDefaultBlock === false);
        
        if (qrRequiredBlocks.length === 0) {
          console.warn('⚠️ [QRScannerWebRTC] No QR Required blocks available');
          // 기본 블록 생성
          const geometry = new THREE.BoxGeometry(2.0, 0.7, 0.4); // 크기 축소
          const material = new THREE.MeshBasicMaterial({ 
            color: 0x5CA65C,
            transparent: true,
            opacity: 0.9
          });
          const block = new THREE.Mesh(geometry, material);
          block.position.set(0, 0, -1.5);
          block.userData = {
            rotationSpeed: { x: 0, y: 0.01, z: 0 },
            floatSpeed: 0,
            initialY: block.position.y
          };
          scene.add(block);
          blocks.push(block);
        } else {
          // QR Required 블록들 표시 (모바일에서는 개수 제한)
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const maxBlocks = isMobile ? 8 : 16; // 모바일에서는 블록 개수 줄임 (성능 최적화)
          const displayBlocks = qrRequiredBlocks.slice(0, maxBlocks);
          
          // Blockly 카테고리 색상 매핑 (Studio.jsx와 동일)
          const categoryColors = {
            'Logic': 0x5CA65C,      // 녹색
            'Loops': 0xF59E0B,      // 주황
            'Math': 0x5C68A6,       // 파랑
            'Text': 0x8B5CF6,       // 보라
            'Lists': 0x06B6D4,      // 청록
            'Variables': 0x22C55E,  // 연두
            'Functions': 0x10B981   // 에메랄드
          };
          
          displayBlocks.forEach((blockData, index) => {
            const color = categoryColors[blockData.category] || 0x9CA3AF;
            
            // Blockly 블록 형태: 크기 축소 (2.0 x 0.7 x 0.4)
            const geometry = new THREE.BoxGeometry(2.0, 0.7, 0.4);
            const material = new THREE.MeshBasicMaterial({ 
              color: color,
              transparent: true,
              opacity: 0.95
            });
            
            // 블록 이름을 텍스처로 표시하기 위한 Canvas 생성 (크기 축소에 맞춰 조정)
            const canvas = document.createElement('canvas');
            canvas.width = 800; // 해상도 축소
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            // 배경 그리기
            ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 텍스트 그리기 (폰트 크기 축소)
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 60px Arial'; // 폰트 크기 축소
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(blockData.name, canvas.width / 2, canvas.height / 2);
            
            // 텍스처 생성 (앞면과 뒷면 모두 사용)
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // 앞면과 뒷면에 텍스처 적용
            const textMaterial = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0.95
            });
            
            // BoxGeometry 면 순서: 0=오른쪽, 1=왼쪽, 2=위, 3=아래, 4=앞, 5=뒤
            const materials = [
              material, // 오른쪽
              material, // 왼쪽
              material, // 위
              material, // 아래
              textMaterial, // 앞 (텍스트)
              textMaterial  // 뒤 (텍스트)
            ];
            
            const blockWithText = new THREE.Mesh(geometry, materials);
            
            // QR 스캔 영역(중앙 네모) 주변 상하좌우로 블록 분산 배치
            // 카메라 시야각을 고려한 화면 좌표 계산
            const cameraDistance = 3; // 카메라 z 위치
            const blockDistance = -2.0; // 블록이 위치할 z 거리 (카메라 앞)
            
            // 카메라 시야각(fov=75)을 고려한 화면 크기 계산
            const fov = 75;
            const fovRad = (fov * Math.PI) / 180;
            const visibleHeight = 2 * Math.tan(fovRad / 2) * Math.abs(blockDistance - cameraDistance);
            const visibleWidth = visibleHeight * aspect;
            
            // 화면을 4개 영역으로 나눔: 상, 하, 좌, 우
            const region = index % 4; // 0: 상, 1: 하, 2: 좌, 3: 우
            const positionInRegion = Math.floor(index / 4); // 해당 영역 내 위치
            
            let x, y;
            
            switch (region) {
              case 0: // 위쪽
                x = (Math.random() - 0.5) * visibleWidth * 0.8; // 중앙 좌우로 분산
                y = visibleHeight * 0.3 + Math.random() * visibleHeight * 0.2; // 위쪽 영역
                break;
              case 1: // 아래쪽
                x = (Math.random() - 0.5) * visibleWidth * 0.8;
                y = -visibleHeight * 0.3 - Math.random() * visibleHeight * 0.2; // 아래쪽 영역
                break;
              case 2: // 왼쪽
                x = -visibleWidth * 0.3 - Math.random() * visibleWidth * 0.2; // 왼쪽 영역
                y = (Math.random() - 0.5) * visibleHeight * 0.8; // 중앙 상하로 분산
                break;
              case 3: // 오른쪽
                x = visibleWidth * 0.3 + Math.random() * visibleWidth * 0.2; // 오른쪽 영역
                y = (Math.random() - 0.5) * visibleHeight * 0.8;
                break;
            }
            
            // 깊이도 다양하게
            const z = blockDistance + (Math.random() - 0.5) * 1.0;
            
            blockWithText.position.set(x, y, z);
            
            // 블록 데이터 저장
            blockWithText.userData = {
              blockId: blockData.id,
              blockName: blockData.name,
              category: blockData.category,
              rotationSpeed: { 
                x: (Math.random() - 0.5) * 0.005, 
                y: 0.01 + (Math.random() - 0.5) * 0.005, 
                z: (Math.random() - 0.5) * 0.005 
              },
              floatSpeed: 0,
              initialY: blockWithText.position.y
            };
            
            scene.add(blockWithText);
            blocks.push(blockWithText);
          });
          
          console.log(`✅ [QRScannerWebRTC] Created ${blocks.length} QR Required blocks from Firebase data`);
        }
      }
      
      blocksRef.current = blocks;

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
          // QR 스캔 전: 블록들이 천천히 회전하고 떠다니기
          blocks.forEach((block) => {
            block.rotation.x += block.userData.rotationSpeed.x;
            block.rotation.y += block.userData.rotationSpeed.y;
            block.rotation.z += block.userData.rotationSpeed.z;
            
            // 위아래로 부드럽게 떠다니는 효과
            block.position.y = block.userData.initialY + Math.sin(Date.now() * 0.001 + block.userData.blockId?.charCodeAt(0) || 0) * 0.3;
          });
        } else {
          // QR 스캔 후: 수집 완료 애니메이션 (빠른 회전 및 펄스)
          blocks.forEach((block) => {
            block.rotation.y += 0.1;
            block.rotation.x += 0.05;
            
            // 펄스 효과 (크기 변화)
            const scale = 1 + Math.sin(Date.now() * 0.01 + (block.userData.blockId?.charCodeAt(0) || 0)) * 0.2;
            block.scale.set(scale, scale, scale);
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
      
      // cleanup 시 isAnimating을 false로 설정할 수 있도록 저장
      // (cleanupThreeJS에서 사용할 수 있도록)
      
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
        (decodedText, result) => {
          console.log('✅ [QRScannerWebRTC] QR Code scanned:', decodedText);
          console.log('📍 [QRScannerWebRTC] QR Code result:', result);
          
          setIsScanning(false);
          setScannedData(decodedText);
          setQrScanned(true);  // AR 애니메이션 상태 변경
          
          // QR 코드 스캔 시 화면 중앙에 블록 표시
          if (sceneRef.current && cameraRef.current) {
            // 기존 블록들 제거
            const existingBlocks = sceneRef.current.children.filter(
              child => child.name === 'qrBlock'
            );
            existingBlocks.forEach(block => {
              sceneRef.current.remove(block);
              if (block.geometry) block.geometry.dispose();
              if (block.material) block.material.dispose();
            });
            
            // QR 코드 위치에 블록 생성 (화면 중앙 기준)
            const qrBlock = new THREE.Mesh(
              new THREE.BoxGeometry(0.3, 0.3, 0.3),
              new THREE.MeshBasicMaterial({ 
                color: 0xff6b6b,
                transparent: true,
                opacity: 0.9
              })
            );
            qrBlock.name = 'qrBlock';
            
            // 화면 중앙에 배치 (카메라 앞 1미터)
            qrBlock.position.set(0, 0.2, -1);
            sceneRef.current.add(qrBlock);
            
            // 애니메이션 효과
            let animationFrameId;
            const animateBlock = () => {
              if (qrBlock.parent) {
                qrBlock.rotation.y += 0.05;
                qrBlock.position.y = 0.2 + Math.sin(Date.now() * 0.005) * 0.1;
                animationFrameId = requestAnimationFrame(animateBlock);
              }
            };
            animateBlock();
            
            // 3초 후 애니메이션 정리
            setTimeout(() => {
              if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
              }
              if (qrBlock.parent) {
                sceneRef.current.remove(qrBlock);
                qrBlock.geometry.dispose();
                qrBlock.material.dispose();
              }
            }, 3000);
            
            console.log('✅ [QRScannerWebRTC] QR block displayed at center');
          }
          
          setShowSuccessModal(true);
          
          // 3초 후 애니메이션 리셋
          setTimeout(() => {
            setQrScanned(false);
          }, 3000);
          
          // 모달이 표시된 후 onScan 호출
          onScan(decodedText);
        },
        (error) => {
          // 스캔 실패는 정상적인 상황 (QR 코드가 없을 때)
          // 사용자에게 오류로 보이지 않도록 조용히 처리
          // 디버깅을 위해서만 콘솔에 기록 (verbose 모드)
          if (error && !error.includes('No QR code found') && !error.includes('NotFoundException')) {
            // NotFoundException 외의 실제 오류만 로그
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
          canvas.style.pointerEvents = 'none';
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
  }, [isInitialized]);

  // Three.js 초기화 (isScanning이 true일 때)
  useEffect(() => {
    if (!isScanning) {
      // isScanning이 false가 되면 cleanup
      cleanupThreeJS();
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
  }, [isScanning, initThreeJS, cleanupThreeJS]);

  // qrScanned 상태 변경 시 애니메이션 업데이트
  useEffect(() => {
    qrScannedRef.current = qrScanned;
  }, [qrScanned]);

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
                        pointerEvents: 'none',  // 터치 이벤트는 QR 스캐너로 전달
                        backgroundColor: 'transparent' // 투명 배경
                      }}
                    />
                    {/* html5-qrcode가 생성한 요소들의 z-index 조정 */}
                    <style>{`
                      #qr-reader-webrtc video {
                        position: relative !important;
                        z-index: 1 !important;
                      }
                      #qr-reader-webrtc #qr-shaded-region {
                        z-index: 2 !important;
                      }
                      #qr-reader-webrtc #ar-animation-canvas {
                        position: absolute !important;
                        z-index: 1000 !important;
                        pointer-events: none !important;
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
