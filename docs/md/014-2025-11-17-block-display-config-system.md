# 블록별 AR 표시 설정 시스템 구축 완료 보고서

**작성일자:** 2025-11-17  
**작성자:** Cursor AI Assistant  
**상태:** 완료

---

## ✅ 작업 개요

블록별 크기와 형태가 다른 GLTF 파일들을 AR 카메라에서 일관되게 표시하기 위한 설정 관리 시스템을 구축하고, 총 28개 블록의 최적 표시 설정을 완료했습니다.

---

## 📝 주요 변경 사항

### 1. 설정 파일 생성

**파일:** `src/config/blockDisplayConfigs.json`

- 블록별 크기, 위치, 회전 설정을 JSON 형식으로 저장
- 총 28개 블록 설정 포함
- 각 블록의 최적 `scale` 값 설정 완료

**설정 구조:**
```json
{
  "blockId": {
    "scale": 5,
    "position": { "x": 0, "y": 0, "z": -1.5 },
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "centerOffset": { "x": 0, "y": 0, "z": 0 },
    "autoCenter": true
  }
}
```

### 2. 유틸리티 함수 작성

**파일:** `src/utils/blockDisplayConfig.js`

**주요 기능:**
- `getBlockGLTFPath(blockId)`: 블록 ID로 GLTF 파일 경로 반환
- `getBlockDisplayConfig(blockId)`: 블록 설정 가져오기
- `applyBlockDisplayConfig(model, blockId)`: Three.js 모델에 설정 적용
- `updateBlockConfig(blockId, updates)`: 실시간 설정 업데이트
- `exportBlockConfig(blockId)`: 설정 JSON 출력

**핵심 기능:**
- 자동 중앙 정렬: 바운딩 박스 계산 후 모델 중심을 카메라 중앙에 맞춤
- 기본값 병합: 설정이 없는 블록은 기본값 사용
- 실시간 조정: 브라우저 콘솔에서 설정 테스트 가능

### 3. QRScannerWebRTC 통합

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

---

## 📊 블록별 설정 요약

### Controls 블록 (6개)
- `controls_if`: scale 5
- `controls_flow_statements`: scale 5
- `controls_for`: scale 5
- `controls_forEach`: scale 6
- `controls_repeat_ext`: scale 7
- `controls_whileUntil`: scale 7

### Text 블록 (5개)
- `text`: scale 5
- `text_append`: scale 5
- `text_join`: scale 5
- `text_length`: scale 5
- `text_print`: scale 7

### Logic 블록 (4개)
- `logic_negate`: scale 6
- `logic_operation`: scale 5
- `logic_compare`: scale 5
- `logic_boolean`: scale 6

### Math 블록 (6개)
- `math_arithmetic`: scale 5
- `math_constant`: scale 6
- `math_modulo`: scale 5
- `math_number`: scale 5
- `math_single`: scale 5
- `math_trig`: scale 5

### Lists 블록 (7개)
- `lists_create_empty`: scale 5
- `lists_create_with`: scale 7
- `lists_getIndex`: scale 4
- `lists_indexOf`: scale 3
- `lists_isEmpty`: scale 5
- `lists_length`: scale 5
- `lists_repeat`: scale 3

**크기 범위:** scale 3 ~ 7

---

## 🔍 구현 세부사항

### 자동 중앙 정렬 알고리즘

```javascript
if (config.autoCenter) {
  // 바운딩 박스 계산
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  
  // 중심점을 카메라 중앙에 맞추기 위해 오프셋 계산
  const offsetX = -center.x + config.centerOffset.x;
  const offsetY = -center.y + config.centerOffset.y;
  const offsetZ = config.position.z - center.z + config.centerOffset.z;
  
  // 모델 위치 조정
  model.position.set(offsetX, offsetY, offsetZ);
}
```

**동작 원리:**
1. 모델의 바운딩 박스를 계산하여 실제 크기 파악
2. 바운딩 박스의 중심점 계산
3. 중심점을 카메라 중앙(0, 0, -1.5)에 맞추도록 위치 조정
4. `centerOffset`으로 미세 조정 가능

### 설정 우선순위

1. JSON 파일의 블록별 설정
2. 기본값(`DEFAULT_CONFIG`)
3. 설정이 없는 경우 기본값 사용

---

## 🧪 테스트 결과

### 테스트 프로세스
1. 각 블록을 순차적으로 카메라에서 확인
2. 크기 및 위치 조정
3. 최적값 찾기
4. JSON 파일에 저장

### 테스트 도구
브라우저 콘솔에서 실시간 조정:
```javascript
// 크기 조정
updateBlockConfig('controls_if', { scale: 10 });

// 위치 미세 조정
updateBlockConfig('controls_if', { 
  centerOffset: { x: 0.1, y: -0.2, z: 0 } 
});

// 최종 설정 복사
exportBlockConfig('controls_if');
```

---

## 📁 생성/수정된 파일

### 새로 생성된 파일
1. `src/config/blockDisplayConfigs.json` (536줄)
   - 28개 블록의 설정 저장
   
2. `src/utils/blockDisplayConfig.js` (138줄)
   - 설정 관리 유틸리티 함수
   
3. `docs/block-display-config-guide.md`
   - 사용 가이드 문서

### 수정된 파일
1. `src/components/QRScannerWebRTC.jsx`
   - 설정 시스템 통합
   - 하드코딩 제거

---

## 💡 기술적 고려사항

### 설계 원칙
1. **확장 가능성**: Firestore 연동 가능하도록 설계
2. **유지보수성**: JSON 파일로 쉽게 관리
3. **개발 편의성**: 실시간 테스트 도구 제공
4. **일관성**: 모든 블록에 동일한 설정 구조 적용

### 향후 확장 계획
- Firestore 연동으로 동적 설정 관리
- 관리자 페이지에서 설정 수정 UI 추가
- 블록 크기 자동 추정 알고리즘
- 설정 변경 이력 관리

---

## ✅ 완료 사항

- [x] 설정 파일 구조 설계
- [x] 유틸리티 함수 작성
- [x] QRScannerWebRTC 통합
- [x] 28개 블록 모두 테스트
- [x] 최적 크기 설정 완료
- [x] 사용 가이드 문서 작성

---

## 🔗 관련 링크

- [블록 표시 설정 가이드](../block-display-config-guide.md)
- [DevLog: 블록별 AR 표시 설정 시스템 구축](../devlog/2025-11-17-01-block-display-config-system.md)

---

## 📌 다음 단계

1. 다른 컴퓨터에서 브랜치 pull 및 테스트
2. 테스트 완료 후 main 브랜치로 머지
3. Firestore 연동 검토 (선택사항)
4. 관리자 페이지 설정 UI 추가 (선택사항)

