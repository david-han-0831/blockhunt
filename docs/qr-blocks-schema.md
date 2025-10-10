# QR 블록 수집 시스템 스키마

> BlockHunt QR 코드 기반 블록 수집 시스템의 데이터 구조

**작성일:** 2025-10-10  
**버전:** 1.0

---

## 📋 개요

### 핵심 기능
1. **Admin**: 블록 하나를 선택하여 QR 코드 생성 (1:1 관계)
2. **User**: 카메라로 QR 스캔하여 블록 수집
3. **운영**: 2주 주기로 QR 세트 교체 가능

---

## 데이터 구조

### 1. Blocks 컬렉션 (`/blocks/{blockId}`)

블록 카탈로그 정보를 저장합니다.

```typescript
interface Block {
  id: string;                      // 'controls_if'
  name: string;                    // 'if / else'
  category: string;                // 'Logic'
  icon: string;                    // 'bi-braces'
  
  // 운영 설정
  isDefaultBlock: boolean;         // true면 기본 제공, false면 QR 필요
  
  // 메타데이터
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}
```

**예시 문서:**
```json
{
  "id": "controls_if",
  "name": "if / else",
  "category": "Logic",
  "icon": "bi-braces",
  "isDefaultBlock": false,
  "createdAt": "2025-10-10T00:00:00.000Z",
  "updatedAt": "2025-10-10T00:00:00.000Z"
}
```

---

### 2. QR Codes 컬렉션 (`/qrCodes/{qrCodeId}`)

Admin이 생성한 QR 코드 정보를 저장합니다.

```typescript
interface QRCode {
  id: string;                      // 자동 생성 ID
  name: string;                    // 'Logic Block - If/Else'
  block: string;                   // 'controls_if' (단일 블록 ID)
  
  // QR 데이터
  qrData: string;                  // QR에 인코딩될 JSON string
  
  // 운영 정보
  isActive: boolean;               // 현재 활성화 여부
  startDate?: string;              // 배포 시작일 (선택)
  endDate?: string;                // 배포 종료일 (선택, 2주 후)
  
  // 메타데이터
  createdBy: string;               // 생성자 UID (Admin)
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}
```

**QR Data 포맷:**
```json
{
  "type": "blockhunt_blocks",
  "qrId": "qr_abc123",
  "block": "controls_if",
  "timestamp": "2025-10-10T10:00:00.000Z"
}
```

**예시 문서:**
```json
{
  "id": "qr_abc123",
  "name": "Logic Block - If/Else",
  "block": "controls_if",
  "qrData": "{\"type\":\"blockhunt_blocks\",\"qrId\":\"qr_abc123\",\"block\":\"controls_if\",\"timestamp\":\"2025-10-10T10:00:00.000Z\"}",
  "isActive": true,
  "startDate": "2025-10-10T00:00:00.000Z",
  "endDate": "2025-10-24T23:59:59.000Z",
  "createdBy": "S80Pp6ZTa3SR4fAK6rrlj4HUDYI3",
  "createdAt": "2025-10-10T10:00:00.000Z",
  "updatedAt": "2025-10-10T10:00:00.000Z"
}
```

---

### 3. Users 컬렉션 업데이트 (`/users/{uid}`)

기존 스키마에 QR 관련 필드 추가:

```typescript
interface User {
  // ... 기존 필드들
  
  // 블록 수집 정보
  collectedBlocks: string[];       // 수집한 블록 ID 배열
  
  // QR 스캔 기록 (선택적)
  qrScanHistory?: Array<{
    qrCodeId: string;              // QR 코드 ID
    scannedAt: string;             // 스캔 시간
    blockObtained: string;         // 획득한 블록 (단일)
  }>;
}
```

**예시:**
```json
{
  "email": "student@example.com",
  "displayName": "Student",
  "collectedBlocks": ["controls_if", "logic_compare", "math_number"],
  "qrScanHistory": [
    {
      "qrCodeId": "qr_abc123",
      "scannedAt": "2025-10-10T10:30:00.000Z",
      "blockObtained": "controls_if"
    }
  ]
}
```

---

## 초기 블록 카탈로그

Profile.jsx에서 사용 중인 블록 목록:

