# 블록 AR 표시 설정 가이드

각 블록의 AR 카메라에서의 크기, 위치, 회전 등 표시 설정을 관리하는 시스템입니다.

## 📁 파일 구조

```
blockhunt/
├── src/
│   ├── config/
│   │   └── blockDisplayConfigs.json    # 블록별 설정 파일
│   └── utils/
│       └── blockDisplayConfig.js        # 설정 관리 유틸리티
```

## 🎯 설정 항목

각 블록은 다음 설정을 가질 수 있습니다:

```json
{
  "controls_if": {
    "scale": 5,                    // 크기 배율 (1 = 원본 크기)
    "position": {                   // 기본 위치 (autoCenter가 false일 때 사용)
      "x": 0,
      "y": 0,
      "z": -1.5
    },
    "rotation": {                  // 회전 각도 (라디안)
      "x": 0,
      "y": 0,
      "z": 0
    },
    "centerOffset": {              // 자동 중앙 정렬 후 추가 오프셋
      "x": 0,
      "y": 0,
      "z": 0
    },
    "autoCenter": true             // 자동 중앙 정렬 활성화 여부
  }
}
```

## 🚀 사용 방법

### 1. 기본 사용 (코드에서)

```javascript
import { getBlockGLTFPath, applyBlockDisplayConfig } from '../utils/blockDisplayConfig';

// 블록 ID로 GLTF 경로 가져오기
const gltfPath = getBlockGLTFPath('controls_if'); // '/block_gltf/controls_if.gltf'

// 모델 로드 후 설정 적용
loader.load(gltfPath, (gltf) => {
  const model = gltf.scene;
  applyBlockDisplayConfig(model, 'controls_if');
  scene.add(model);
});
```

### 2. 새 블록 설정 추가

`blockhunt/src/config/blockDisplayConfigs.json` 파일에 새 블록 설정을 추가합니다:

```json
{
  "새블록ID": {
    "scale": 5,
    "position": { "x": 0, "y": 0, "z": -1.5 },
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "centerOffset": { "x": 0, "y": 0, "z": 0 },
    "autoCenter": true
  }
}
```

### 3. 테스트 및 조정

#### 방법 1: 브라우저 콘솔에서 실시간 조정

```javascript
// 개발자 도구 콘솔에서 실행
import { updateBlockConfig, exportBlockConfig } from './src/utils/blockDisplayConfig';

// 크기 조정
updateBlockConfig('controls_if', { scale: 10 });

// 위치 미세 조정 (자동 중앙 정렬 후 추가 오프셋)
updateBlockConfig('controls_if', { 
  centerOffset: { x: 0.1, y: -0.2, z: 0 } 
});

// 설정 확인 및 복사
exportBlockConfig('controls_if');
```

#### 방법 2: JSON 파일 직접 수정

1. `blockhunt/src/config/blockDisplayConfigs.json` 파일 열기
2. 해당 블록의 설정 수정
3. 저장 후 페이지 새로고침

## 🔧 설정 조정 가이드

### 크기 조정 (`scale`)

- **작게**: `scale: 3` (작은 블록)
- **보통**: `scale: 5` (기본값)
- **크게**: `scale: 10` (큰 블록)

### 위치 조정

#### 자동 중앙 정렬 사용 (`autoCenter: true`)

블록의 바운딩 박스를 자동으로 계산하여 중심을 카메라 중앙에 맞춥니다.
미세 조정이 필요한 경우 `centerOffset`을 사용하세요:

```json
{
  "centerOffset": {
    "x": 0.1,    // 오른쪽으로 0.1 이동
    "y": -0.2,  // 아래로 0.2 이동
    "z": 0      // 앞뒤 조정
  }
}
```

#### 수동 위치 설정 (`autoCenter: false`)

자동 중앙 정렬을 비활성화하고 `position` 값을 직접 설정합니다:

```json
{
  "autoCenter": false,
  "position": {
    "x": 0,
    "y": 0.5,
    "z": -1.5
  }
}
```

### 회전 조정 (`rotation`)

각도는 라디안 단위입니다:

- `Math.PI / 2` = 90도
- `Math.PI` = 180도
- `-Math.PI / 4` = -45도

## 📝 작업 흐름

### 새 블록 추가 시

1. **블록 GLTF 파일 확인**
   - `public/block_gltf/` 폴더에 파일이 있는지 확인
   - 파일명이 `{blockId}.gltf` 형식인지 확인

2. **기본 설정으로 테스트**
   ```json
   {
     "새블록ID": {
       "scale": 5,
       "autoCenter": true
     }
   }
   ```

3. **크기 조정**
   - 카메라에서 블록이 너무 크거나 작으면 `scale` 값 조정
   - 보통 3~10 사이에서 조정

4. **위치 미세 조정**
   - 자동 중앙 정렬이 완벽하지 않으면 `centerOffset`으로 조정
   - 콘솔에서 실시간으로 테스트:
     ```javascript
     updateBlockConfig('새블록ID', { centerOffset: { x: 0.1, y: 0, z: 0 } });
     ```

5. **최종 설정 저장**
   - 콘솔에서 `exportBlockConfig('새블록ID')` 실행
   - 출력된 JSON을 `blockDisplayConfigs.json`에 복사

## 🔄 향후 확장 계획

### Firestore 연동 (선택사항)

나중에 관리자 페이지에서 설정을 수정할 수 있도록 Firestore에 저장할 수 있습니다:

```javascript
// Firestore에 저장
await updateDoc(doc(db, 'blocks', blockId), {
  displayConfig: {
    scale: 5,
    autoCenter: true,
    // ...
  }
});

// Firestore에서 로드 (우선순위: Firestore > JSON)
const blockDoc = await getDoc(doc(db, 'blocks', blockId));
const displayConfig = blockDoc.data()?.displayConfig || getBlockDisplayConfig(blockId);
```

## 💡 팁

1. **일관성 유지**: 비슷한 크기의 블록은 비슷한 `scale` 값을 사용하세요.
2. **자동 중앙 정렬 활용**: 대부분의 경우 `autoCenter: true`로 두고 `centerOffset`만 조정하면 됩니다.
3. **콘솔 활용**: 브라우저 콘솔에서 실시간으로 테스트하면 빠르게 최적값을 찾을 수 있습니다.

## 🐛 문제 해결

### 블록이 화면 밖으로 나감
- `scale` 값을 줄이세요
- `centerOffset.z`를 조정하여 거리 조정

### 블록이 잘림
- `autoCenter: true` 확인
- `centerOffset`으로 미세 조정

### 설정이 적용되지 않음
- JSON 파일 형식 확인 (쉼표, 중괄호 등)
- 브라우저 캐시 삭제 후 새로고침
- 콘솔에서 에러 메시지 확인

