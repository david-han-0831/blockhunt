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
// 디버깅 정보를 저장할 전역 변수 (화면 표시용)
let debugConfigInfo = null;

export const getBlockDisplayConfig = (blockId, setDebugInfoCallback = null) => {
  const config = blockDisplayConfigs[blockId];
  
  if (!config) {
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
  
  return finalConfig;
};

/**
 * Three.js 모델에 설정 적용
 * 
 * 이 함수는 블록별 설정(크기, 위치, 회전)을 Three.js 모델에 적용합니다.
 * 
 * @param {THREE.Object3D} model - Three.js 모델 객체 (GLTF에서 로드된 모델)
 * @param {string} blockId - 블록 ID (예: "controls_if")
 * @param {Function} setDebugInfoCallback - 디버깅 정보 업데이트 콜백 (선택)
 * 
 * @returns {Object} 적용된 설정 객체
 * 
 * 동작 과정:
 * 1. 블록별 설정 가져오기 (JSON 파일에서)
 * 2. 크기 설정 (scale)
 * 3. 회전 설정 (rotation)
 * 4. 위치 설정 (position)
 *    - autoCenter가 true면 바운딩 박스를 계산하여 중앙 정렬
 *    - autoCenter가 false면 설정된 위치 사용
 * 
 * 설정 파일 구조 (blockDisplayConfigs.json):
 * {
 *   "controls_if": {
 *     "scale": 20,
 *     "position": { "x": 0, "y": 0, "z": -1.5 },
 *     "rotation": { "x": 0, "y": 0, "z": 0 },
 *     "centerOffset": { "x": 0, "y": 0, "z": 0 },
 *     "autoCenter": true
 *   }
 * }
 * 
 * Three.js 좌표계:
 * - X축: 좌우 (오른쪽이 양수)
 * - Y축: 상하 (위가 양수)
 * - Z축: 앞뒤 (앞이 음수, 뒤가 양수)
 * 
 * 사용 예시:
 * const model = gltf.scene.clone();
 * applyBlockDisplayConfig(model, 'controls_if');
 * scene.add(model);
 */
export const applyBlockDisplayConfig = (model, blockId, setDebugInfoCallback = null) => {
  /**
   * 1단계: 블록별 설정 가져오기
   * 
   * getBlockDisplayConfig는 JSON 파일에서 블록별 설정을 가져옵니다.
   * 설정이 없으면 DEFAULT_CONFIG를 사용합니다.
   */
  const config = getBlockDisplayConfig(blockId, setDebugInfoCallback);
  
  /**
   * 2단계: 크기 설정
   * 
   * scale은 모델의 크기를 조절합니다.
   * scale.set(x, y, z)는 각 축의 크기를 설정합니다.
   * 동일한 값으로 설정하면 균등하게 확대/축소됩니다.
   * 
   * 예시:
   * - scale.set(20, 20, 20): 모든 축을 20배 확대
   * - scale.set(1, 1, 1): 원래 크기
   * - scale.set(0.5, 0.5, 0.5): 절반 크기
   */
  const scaleValue = config.scale || DEFAULT_CONFIG.scale;
  model.scale.set(scaleValue, scaleValue, scaleValue);
  
  /**
   * 원래 scale 값을 userData에 저장
   * 
   * 애니메이션에서 사용하기 위해 baseScale을 저장합니다.
   * 펄스 효과 등에서 원래 크기를 기준으로 변화를 적용할 수 있습니다.
   */
  model.userData.baseScale = scaleValue;
  
  /**
   * 3단계: 회전 설정
   * 
   * rotation.set(x, y, z)는 각 축의 회전을 라디안 단위로 설정합니다.
   * 
   * 라디안 변환:
   * - Math.PI = 180도
   * - Math.PI / 2 = 90도
   * - Math.PI / 4 = 45도
   * 
   * 회전 방향:
   * - 양수: 시계 방향 (오른손 법칙)
   * - 음수: 반시계 방향
   * 
   * 예시:
   * - rotation.set(0, Math.PI / 2, 0): Y축으로 90도 회전
   * - rotation.set(Math.PI / 4, 0, 0): X축으로 45도 회전
   */
  model.rotation.set(
    config.rotation.x,
    config.rotation.y,
    config.rotation.z
  );
  
  /**
   * 4단계: 위치 설정
   * 
   * autoCenter 옵션에 따라 위치 설정 방법이 달라집니다.
   * 
   * autoCenter = true:
   * - 바운딩 박스를 계산하여 모델을 중앙에 배치
   * - 각 블록의 모양이 다르므로 자동 중앙 정렬이 유용
   * 
   * autoCenter = false:
   * - 설정된 위치를 그대로 사용
   * - 정확한 위치 제어가 필요한 경우 사용
   */
  if (config.autoCenter) {
    /**
     * 자동 중앙 정렬
     * 
     * 바운딩 박스는 모델의 경계를 나타내는 상자입니다.
     * Box3().setFromObject()는 모델의 모든 정점을 포함하는 최소 상자를 계산합니다.
     * 
     * 동작 과정:
     * 1. 바운딩 박스 계산
     * 2. 바운딩 박스의 중심점 계산
     * 3. 모델의 중심을 (0, 0, 0)으로 이동
     * 4. 설정된 위치로 이동
     * 5. centerOffset 적용 (미세 조정)
     */
    const box = new THREE.Box3().setFromObject(model);  // 바운딩 박스 계산
    const center = new THREE.Vector3();
    box.getCenter(center);  // 바운딩 박스의 중심점 계산
    
    /**
     * 중심점을 기준으로 위치 조정
     * 
     * 계산 과정:
     * 1. 모델의 중심을 (0, 0, 0)으로 이동: -center.x, -center.y, -center.z
     * 2. 설정된 위치로 이동: config.position.z
     * 3. 미세 조정: config.centerOffset
     * 
     * 예시:
     * - 모델 중심이 (0.5, 0.3, 0.2)이고
     * - config.position.z가 -1.5이고
     * - config.centerOffset이 (0, 0, 0)이면
     * - 최종 위치는 (-0.5, -0.3, -1.5 - 0.2) = (-0.5, -0.3, -1.7)
     */
    const offsetX = -center.x + config.centerOffset.x;
    const offsetY = -center.y + config.centerOffset.y;
    const offsetZ = config.position.z - center.z + config.centerOffset.z;
    
    model.position.set(offsetX, offsetY, offsetZ);
    
  } else {
    /**
     * 수동 위치 설정
     * 
     * 설정된 위치를 그대로 사용합니다.
     * 정확한 위치 제어가 필요한 경우 사용합니다.
     */
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
  
  return blockDisplayConfigs[blockId];
};

/**
 * 현재 설정을 JSON으로 출력 (복사해서 파일에 붙여넣기용)
 * @param {string} blockId - 블록 ID
 */
export const exportBlockConfig = (blockId) => {
  const config = getBlockDisplayConfig(blockId);
  const json = JSON.stringify({ [blockId]: config }, null, 2);
  return json;
};

