# [DevLog] QR 코드 생성 및 스캔 기능 구현

## 📅 날짜
2025-10-10

## ✏️ 요약
- Admin 페이지에서 QR 코드 생성 및 미리보기 기능 구현
- Challenges 페이지에 QR 스캐너 연결하여 블록 잠금 해제 기능 완성
- 실제 QR 코드를 핸드폰으로 스캔하여 블록을 획득할 수 있는 완전한 흐름 구현

## 🔍 상세 내용

### 1. QR 코드 생성 및 미리보기 기능

**QRViewModal 컴포넌트 생성**
- `qrcode` 라이브러리를 사용하여 QR 코드 이미지 생성
- Canvas로 QR 코드 렌더링
- QR 코드 다운로드 기능 (PNG 이미지)
- QR 코드 데이터 복사 기능 (개발자용)

**QR 데이터 형식**
```json
{
  "type": "blockhunt_blocks",
  "qrId": "생성된QR코드ID",
  "block": "블록ID (예: controls_if)",
  "name": "QR코드이름",
  "timestamp": "2025-10-10T10:00:00.000Z"
}
```

**Admin 페이지 업데이트**
- QR 코드 생성 후 자동으로 미리보기 모달 표시
- QR 코드 목록에서 QR 아이콘 버튼으로 언제든지 확인 가능
- 블록 정보 (이름, 아이콘, 카테고리)와 함께 표시

### 2. QR 스캐너 연결

**Challenges 페이지 업데이트**
- 하단 FAB 버튼 (Scan)에 QR 스캐너 연결
- `html5-qrcode` 라이브러리를 사용한 카메라 기반 스캔
- 수동 입력 옵션 제공 (테스트용)

**블록 잠금 해제 로직**
- `processQRScan` Firebase 함수를 통해 QR 데이터 검증
- 사용자의 `collectedBlocks` 배열에 블록 추가
- 중복 스캔 감지 및 알림
- `qrScanHistory`에 스캔 기록 저장

### 3. 사용자 흐름

1. **Admin (관리자)**
   - Admin 페이지 → Blocks & QR 탭
   - "Create QR" 버튼 클릭
   - 블록 선택 및 QR 이름 입력
   - "Generate QR" 클릭
   - 자동으로 QR 코드 미리보기 표시
   - "Download" 버튼으로 QR 코드 이미지 다운로드

2. **Student (학생)**
   - Challenges 페이지
   - 하단 "Scan" FAB 버튼 클릭
   - 카메라로 QR 코드 스캔
   - 블록 획득 성공 알림
   - Studio에서 획득한 블록 사용 가능

### 4. 기술적 구현

**새로운 의존성**
- `qrcode`: QR 코드 이미지 생성
- 기존 `html5-qrcode`: QR 코드 스캔

**주요 파일 변경**
- `src/components/QRViewModal.jsx`: 신규 생성
- `src/pages/Admin.jsx`: QR 보기 기능 추가
- `src/pages/Challenges.jsx`: QR 스캐너 연결
- `src/firebase/firestore.js`: 기존 `processQRScan` 함수 활용

**QR 데이터 타입 통일**
- 기존: `blockhunt_qr` → 변경: `blockhunt_blocks`
- Firebase `processQRScan` 함수와 일치하도록 수정

## 🙋 개선 및 회고

### 배운 점
- QR 코드 생성과 스캔의 전체 흐름을 완성하며 엔드투엔드 기능 구현 경험
- Canvas API를 활용한 QR 코드 렌더링
- Firebase와 React의 실시간 데이터 동기화

### 개선 가능 사항
- QR 코드 만료 기능 (startDate, endDate 활용)
- QR 코드 스캔 횟수 제한 기능
- QR 코드 분석 대시보드 (누가, 언제, 어떤 블록을 스캔했는지)
- 배치 QR 코드 생성 기능 (여러 블록을 한 번에)
- QR 코드 디자인 커스터마이징 (색상, 로고 추가)

### 향후 계획
- 실제 교육 현장에서 테스트
- QR 코드를 활용한 게임화 요소 추가 (레어 블록, 이벤트 블록 등)
- 블록 획득 통계 및 리더보드
- 팀별 블록 수집 경쟁 모드

## 🔗 관련 링크
- 이슈: QR 코드 기능 구현
- 관련 문서: `docs/qr-blocks-schema.md`
- Firebase 함수: `processQRScan`, `createQRCode`, `getQRCodes`