```javascript
const INITIAL_BLOCKS = [
  // Logic
  { id: 'controls_if', name: 'if / else', category: 'Logic', icon: 'bi-braces', isDefaultBlock: true },
  { id: 'logic_compare', name: 'compare', category: 'Logic', icon: 'bi-braces', isDefaultBlock: true },
  { id: 'logic_operation', name: 'and / or', category: 'Logic', icon: 'bi-braces', isDefaultBlock: false },
  { id: 'logic_negate', name: 'not', category: 'Logic', icon: 'bi-braces', isDefaultBlock: false },
  { id: 'logic_boolean', name: 'true / false', category: 'Logic', icon: 'bi-braces', isDefaultBlock: true },
  
  // Loops
  { id: 'controls_repeat_ext', name: 'repeat', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: true },
  { id: 'controls_whileUntil', name: 'while / until', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  { id: 'controls_for', name: 'count with', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  { id: 'controls_forEach', name: 'for each', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  { id: 'controls_flow_statements', name: 'break / continue', category: 'Loops', icon: 'bi-arrow-repeat', isDefaultBlock: false },
  
  // Math
  { id: 'math_number', name: 'number', category: 'Math', icon: 'bi-123', isDefaultBlock: true },
  { id: 'math_arithmetic', name: '+ - × ÷', category: 'Math', icon: 'bi-123', isDefaultBlock: true },
  { id: 'math_single', name: 'sqrt, abs, ...', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  { id: 'math_trig', name: 'sin, cos, tan', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  { id: 'math_constant', name: 'π, e, ...', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  { id: 'math_modulo', name: 'remainder of', category: 'Math', icon: 'bi-123', isDefaultBlock: false },
  
  // Text
  { id: 'text', name: 'text', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: true },
  { id: 'text_print', name: 'print', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: true },
  { id: 'text_join', name: 'join', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: false },
  { id: 'text_append', name: 'append text', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: false },
  { id: 'text_length', name: 'length', category: 'Text', icon: 'bi-chat-dots', isDefaultBlock: false },
  
  // Lists
  { id: 'lists_create_with', name: 'make list', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: true },
  { id: 'lists_create_empty', name: 'empty list', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_repeat', name: 'repeat item', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_length', name: 'length', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_isEmpty', name: 'is empty', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_indexOf', name: 'find', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  { id: 'lists_getIndex', name: 'get item', category: 'Lists', icon: 'bi-list-ul', isDefaultBlock: false },
  
  // Variables
  { id: 'variables_get', name: 'get variable', category: 'Variables', icon: 'bi-box', isDefaultBlock: true },
  { id: 'variables_set', name: 'set variable', category: 'Variables', icon: 'bi-box', isDefaultBlock: true },
  
  // Functions
  { id: 'procedures_defnoreturn', name: 'define function', category: 'Functions', icon: 'bi-gear', isDefaultBlock: false },
  { id: 'procedures_defreturn', name: 'function with return', category: 'Functions', icon: 'bi-gear', isDefaultBlock: false },
  { id: 'procedures_ifreturn', name: 'if return', category: 'Functions', icon: 'bi-gear', isDefaultBlock: false }
];
```

**분류:**
- **기본 제공 블록 (isDefaultBlock: true)**: 15개
  - 처음부터 사용 가능, 기초 문제 풀이에 필요
- **QR 수집 필요 블록 (isDefaultBlock: false)**: 18개
  - QR 스캔으로만 획득 가능, 고급 기능

---

## 주요 기능 플로우

### 1. Admin이 QR 생성하는 플로우

```
1. Admin → Blocks & QR 탭 접속
2. 블록 목록에서 원하는 블록 하나 선택
3. QR 이름 입력 ("Logic Block - If/Else")
4. 배포 기간 설정 (선택, 2주)
5. [Generate QR] 버튼 클릭
6. Firestore에 QR 문서 생성
7. QR 이미지 생성 및 표시
8. [Download] 버튼으로 QR 이미지 다운로드
9. 실제 장소에 QR 부착/배포
```

### 2. User가 QR 스캔하는 플로우

```
1. User → Profile 또는 Challenges 페이지
2. 우측 하단 FAB 버튼 (QR 아이콘) 클릭
3. 카메라 권한 요청 → 허용
4. QR 스캐너 모달 열림
5. 카메라로 QR 코드 스캔
6. QR 데이터 파싱 및 검증
7. Firestore에서 사용자 프로필 업데이트
   - collectedBlocks 배열에 블록 추가
   - qrScanHistory에 기록 추가
8. 성공 토스트 메시지 표시
   "🎉 1개의 새로운 블록을 획득했습니다!"
9. Profile 페이지 블록 목록 새로고침
```

### 3. 블록 수집 상태 확인 플로우

```
1. User → Profile 페이지
2. 상단 통계 카드:
   - Total Blocks: 33
   - Collected: 15 (45%)
   - Missing: 18
3. 필터 탭:
   - [All]: 전체 33개 블록 표시
   - [Collected]: 수집한 15개 블록만 표시 (체크마크 있음)
   - [To Collect]: 미수집 18개 블록만 표시 (자물쇠 아이콘)
```

---

## 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Blocks: 모든 인증된 사용자 읽기, Admin만 쓰기
    match /blocks/{blockId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // QR Codes: 모든 인증된 사용자 읽기, Admin만 쓰기
    match /qrCodes/{qrCodeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users: 본인만 읽기/쓰기, Admin은 모두 읽기 가능
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 인덱스 설정

### Blocks 컬렉션
```javascript
// 카테고리별 정렬
- Collection: blocks
- Fields: category (Ascending), name (Ascending)

// 기본 블록 필터링
- Collection: blocks
- Fields: isDefaultBlock (Ascending), category (Ascending)
```

### QR Codes 컬렉션
```javascript
// 활성 QR 조회
- Collection: qrCodes
- Fields: isActive (Ascending), createdAt (Descending)

// 생성자별 QR 조회
- Collection: qrCodes
- Fields: createdBy (Ascending), createdAt (Descending)
```

---

**문서 버전:** 1.0  
**마지막 업데이트:** 2025-10-10

