# [DevLog] Studio Submit & Admin Submissions Firebase 연동

## 📅 날짜
2025-10-10

## ✏️ 요약
- Studio 페이지의 Submit 기능을 Firebase Firestore와 연동하여 제출물 저장 구현
- Admin 페이지의 Submissions 탭에서 실제 Firebase 제출물 조회 및 표시 구현
- 사용자별 제출 이력 관리 및 Admin 필터링 기능 완성

## 🔍 상세 내용

### Studio 페이지 Submit 기능 구현

#### 1. Firebase 연동
- `useAuth` 훅을 통한 현재 사용자 인증 정보 가져오기
- `saveSubmission` Firestore 함수를 통한 제출물 저장
- `workspaceState` JSON 직렬화를 통한 Blockly 워크스페이스 상태 저장

#### 2. 유효성 검사
```javascript
- 로그인 여부 확인
- 워크스페이스 초기화 상태 확인
- 제출 가능한 코드 존재 여부 확인
- localStorage에서 현재 문제 ID 추출 (fallback: 'default-question')
```

#### 3. UX 개선
- `isSubmitting` 상태를 통한 로딩 인디케이터 표시
- 제출 중 버튼 비활성화로 중복 제출 방지
- Bootstrap 스피너를 활용한 시각적 피드백
- 성공/실패 시 한국어 토스트 메시지 표시

#### 4. 제출 데이터 구조
```javascript
{
  userId: currentUser.uid,
  questionId: questionId,
  code: "Python code string",
  workspaceState: { blocks: {...} },
  status: 'pending',
  submittedAt: ISO 8601 timestamp
}
```

### Admin 페이지 Submissions 조회 구현

#### 1. 데이터 로딩
- `getAllSubmissions` 함수를 통한 제출물 목록 조회
- `getUserProfile` 함수를 통한 제출자 정보 병합
- Promise.all을 활용한 병렬 사용자 정보 조회

#### 2. 필터링 기능
**서버 사이드 필터**
- Status 필터 (All / Pending / Graded)
- Question 필터 (문제별 조회)
- Firestore query constraints 활용

**클라이언트 사이드 검색**
- 사용자 이름 검색
- 이메일 검색
- Submission ID 검색
- 실시간 검색 필터링

#### 3. UI 구현
**제출물 테이블 컬럼**
- Submission: ID (앞 8자리) + 제출 시간 (한국어 포맷)
- Question: 문제 제목 + 난이도 뱃지
- User: 사용자 이름 + 이메일
- Status: pending/graded 상태 뱃지
- Grade: Accepted/Needs Work/Rejected + 점수
- Actions: Review 버튼 (향후 구현 예정)

**로딩 상태 처리**
- 로딩 중: 스피너 + 안내 메시지
- 데이터 없음: 아이콘 + 안내 메시지
- 데이터 존재: 테이블 렌더링 + 결과 개수 표시

#### 4. 헬퍼 함수
```javascript
// 날짜 포맷팅
formatDate(isoString) → "2025. 10. 10. 오후 2:30"

// 문제 정보 조회
getQuestionInfo(questionId) → Question Object

// 제출물 필터링
filteredSubmissions → Filtered Array
```

## 🔧 기술적 고려사항

### 1. 성능 최적화
- 사용자 정보를 개별적으로 조회하여 제출물에 병합
- 향후 개선점: 제출 시 사용자 정보를 함께 저장하여 조회 최적화

### 2. 에러 처리
- try-catch를 통한 예외 처리
- 사용자 친화적인 한국어 에러 메시지
- console.error를 통한 디버깅 정보 기록

### 3. 데이터 일관성
- localStorage와 Firestore 간의 questionId 동기화
- 워크스페이스 상태의 JSON 직렬화/역직렬화

### 4. 보안
- 현재 사용자 인증 확인
- Firestore Security Rules를 통한 접근 제어 (별도 설정 필요)

## 📊 데이터 흐름

### Submit 흐름
```
[Studio] → handleSubmit()
  → 유효성 검사
  → Blockly 워크스페이스 직렬화
  → saveSubmission(uid, questionId, data)
  → Firestore 저장
  → 토스트 알림
```

### Admin 조회 흐름
```
[Admin] → loadSubmissions()
  → getAllSubmissions(filters)
  → Firestore 조회
  → Promise.all(getUserProfile)
  → 데이터 병합
  → State 업데이트
  → UI 렌더링
```

## 🙋 개선 및 회고

### ✅ 잘된 점
1. 사용자 경험을 고려한 로딩 상태 처리
2. 한국어 메시지를 통한 직관적인 피드백
3. 필터링 기능의 서버/클라이언트 분리를 통한 효율성
4. 코드 재사용성을 고려한 헬퍼 함수 구현

### 🔄 개선 가능한 점
1. **성능 최적화**
   - 제출 시 사용자 정보(displayName, email)를 함께 저장
   - Admin 조회 시 추가 getUserProfile 호출 불필요

2. **캐싱 전략**
   - 문제 목록 캐싱으로 반복 조회 최소화
   - React Query 또는 SWR 도입 검토

3. **페이지네이션**
   - 제출물이 많아질 경우 페이징 처리 필요
   - Firestore limit & startAfter 활용

4. **실시간 업데이트**
   - onSnapshot을 활용한 실시간 제출물 모니터링
   - Admin이 새로운 제출을 즉시 확인 가능

### 🎯 향후 작업
1. **Review 모달 구현**
   - 제출된 코드 및 워크스페이스 확인
   - 피드백 작성 및 채점 기능
   - gradeSubmission 함수 연동

2. **제출 이력 표시**
   - Profile 페이지에서 사용자별 제출 기록 표시
   - Recent Submissions 섹션 추가

3. **테스트 케이스 실행**
   - 자동 채점 시스템 구현
   - Pyodide를 활용한 코드 실행 및 검증

4. **Firestore Security Rules**
   - 사용자는 자신의 제출물만 생성 가능
   - Admin만 모든 제출물 조회 및 채점 가능

## 🔗 관련 파일
- `blockhunt/src/pages/Studio.jsx` (L303-355: handleSubmit 함수)
- `blockhunt/src/pages/Admin.jsx` (L53-81: loadSubmissions 함수)
- `blockhunt/src/pages/Admin.jsx` (L293-402: Submissions 테이블 UI)
- `blockhunt/src/firebase/firestore.js` (L76-90: saveSubmission 함수)
- `blockhunt/src/firebase/firestore.js` (L192-222: getAllSubmissions 함수)

## 📝 커밋 메시지
```
feat(studio): Firebase 제출 기능 구현
feat(admin): 제출물 조회 및 필터링 구현
```

