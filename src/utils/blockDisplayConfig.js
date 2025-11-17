/**
 * 블록별 AR 표시 설정 관리 유틸리티
 * 
 * 각 블록의 크기, 위치, 회전 등 AR 카메라에서의 표시 설정을 관리합니다.
 * 설정은 JSON 파일에서 로드하며, 나중에 Firestore로 확장 가능합니다.
 */

import blockDisplayConfigs from '../config/blockDisplayConfigs.json';
import * as THREE from 'three';

/**
 * 기본 설정값
 */
const DEFAULT_CONFIG = {
  scale: 5,
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
export const getBlockDisplayConfig = (blockId) => {
  const config = blockDisplayConfigs[blockId];
  
  if (!config) {
    console.warn(`⚠️ [blockDisplayConfig] No config found for block: ${blockId}, using defaults`);
    return DEFAULT_CONFIG;
  }
  
  return {
    ...DEFAULT_CONFIG,
    ...config,
    position: { ...DEFAULT_CONFIG.position, ...(config.position || {}) },
    rotation: { ...DEFAULT_CONFIG.rotation, ...(config.rotation || {}) },
    centerOffset: { ...DEFAULT_CONFIG.centerOffset, ...(config.centerOffset || {}) }
  };
};

/**
 * Three.js 모델에 설정 적용
 * @param {THREE.Object3D} model - Three.js 모델 객체
 * @param {string} blockId - 블록 ID
 */
export const applyBlockDisplayConfig = (model, blockId) => {
  const config = getBlockDisplayConfig(blockId);
  
  // 크기 설정
  model.scale.set(config.scale, config.scale, config.scale);
  
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
      config: config
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

