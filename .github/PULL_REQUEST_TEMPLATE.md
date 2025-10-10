# 📌 Pull Request 개요

Studio Submit 및 Admin Submissions Firebase 연동

## ✅ 변경 요약
- Studio 페이지에서 코드 제출 시 Firebase Firestore에 저장되도록 구현
- Admin 페이지에서 실제 제출물 목록 조회 및 필터링 기능 구현
- 사용자 인증 및 데이터 병합을 통한 제출 이력 관리 완성

## 🔍 주요 변경 사항
- [x] Studio Submit 기능 Firebase 연동
- [x] 로그인 사용자 인증 및 유효성 검사
- [x] Blockly 워크스페이스 상태 JSON 직렬화
- [x] 로딩 상태 및 UX 피드백 구현
- [x] Admin Submissions 탭 Firebase 연동
- [x] 제출물 목록 조회 및 사용자 정보 병합
- [x] 서버/클라이언트 필터링 기능 구현
- [x] 제출물 테이블 UI 실제 데이터 연결
- [x] 날짜 포맷팅 및 상태별 뱃지 표시
- [x] 한국어 에러 메시지 및 토스트 알림

## 💡 구현 배경 및 상세 설명

### 배경
- 기존에는 Studio에서 Submit 버튼이 console.log만 하고 실제 저장되지 않음
- Admin 페이지는 더미 데이터 1개만 표시되어 제출물 관리 불가능
- Firebase Firestore 함수는 이미 구현되어 있었으나 UI와 연결되지 않음

### Studio Submit 구현
1. **인증 및 검증**
   - `useAuth` 훅으로 현재 사용자 정보 가져오기
   - 로그인 여부, 워크스페이스 초기화, 코드 존재 여부 확인
   - localStorage에서 현재 문제 ID 추출 (fallback 처리)

2. **데이터 저장**
   - Blockly 워크스페이스를 JSON으로 직렬화
   - Python 코드와 워크스페이스 상태를 Firestore에 저장
   - status: 'pending', submittedAt: ISO 8601 타임스탬프 자동 추가

3. **UX 개선**
   - `isSubmitting` 상태로 로딩 인디케이터 표시
   - 제출 중 버튼 비활성화로 중복 제출 방지
   - 성공/실패 시 한국어 토스트 메시지

### Admin Submissions 구현
1. **데이터 로딩**
   - `getAllSubmissions` 함수로 제출물 목록 조회
   - Promise.all로 각 제출물의 사용자 정보 병렬 조회
   - 제출물 객체에 userInfo 병합하여 state 저장

2. **필터링 기능**
   - 서버 사이드: Status(pending/graded), Question ID 필터
   - 클라이언트 사이드: 사용자 이름, 이메일, Submission ID 검색
   - 실시간 검색 및 필터 적용

3. **UI 구현**
   - 제출물 테이블: ID, 날짜, 문제, 사용자, 상태, 점수 표시
   - 로딩/데이터 없음/데이터 존재 상태별 UI 처리
   - 난이도 뱃지, 상태 뱃지, 점수 표시
   - 결과 개수 표시 및 페이지네이션 준비

### 기술적 고려사항
1. **성능**: 사용자 정보를 개별 조회하여 병합 (향후 최적화 필요)
2. **에러 처리**: try-catch 및 사용자 친화적 메시지
3. **데이터 일관성**: localStorage와 Firestore 간 동기화
4. **보안**: 사용자 인증 확인 (Firestore Security Rules 별도 설정 필요)

## 🙋 향후 계획 / TODO
- [ ] **Review 모달 구현**: 제출된 코드 확인 및 채점 기능
- [ ] **제출물 성능 최적화**: 제출 시 사용자 정보도 함께 저장하여 추가 조회 불필요
- [ ] **페이지네이션**: 제출물이 많아질 경우 페이징 처리
- [ ] **실시간 업데이트**: onSnapshot을 활용한 실시간 제출물 모니터링
- [ ] **Firestore Security Rules**: 접근 제어 규칙 설정
- [ ] **Profile 제출 이력**: 사용자별 제출 기록 표시
- [ ] **자동 채점 시스템**: 테스트 케이스 실행 및 검증

## 🔗 관련 링크
- 관련 DevLog: `docs/devlog/2025-10-10-01-studio-admin-firebase-integration.md`
- Firestore Schema: `docs/firestore-schema.md`
- Features Analysis: `docs/features-analysis.md`

