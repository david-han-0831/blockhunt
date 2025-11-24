/**
 * 블록별 AR 표시 설정 관리 유틸리티
 * 
 * 각 블록의 크기, 위치, 회전 등 AR 카메라에서의 표시 설정을 관리합니다.
 * 설정은 JSON 파일에서 로드하며, 나중에 Firestore로 확장 가능합니다.
 */

import blockDisplayConfigs from '../config/blockDisplayConfigs.json';
import * as THREE from 'three';

// JSON 파일 로드 확인
console.log('📦 [blockDisplayConfig] Config file loaded:', {
  totalBlocks: Object.keys(blockDisplayConfigs).length,
  blockIds: Object.keys(blockDisplayConfigs),
  sampleConfig: blockDisplayConfigs[Object.keys(blockDisplayConfigs)[0]]
});

/**
 * 기본 설정값
 */
const DEFAULT_CONFIG = {
  scale: 7, // 기본 크기를 7로 증가 (이전: 5)
  position: { x: 0, y: 0, z: -1.5 },
  rotation: { x: 0, y: 0, z: 0 },
  centerOffset: { x: 0, y: 0, z: 0 },
  autoCenter: true
};

/**
 * 블록 ID에서 GLTF 파일명 추출
 * @param {string} blockId - 블록 ID (예: "controls_if")
 * @returns {string} GLTF 파일 경로
 */
export const getBlockGLTFPath = (blockId) => {
  return `/block_gltf/${blockId}.gltf`;
};

/**
 * 블록의 AR 표시 설정 가져오기
 * @param {string} blockId - 블록 ID
 * @returns {Object} 블록 표시 설정
 */
// 디버깅 정보를 저장할 전역 변수 (화면 표시용)
let debugConfigInfo = null;

export const getBlockDisplayConfig = (blockId, setDebugInfoCallback = null) => {
  console.log(`🔍 [blockDisplayConfig] Getting config for blockId: "${blockId}"`);
  console.log(`🔍 [blockDisplayConfig] Available keys in config:`, Object.keys(blockDisplayConfigs));
  
  const config = blockDisplayConfigs[blockId];
  
  if (!config) {
    console.warn(`⚠️ [blockDisplayConfig] No config found for block: "${blockId}", using defaults`);
    console.warn(`⚠️ [blockDisplayConfig] Available block IDs:`, Object.keys(blockDisplayConfigs));
    debugConfigInfo = {
      blockId,
      found: false,
      availableKeys: Object.keys(blockDisplayConfigs),
      config: DEFAULT_CONFIG
    };
    if (setDebugInfoCallback) {
      setDebugInfoCallback(prev => ({ ...prev, configInfo: debugConfigInfo }));
    }
    return DEFAULT_CONFIG;
  }
  
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    position: { ...DEFAULT_CONFIG.position, ...(config.position || {}) },
    rotation: { ...DEFAULT_CONFIG.rotation, ...(config.rotation || {}) },
    centerOffset: { ...DEFAULT_CONFIG.centerOffset, ...(config.centerOffset || {}) }
  };
  
  debugConfigInfo = {
    blockId,
    found: true,
    config: finalConfig,
    rawConfig: config
  };
  
  if (setDebugInfoCallback) {
    setDebugInfoCallback(prev => ({ ...prev, configInfo: debugConfigInfo }));
  }
  
  console.log(`✅ [blockDisplayConfig] Config loaded for "${blockId}":`, {
    scale: finalConfig.scale,
    position: finalConfig.position,
    rotation: finalConfig.rotation,
    autoCenter: finalConfig.autoCenter
  });
  
  return finalConfig;
};

/**
 * Three.js 모델에 설정 적용
 * @param {THREE.Object3D} model - Three.js 모델 객체
 * @param {string} blockId - 블록 ID
 */
export const applyBlockDisplayConfig = (model, blockId, setDebugInfoCallback = null) => {
  const config = getBlockDisplayConfig(blockId, setDebugInfoCallback);
  
  console.log(`🎨 [blockDisplayConfig] Applying config to model for "${blockId}":`, {
    scale: config.scale,
    configType: typeof config.scale,
    configValue: config.scale
  });
  
  // 크기 설정
  const scaleValue = config.scale || DEFAULT_CONFIG.scale;
  console.log(`📏 [blockDisplayConfig] Setting scale to: ${scaleValue} (type: ${typeof scaleValue})`);
  model.scale.set(scaleValue, scaleValue, scaleValue);
  
  // 원래 scale 값을 userData에 저장 (애니메이션에서 사용하기 위해)
  model.userData.baseScale = scaleValue;
  
  console.log(`✅ [blockDisplayConfig] Model scale after setting:`, {
    x: model.scale.x,
    y: model.scale.y,
    z: model.scale.z,
    baseScale: model.userData.baseScale
  });
  
  // 회전 설정
  model.rotation.set(
    config.rotation.x,
    config.rotation.y,
    config.rotation.z
  );
  
  // 위치 설정 (자동 중앙 정렬이 활성화된 경우 바운딩 박스 계산 후 적용)
  if (config.autoCenter) {
    // 바운딩 박스 계산
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // 중심점을 기준으로 위치 조정
    const offsetX = -center.x + config.centerOffset.x;
    const offsetY = -center.y + config.centerOffset.y;
    const offsetZ = config.position.z - center.z + config.centerOffset.z;
    
    model.position.set(offsetX, offsetY, offsetZ);
    
    console.log(`📍 [blockDisplayConfig] Auto-centered ${blockId}:`, {
      boundingBox: { min: box.min, max: box.max },
      center: center,
      finalPosition: model.position,
      config: config,
      baseScale: config.scale
    });
  } else {
    // 수동 위치 설정
    model.position.set(
      config.position.x,
      config.position.y,
      config.position.z
    );
  }
  
  return config;
};

/**
 * 블록 설정 업데이트 (개발/테스트용)
 * 콘솔에서 사용할 수 있는 헬퍼 함수
 * @param {string} blockId - 블록 ID
 * @param {Object} updates - 업데이트할 설정
 */
export const updateBlockConfig = (blockId, updates) => {
  if (!blockDisplayConfigs[blockId]) {
    blockDisplayConfigs[blockId] = { ...DEFAULT_CONFIG };
  }
  
  blockDisplayConfigs[blockId] = {
    ...blockDisplayConfigs[blockId],
    ...updates,
    position: { ...blockDisplayConfigs[blockId].position, ...(updates.position || {}) },
    rotation: { ...blockDisplayConfigs[blockId].rotation, ...(updates.rotation || {}) },
    centerOffset: { ...blockDisplayConfigs[blockId].centerOffset, ...(updates.centerOffset || {}) }
  };
  
  console.log(`✅ [blockDisplayConfig] Updated config for ${blockId}:`, blockDisplayConfigs[blockId]);
  return blockDisplayConfigs[blockId];
};

/**
 * 현재 설정을 JSON으로 출력 (복사해서 파일에 붙여넣기용)
 * @param {string} blockId - 블록 ID
 */
export const exportBlockConfig = (blockId) => {
  const config = getBlockDisplayConfig(blockId);
  const json = JSON.stringify({ [blockId]: config }, null, 2);
  console.log(`📋 [blockDisplayConfig] Config for ${blockId}:`);
  console.log(json);
  return json;
};

