# 📌 Pull Request 개요

## ✅ 변경 요약
QR 코드 생성 및 스캔 기능을 구현하여 사용자가 실제 QR 코드를 통해 블록을 잠금 해제할 수 있도록 완성

## 🔍 주요 변경 사항
- [x] Admin 페이지에서 QR 코드 생성 및 미리보기 기능 구현
- [x] QRViewModal 컴포넌트 신규 생성 (QR 이미지 표시, 다운로드, 데이터 복사)
- [x] Challenges 페이지 Scan FAB 버튼에 QR 스캐너 연결
- [x] QR 스캔 후 블록 자동 잠금 해제 로직 구현
- [x] qrcode 라이브러리 추가 (QR 이미지 생성용)
- [x] QR 데이터 타입 통일 (blockhunt_blocks)

## 💡 구현 배경 및 상세 설명

### 문제점
- Admin에서 QR 코드를 생성했지만, 실제 QR 이미지를 확인할 수 없었음
- Challenges 페이지의 Scan 버튼이 작동하지 않았음
- QR 스캔 후 블록 잠금 해제 흐름이 완성되지 않았음

### 해결 방법

**1. QR 코드 생성 및 미리보기**
- `qrcode` npm 라이브러리를 사용하여 Canvas에 QR 코드 렌더링
- QRViewModal 컴포넌트 생성: 모달로 QR 코드 표시
- QR 데이터를 JSON 형식으로 인코딩
- PNG 이미지 다운로드 기능 제공
- 개발자용 QR 데이터 복사 기능 추가

**2. QR 스캐너 연결**
- Challenges 페이지의 Scan FAB 버튼에 onClick 이벤트 추가
- 로그인 상태 검증
- QRScanner 모달을 조건부 렌더링
- html5-qrcode 라이브러리로 카메라 기반 스캔
- 수동 입력 옵션 제공 (테스트용)

**3. 블록 잠금 해제 로직**
- Firebase `processQRScan` 함수 호출
- QR 데이터 파싱 및 검증
- 사용자의 collectedBlocks 배열에 블록 ID 추가
- qrScanHistory에 스캔 기록 저장
- 중복 스캔 감지 및 적절한 피드백 제공

### 기술적 고려 사항

**QR 데이터 형식**
```json
{
  "type": "blockhunt_blocks",
  "qrId": "생성된QR코드ID",
  "block": "controls_if",
  "name": "Week 1 - Logic Blocks",
  "timestamp": "2025-10-10T10:00:00.000Z"
}
```

**사용자 흐름**
1. Admin이 QR 코드 생성 → 자동으로 미리보기 표시
2. QR 이미지 다운로드 후 출력 또는 공유
3. 학생이 Challenges 페이지에서 Scan 버튼 클릭
4. 카메라로 QR 코드 스캔
5. 블록 자동 잠금 해제 및 토스트 알림
6. Studio에서 획득한 블록 사용 가능

## 🙋 향후 계획 / TODO
- [ ] QR 코드 만료 기능 활성화 (startDate, endDate 검증)
- [ ] QR 코드 스캔 통계 대시보드
- [ ] 배치 QR 코드 생성 기능
- [ ] QR 코드 디자인 커스터마이징 (색상, 로고)
- [ ] 레어 블록, 이벤트 블록 등 게임화 요소
- [ ] 팀별 블록 수집 경쟁 모드

## 🔗 관련 링크
- DevLog: `docs/devlog/2025-10-10-02-qr-code-scan-feature.md`
- QR Blocks Schema: `docs/qr-blocks-schema.md`
- Firebase Functions: `processQRScan`, `createQRCode`, `getQRCodes`
