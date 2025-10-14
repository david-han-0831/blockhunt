# 📌 Pull Request 개요

## ✅ 변경 요약
QR 코드 생성 및 스캔 기능 구현 - 학생들이 QR 코드를 스캔하여 블록을 획득하는 전체 흐름 완성

## 🔍 주요 변경 사항
- [x] QR 코드 생성 및 미리보기 기능 (QRViewModal 컴포넌트)
- [x] QR 코드 다운로드 및 데이터 복사 기능
- [x] Challenges 페이지에 QR 스캐너 연결
- [x] 블록 잠금 해제 로직 완성 (processQRScan)
- [x] 중복 스캔 감지 및 사용자 피드백
- [x] 카메라 권한 처리 및 에러 핸들링
- [x] 수동 입력 옵션 제공 (테스트용)

## 💡 구현 배경 및 상세 설명

### 배경
교육용 블록 코딩 플랫폼에서 학생들이 실제 QR 코드를 스캔하여 블록을 수집할 수 있는 게임화 요소를 추가하기 위해 구현했습니다.

### 주요 구현 내용

#### 1. QR 코드 생성 (Admin)
- `qrcode` 라이브러리를 사용하여 Canvas에 QR 코드 렌더링
- QR 데이터 형식 표준화 (`blockhunt_blocks` 타입)
- PNG 이미지 다운로드 기능
- QR 코드 미리보기 모달 (QRViewModal)

#### 2. QR 스캔 (Student)
- `html5-qrcode` 라이브러리를 활용한 카메라 스캔
- 카메라 권한 요청 및 에러 처리
- React와 DOM 조작의 충돌 방지 (useCallback, 비동기 초기화)
- 스캔 결과 피드백 (QRResultModal)

#### 3. 블록 잠금 해제
- Firebase `processQRScan` 함수 연동
- 사용자의 `collectedBlocks` 배열에 블록 추가
- 중복 스캔 감지 및 알림
- `qrScanHistory`에 스캔 기록 저장

### 기술적 고려 사항
- **React와 html5-qrcode 라이브러리 충돌 해결**: 
  - DOM 조작을 React 렌더링 사이클 밖에서 처리
  - useCallback과 useEffect를 활용한 안정적인 초기화
  - 컴포넌트 언마운트 시 안전한 cleanup

- **카메라 권한 처리**:
  - 명시적인 권한 상태 관리 (pending/granted/denied)
  - 권한 거부 시 사용자 안내 메시지
  - HTTPS 요구사항 경고

- **사용자 경험 개선**:
  - 로딩 상태 표시
  - 명확한 에러 메시지
  - 테스트를 위한 수동 입력 옵션

## 🙋 향후 계획 / TODO
- [ ] QR 코드 만료 기능 구현 (startDate, endDate 활용)
- [ ] QR 코드 스캔 횟수 제한 기능
- [ ] QR 코드 분석 대시보드 (스캔 통계)
- [ ] 배치 QR 코드 생성 기능
- [ ] QR 코드 디자인 커스터마이징 (색상, 로고)
- [ ] 실제 교육 현장 테스트 및 피드백 반영
- [ ] 팀별 블록 수집 경쟁 모드

## 🔗 관련 링크
- DevLog: `docs/devlog/2025-10-10-02-qr-code-scan-feature.md`
- 관련 문서: `docs/qr-blocks-schema.md`
- Firebase 함수: `processQRScan`, `createQRCode`, `getQRCodes`
