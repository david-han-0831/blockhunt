# [DevLog] 블록별 AR 표시 설정 시스템 구축

## 📅 날짜
2025-11-17

## ✏️ 요약
- 블록별 크기, 위치, 회전 등 AR 카메라 표시 설정을 관리하는 시스템 구축
- JSON 기반 설정 파일(`blockDisplayConfigs.json`) 생성
- 설정 관리 유틸리티 함수(`blockDisplayConfig.js`) 작성
- QRScannerWebRTC 컴포넌트에 설정 시스템 통합
- 총 28개 블록 모두 테스트 및 최적 크기 설정 완료

## 🔍 상세 내용

### 🎯 배경 및 목적

각 블록 GLTF 파일의 크기와 형태가 다르기 때문에, AR 카메라에서 일관된 표시를 위해 블록별로 크기와 위치를 개별 설정해야 했습니다. 이를 효율적으로 관리하기 위한 설정 시스템을 구축했습니다.

### 🏗️ 구현 내용

#### 1. 설정 파일 구조 설계

**파일:** `src/config/blockDisplayConfigs.json`

각 블록별로 다음 설정을 저장:
- `scale`: 크기 배율 (1 = 원본 크기)
- `position`: 기본 위치 (x, y, z)
- `rotation`: 회전 각도 (x, y, z, 라디안)
- `centerOffset`: 자동 중앙 정렬 후 추가 오프셋
- `autoCenter`: 자동 중앙 정렬 활성화 여부

```json
{
  "controls_if": {
    "scale": 5,
    "position": { "x": 0, "y": 0, "z": -1.5 },
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "centerOffset": { "x": 0, "y": 0, "z": 0 },
    "autoCenter": true
  }
}
```

#### 2. 유틸리티 함수 작성

**파일:** `src/utils/blockDisplayConfig.js`

주요 함수:
- `getBlockGLTFPath(blockId)`: 블록 ID로 GLTF 파일 경로 반환
- `getBlockDisplayConfig(blockId)`: 블록 설정 가져오기 (기본값 포함)
- `applyBlockDisplayConfig(model, blockId)`: Three.js 모델에 설정 적용
- `updateBlockConfig(blockId, updates)`: 개발/테스트용 설정 업데이트
- `exportBlockConfig(blockId)`: 설정 JSON 출력

**핵심 기능:**
- 자동 중앙 정렬: 바운딩 박스 계산 후 모델 중심을 카메라 중앙에 맞춤
- 기본값 병합: 설정이 없는 블록은 기본값 사용
- 실시간 조정: 브라우저 콘솔에서 설정 테스트 가능

#### 3. QRScannerWebRTC 통합

**변경 파일:** `src/components/QRScannerWebRTC.jsx`

- 하드코딩된 블록 로딩 코드를 설정 시스템으로 교체
- `applyBlockDisplayConfig()` 함수로 모델 설정 자동 적용
- 블록 ID만 변경하면 다른 블록으로 쉽게 전환 가능

**변경 전:**
```javascript
model.scale.set(5, 5, 5);
model.position.set(0, 0, -1.5);
// 바운딩 박스 계산 및 중앙 정렬 코드...
```

**변경 후:**
```javascript
applyBlockDisplayConfig(model, blockId);
// 모든 설정이 자동으로 적용됨
```

### 📊 블록별 최종 설정 요약

총 28개 블록을 테스트하고 최적 크기를 설정했습니다:

| 블록 카테고리 | 블록 수 | 주요 크기 범위 |
|------------|--------|--------------|
| Controls | 6개 | scale 5-7 |
| Text | 5개 | scale 5-7 |
| Logic | 4개 | scale 5-6 |
| Math | 6개 | scale 5-6 |
| Lists | 7개 | scale 3-7 |

**특이사항:**
- `lists_indexOf`: scale 3 (가장 작음)
- `lists_repeat`: scale 3
- `lists_getIndex`: scale 4
- `controls_repeat_ext`, `controls_whileUntil`, `text_print`, `lists_create_with`: scale 7 (가장 큼)

### 🧪 테스트 프로세스

1. 각 블록을 순차적으로 테스트
2. 카메라에서 블록 크기 및 위치 확인
3. 필요시 크기 조정 (scale 값 변경)
4. 최종 설정을 JSON 파일에 저장

**테스트 방법:**
- 브라우저 콘솔에서 실시간 조정:
  ```javascript
  updateBlockConfig('blockId', { scale: 10 });
  exportBlockConfig('blockId');
  ```

### 📁 생성된 파일

1. `src/config/blockDisplayConfigs.json` - 블록별 설정 파일 (536줄)
2. `src/utils/blockDisplayConfig.js` - 설정 관리 유틸리티 (138줄)
3. `docs/block-display-config-guide.md` - 사용 가이드 문서

### 🔧 기술적 고려사항

#### 자동 중앙 정렬 구현

```javascript
if (config.autoCenter) {
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  
  const offsetX = -center.x + config.centerOffset.x;
  const offsetY = -center.y + config.centerOffset.y;
  const offsetZ = config.position.z - center.z + config.centerOffset.z;
  
  model.position.set(offsetX, offsetY, offsetZ);
}
```

- 바운딩 박스를 계산하여 모델의 실제 중심점 파악
- 중심점을 카메라 중앙(0, 0, -1.5)에 맞추도록 위치 조정
- `centerOffset`으로 미세 조정 가능

#### 확장 가능성

- 현재는 JSON 파일 기반이지만, Firestore 연동 가능하도록 설계
- 관리자 페이지에서 설정 수정 가능하도록 확장 가능
- 블록 추가 시 기본값으로 자동 생성

## 🙋 개선 및 회고

### ✅ 성과
- 28개 블록 모두 일관된 AR 표시 경험 제공
- 설정 관리 시스템으로 유지보수성 향상
- 실시간 테스트 및 조정 가능한 개발 환경 구축

### 🔄 향후 개선 사항
- Firestore 연동으로 동적 설정 관리
- 관리자 페이지에서 설정 수정 UI 추가
- 블록 크기 자동 추정 알고리즘 고려
- 설정 변경 이력 관리

### 💡 배운 점
- Three.js 바운딩 박스 계산을 통한 정확한 중앙 정렬
- JSON 기반 설정 관리의 유연성
- 개발 중 실시간 테스트 도구의 중요성

## 📌 관련 파일

- `src/config/blockDisplayConfigs.json`
- `src/utils/blockDisplayConfig.js`
- `src/components/QRScannerWebRTC.jsx`
- `docs/block-display-config-guide.md`

