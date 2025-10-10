# BlockHunt 기능 분석 및 구현 상태

> HTML 퍼블리싱 파일과 React 프로젝트 간의 기능 비교 및 구현 필요 항목 정리

**작성일:** 2025-10-10  
**분석 대상:**
- HTML 퍼블리싱: `blockhunt-publish/templates/`
- React 프로젝트: `blockhunt/src/`

---

## 📋 목차

1. [전체 페이지 구조](#전체-페이지-구조)
2. [페이지별 기능 분석](#페이지별-기능-분석)
3. [공통 컴포넌트](#공통-컴포넌트)
4. [Firebase 연동 현황](#firebase-연동-현황)
5. [우선순위별 구현 필요 기능](#우선순위별-구현-필요-기능)
6. [기술적 고려사항](#기술적-고려사항)

---

## 전체 페이지 구조

| 페이지 | 경로 | HTML | React | 설명 |
|--------|------|------|-------|------|
| Login | `/login` | ✅ | ✅ | 로그인 페이지 |
| Register | `/register` | ✅ | ✅ | 회원가입 페이지 |
| Challenges | `/challenges` | ✅ | ✅ | 문제 목록 및 필터링 |
| Studio | `/studio` | ✅ | ✅ | Blockly 코딩 환경 |
| Profile | `/profile` | ✅ | ✅ | 사용자 프로필 및 통계 |
| Admin | `/admin` | ✅ | ✅ | 관리자 페이지 (채점/문제관리) |
| Home | `/` | ❌ | ⚠️ | 랜딩 페이지 (추후 작업 예정) |

**범례:**
- ✅ 구현 완료
- ⚠️ 부분 구현 (UI는 있으나 기능 미완성)
- ❌ 미구현

---

## 페이지별 기능 분석

### 1. Login 페이지 (`login.html` / `Login.jsx`)

#### HTML에서 확인된 기능
```html
- 이메일/비밀번호 입력 폼
- 비밀번호 표시/숨김 토글
- Remember me 체크박스
- 폼 유효성 검사 (HTML5 validation)
- 회원가입 페이지 링크
- 로딩 스피너 (제출 시)
```

#### React 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 기본 UI 레이아웃 | ✅ | 퍼블리싱과 동일 |
| Firebase Auth 로그인 | ✅ | `loginUser()` 함수 구현 |
| 비밀번호 표시/숨김 | ✅ | state로 관리 |
| 폼 유효성 검사 | ✅ | Bootstrap validation |
| 에러 처리 | ✅ | AlertModal로 표시 |
| Remember me | ⚠️ | UI만 있음, 기능 미구현 |
| 로딩 상태 | ✅ | isLoading state |
| 리다이렉트 | ✅ | 로그인 후 /challenges |

#### 필요한 작업
- [ ] Remember me 기능 구현 (localStorage 또는 Firebase persistence)
- [ ] 비밀번호 찾기/재설정 기능 추가

---

### 2. Register 페이지 (`register.html` / `Register.jsx`)

#### HTML에서 확인된 기능
```html
- 이름(First/Last), 이메일, 유저네임, 비밀번호 입력
- 비밀번호 확인 일치 검증
- 비밀번호 표시/숨김 토글 (2개)
- Terms & Privacy 동의 (주석 처리됨)
- 폼 유효성 검사
```

#### React 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 기본 UI 레이아웃 | ✅ | 퍼블리싱과 동일 |
| Firebase Auth 회원가입 | ✅ | `registerUser()` 구현 |
| Firestore 프로필 생성 | ✅ | `createUserProfile()` 구현 |
| 비밀번호 일치 검증 | ✅ | checkMatch() 함수 |
| 비밀번호 표시/숨김 | ✅ | 2개 모두 구현 |
| 에러 처리 | ✅ | 한국어 에러 메시지 |
| Terms 동의 | ❌ | HTML에서도 주석 처리 |

#### 필요한 작업
- [ ] Terms & Privacy 페이지 작성 및 동의 기능 (선택사항)
- [ ] 이메일 중복 체크 (Firebase에서 자동 처리 중)
- [ ] 유저네임 중복 체크

---

### 3. Challenges 페이지 (`challenges.html` / `Challenges.jsx`)

#### HTML에서 확인된 기능
```javascript
// 문제 데이터 구조
const QUESTIONS = [
  {
    id: 'sum-1-to-n',
    title: 'Sum from 1 to n',
    difficulty: 'easy',
    tags: ['math','loops'],
    body: '문제 설명 HTML'
  }
];

// 기능
- 문제 목록 표시 (카드 형태)
- 난이도 필터 (All/Easy/Medium/Hard)
- 태그 필터 (math, strings, lists, loops)
- 검색 기능 (제목/본문/태그)
- "Solve in Studio" 버튼 → localStorage에 저장 후 이동
- QR Scan FAB 버튼
- Admin FAB 버튼
```

#### React 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 문제 목록 표시 | ✅ | QUESTIONS 배열 (로컬) |
| 난이도 필터링 | ✅ | state로 관리 |
| 태그 필터링 | ✅ | toggle 방식 |
| 검색 기능 | ✅ | 실시간 검색 |
| Solve 버튼 | ✅ | localStorage + navigate |
| 난이도별 스타일링 | ✅ | diff-easy/medium/hard |
| QR Scan FAB | ⚠️ | UI만, 기능 없음 |
| Admin FAB | ✅ | /admin 링크 |
| Firebase 문제 불러오기 | ❌ | 로컬 데이터만 사용 |

#### 필요한 작업
- [ ] Firebase에서 문제 목록 불러오기 (`getQuestions()`)
- [ ] 문제 데이터 실시간 동기화
- [ ] QR 스캔 기능 연결 (AR 기능)
- [ ] 사용자별 문제 해결 상태 표시
- [ ] 문제 정렬 기능 (최신순, 인기순 등)

---

### 4. Studio 페이지 (`studio.html` / `Studio.jsx`)

#### HTML에서 확인된 기능
```javascript
// Blockly 설정
- Blockly workspace (Logic, Loops, Math, Text, Lists, Variables, Functions)
- Python 코드 생성
- Pyodide로 Python 실행
- 액션 버튼: Save, Submit, Download, Run
- 콘솔 출력 표시
- 생성된 Python 코드 표시
- 문제 텍스트 표시 (localStorage에서 로드)
- localStorage에 workspace 저장/복원 (JSON serialization)
- Run FAB 버튼
```

#### React 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| Blockly 워크스페이스 | ✅ | useRef로 관리 |
| Toolbox 구성 | ✅ | HTML과 동일 |
| Python 코드 생성 | ✅ | Blockly.Python |
| Pyodide 실행 | ✅ | 비동기 로딩 |
| Save (로컬) | ✅ | localStorage |
| Download .py | ✅ | Blob 다운로드 |
| Run 버튼 | ✅ | 실행 + 출력 |
| Submit 버튼 | ⚠️ | toast만, Firebase 미연결 |
| 콘솔 출력 | ✅ | stdout/stderr 캡처 |
| 문제 로드 | ✅ | localStorage |
| workspace 복원 | ✅ | serialization API |
| 자동 코드 업데이트 | ✅ | changeListener |

#### 필요한 작업
- [ ] Firebase에 제출물 저장 (`saveSubmission()`)
- [ ] input() 처리 (Pyodide에서 지원 필요)
- [ ] 테스트 케이스 실행 기능
- [ ] 자동 채점 기능
- [ ] 제출 기록 표시
- [ ] 워크스페이스 공유 기능
- [ ] 실행 시간 제한

---

### 5. Profile 페이지 (`profile.html` / `Profile.jsx`)

#### HTML에서 확인된 기능
```javascript
// 프로필 섹션
- 사용자 이름, 이메일, 아바타

// 블록 통계 (Block Stats)
- Total Blocks: 전체 블록 수
- Collected (AR): 수집한 블록 수 + 진행률
- Missing: 미수집 블록 수

// 챌린지 통계 (Challenge Stats) ⭐ HTML에만 존재
- Solved: 해결한 문제 수
- Attempts: 제출 시도 횟수
- Success Rate: 성공률 (%)
- Streak: 연속 해결 일수 (현재/최고)

// Recent Solves ⭐ HTML에만 존재
- 최근 해결한 문제 5개 (난이도, 제목, 날짜)

// 블록 인벤토리
- 전체/수집/미수집 필터
- 검색 기능
- 카테고리별 블록 카드 (Logic, Loops, Math, Text, Lists, Variables, Functions)
- 블록 수집/제거 버튼
```

#### React 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 사용자 정보 | ⚠️ | localStorage만 사용 |
| 아바타 | ✅ | 이니셜 표시 |
| 블록 통계 | ✅ | localStorage |
| 블록 필터링 | ✅ | All/Collected/Missing |
| 블록 검색 | ✅ | 이름 검색 |
| 블록 토글 | ✅ | Mark Collected/Remove |
| 카테고리별 스타일 | ✅ | 색상 구분 |
| **챌린지 통계** | ❌ | **HTML에는 있으나 React 미구현** |
| **Recent Solves** | ❌ | **HTML에는 있으나 React 미구현** |
| Firebase 동기화 | ❌ | 로컬만 사용 |
| QR Scan FAB | ⚠️ | UI만 |

#### 필요한 작업
- [ ] **챌린지 통계 섹션 추가** (Solved, Attempts, Success Rate, Streak)
- [ ] **Recent Solves 섹션 추가**
- [ ] Firebase에서 사용자 프로필 불러오기
- [ ] 블록 수집 정보 Firebase 동기화 (`saveCollectedBlocks()`)
- [ ] 제출 기록 Firebase에서 불러오기 (`getUserSubmissions()`)
- [ ] Streak 계산 로직 구현
- [ ] QR 스캔 기능 연결

---

### 6. Admin 페이지 (`admin.html` / `Admin.jsx`)

#### HTML에서 확인된 기능
```html
<!-- Submissions Tab -->
- 제출물 필터 (Question, Status, Search)
- 제출물 테이블 (ID, 날짜, 문제, 유저, 상태, 점수)
- Review 모달 (코드 확인, 채점, 피드백 작성)

<!-- Questions Tab -->
- 문제 생성/수정 폼 (ID, Title, Difficulty, Tags, Body)
- 기존 문제 목록
- Built-in vs Custom 구분
- 문제 수정/삭제 버튼
```

#### React 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 탭 전환 | ✅ | Submissions/Questions |
| 제출물 필터 UI | ✅ | 폼만 구현 |
| 제출물 테이블 | ⚠️ | 더미 데이터 1개 |
| Review 버튼 | ⚠️ | 버튼만, 모달 없음 |
| 문제 생성 폼 | ✅ | UI만 |
| 문제 목록 | ⚠️ | 더미 데이터 1개 |
| Firebase 연동 | ❌ | 전체 미구현 |

#### 필요한 작업
- [ ] **제출물 목록 불러오기** (`getAllSubmissions()`)
- [ ] **제출물 필터링 기능**
- [ ] **Review 모달 구현**
- [ ] **채점 기능** (`gradeSubmission()`)
- [ ] **문제 CRUD** (`addQuestion()`, `updateQuestion()`, `deleteQuestion()`)
- [ ] **문제 목록 불러오기** (`getQuestions()`)
- [ ] 제출물 상태별 뱃지
- [ ] 사용자 정보 조회
- [ ] 통계 대시보드 (선택)

---

## 공통 컴포넌트

### 구현된 컴포넌트

| 컴포넌트 | 위치 | 상태 | 사용처 |
|----------|------|------|--------|
| Navbar | `components/Navbar.jsx` | ✅ | 모든 페이지 (데스크톱) |
| AppBar | `components/AppBar.jsx` | ✅ | 모든 페이지 (모바일) |
| TabBar | `components/TabBar.jsx` | ✅ | 모든 페이지 (하단) |
| Modal | `components/Modal.jsx` | ✅ | 기본 모달 |
| AlertModal | `components/AlertModal.jsx` | ✅ | Login, Register |
| ConfirmModal | `components/ConfirmModal.jsx` | ✅ | Navbar (로그아웃) |
| Toast | `components/Toast.jsx` | ✅ | Studio (간단 알림) |
| ProtectedRoute | `components/ProtectedRoute.jsx` | ✅ | 라우팅 |

### FAB (Floating Action Button)

| 버튼 | 위치 | HTML | React | 기능 |
|------|------|------|-------|------|
| QR Scan | Challenges, Profile | ✅ | ⚠️ | AR QR 스캔 (미연결) |
| Run | Studio | ✅ | ✅ | Python 실행 |
| Admin | Challenges, Profile, Studio | ✅ | ✅ | Admin 페이지 이동 |

---

## Firebase 연동 현황

### 구현된 Firebase 함수

#### Auth (`firebase/auth.js`)
- ✅ `registerUser(email, password, displayName)`
- ✅ `loginUser(email, password)`
- ✅ `logoutUser()`
- ✅ `observeAuthState(callback)`
- ✅ `getCurrentUser()`

#### Firestore (`firebase/firestore.js`)
- ✅ `createUserProfile(uid, data)`
- ✅ `getUserProfile(uid)`
- ✅ `updateUserProfile(uid, data)`
- ✅ `saveCollectedBlocks(uid, blocks)`
- ✅ `saveSubmission(uid, questionId, data)`
- ✅ `getUserSubmissions(uid)`
- ✅ `getQuestions()`
- ✅ `addQuestion(questionData)`
- ✅ `updateQuestion(questionId, data)`
- ✅ `gradeSubmission(submissionId, gradeData)`
- ✅ `getAllSubmissions(filters)`

### 사용 중인 연동
- ✅ Login: Firebase Auth
- ✅ Register: Firebase Auth + Firestore 프로필 생성
- ✅ AuthContext: 인증 상태 관찰

### 미연동 (함수는 있으나 사용 안 함)
- ❌ Challenges: `getQuestions()` 미사용
- ❌ Studio: `saveSubmission()` 미사용
- ❌ Profile: `getUserProfile()`, `saveCollectedBlocks()`, `getUserSubmissions()` 미사용
- ❌ Admin: 모든 Firestore 함수 미사용

---

## 우선순위별 구현 필요 기능

### P0: 필수 (Core Functionality)

**1. Studio 제출 기능**
```javascript
// Studio.jsx handleSubmit()
const result = await saveSubmission(currentUser.uid, questionId, {
  code: getPython(),
  workspaceState: Blockly.serialization.workspaces.save(workspaceRef.current)
});
```

**2. Admin 제출물 조회**
```javascript
// Admin.jsx
const { data: submissions } = await getAllSubmissions({ 
  status: filterStatus, 
  questionId: filterQuestion 
});
```

**3. Admin 채점 기능**
```javascript
// Admin.jsx Review Modal
await gradeSubmission(submissionId, {
  grade: 'Accepted',
  score: 100,
  feedback: '잘했습니다!'
});
```

**4. Challenges Firebase 연동**
```javascript
// Challenges.jsx
const { data: questions } = await getQuestions();
setQuestions(questions);
```

---

### P1: 중요 (Enhanced UX)

**5. Profile 챌린지 통계 구현**

HTML에는 있으나 React에 없는 섹션 추가:
```jsx
// Challenge Stats 섹션
<div className="row g-3 equal-row mb-3">
  <div className="col-md-3">
    <div className="panel p-3 h-100">
      <div className="muted small">Solved</div>
      <div className="display-6 fw-bold">{qsSolved}</div>
      <div className="progress mt-2">
        <div className="progress-bar" style={{width: `${solvedPercent}%`}}></div>
      </div>
      <div className="small mt-1">{qsSolved} of {totalQuestions} challenges</div>
    </div>
  </div>
  {/* Attempts, Success Rate, Streak */}
</div>

// Recent Solves 섹션
<div className="panel p-3 mb-3">
  <h6 className="panel-title mb-2">Recent Solves</h6>
  <div className="vstack gap-2">
    {recentSolves.map(solve => (
      <div className="d-flex align-items-center justify-content-between">
        <span className="badge badge-{difficulty}">{difficulty}</span>
        <div className="fw-semibold">{title}</div>
        <div className="small muted">{timestamp}</div>
      </div>
    ))}
  </div>
</div>
```

필요 데이터:
- `getUserSubmissions(uid)` → 제출 기록
- `loadSolvedSet()` → 해결한 문제 ID Set
- `loadSolveLog()` → 제출 로그 (타임스탬프 포함)
- Streak 계산 로직

**6. Profile Firebase 동기화**
```javascript
// Profile.jsx
const { data: profile } = await getUserProfile(currentUser.uid);
const { data: submissions } = await getUserSubmissions(currentUser.uid);

// 블록 수집 시
await saveCollectedBlocks(currentUser.uid, [...collected]);
```

**7. Studio input() 처리**

Pyodide는 기본적으로 `input()`을 지원하지 않으므로 커스텀 구현 필요:
```javascript
// 방법 1: 미리 입력받기
const userInput = prompt('Enter input:');
py.globals.set('input_value', userInput);

// 방법 2: input() 함수 오버라이드
await py.runPythonAsync(`
import sys
def custom_input(prompt=''):
    return '${userInput}'
__builtins__.input = custom_input
`);
```

**8. Admin 문제 관리**
```javascript
// Questions Tab
const handleSubmit = async (formData) => {
  await addQuestion({
    id: formData.id,
    title: formData.title,
    difficulty: formData.difficulty,
    tags: formData.tags.split(',').map(t => t.trim()),
    body: formData.body
  });
};
```

---

### P2: 선택 (Nice to Have)

**9. QR 스캔 AR 기능**
- 블록 수집을 위한 AR 기능
- 딥링크 또는 웹 API 활용
- HTML에는 placeholder만 존재

**10. Remember Me 기능**
```javascript
// Login.jsx
if (rememberMe) {
  localStorage.setItem('rememberMe', 'true');
  // Firebase persistence 설정
  setPersistence(auth, browserLocalPersistence);
}
```

**11. Home 랜딩 페이지**
- HTML에는 없음 (추후 작업 예정)
- Hero 섹션, Feature 소개 등

**12. 고급 기능**
- 문제 태그 자동완성
- 코드 공유/임베드
- 리더보드
- 실시간 협업
- 다크모드

---

## 기술적 고려사항

### 1. 데이터 구조

**Question**
```typescript
interface Question {
  id: string;              // 'sum-1-to-n'
  title: string;           // 'Sum from 1 to n'
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];          // ['math', 'loops']
  body: string;            // HTML 포함 가능
  createdAt: string;
  updatedAt: string;
  createdBy?: string;      // uid
  testCases?: TestCase[];  // 선택
}
```

**Submission**
```typescript
interface Submission {
  id: string;
  userId: string;
  questionId: string;
  code: string;            // Python 코드
  workspaceState: object;  // Blockly JSON
  status: 'pending' | 'graded';
  grade?: 'Accepted' | 'Needs Work' | 'Rejected';
  score?: number;          // 0-100
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
}
```

**UserProfile**
```typescript
interface UserProfile {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  username: string;
  collectedBlocks: string[];     // block IDs
  solvedProblems?: string[];     // question IDs
  createdAt: string;
  updatedAt: string;
}
```

### 2. Firestore 컬렉션 구조

```
/users/{uid}
  - email, displayName, firstName, lastName, username
  - collectedBlocks: []
  - createdAt, updatedAt

/questions/{questionId}
  - title, difficulty, tags, body
  - createdAt, updatedAt, createdBy

/submissions/{submissionId}
  - userId, questionId, code, workspaceState
  - status, grade, score, feedback
  - submittedAt, gradedAt
```

### 3. Pyodide 제약사항

- ✅ 표준 Python 실행 가능
- ❌ `input()` 미지원 → 커스텀 구현 필요
- ❌ 파일 시스템 접근 제한
- ❌ 일부 라이브러리 미지원
- ⚠️ 첫 로드 느림 (~50MB) → 로딩 UI 필요

### 4. 보안 고려사항

- Firestore Security Rules 설정 필요
  - 사용자는 자신의 제출물만 읽기/쓰기
  - 문제는 모두 읽기 가능
  - Admin만 채점 가능
- 코드 실행 제한 (무한루프 방지)
- XSS 방지 (문제 본문 HTML 렌더링 시)

### 5. 성능 최적화

- 문제 목록 캐싱 (React Query 등)
- Blockly workspace 자동저장 debounce
- Pyodide lazy loading
- 이미지 최적화 (favicon, logos)

---

## 요약

### 구현 완료율

| 페이지 | UI | 기능 | Firebase | 완성도 |
|--------|----|----- |----------|---------|
| Login | ✅ | ✅ | ✅ | 95% |
| Register | ✅ | ✅ | ✅ | 95% |
| Challenges | ✅ | ✅ | ❌ | 70% |
| Studio | ✅ | ✅ | ❌ | 75% |
| Profile | ✅ | ⚠️ | ❌ | 60% |
| Admin | ✅ | ❌ | ❌ | 40% |

### 다음 단계 추천 순서

1. **Firebase 연동 완성** (P0)
   - Challenges: 문제 불러오기
   - Studio: 제출 저장
   - Admin: 제출물 조회 및 채점

2. **Profile 완성** (P1)
   - 챌린지 통계 섹션 추가
   - Recent Solves 추가
   - Firebase 동기화

3. **Admin 기능 완성** (P0-P1)
   - Review 모달 구현
   - 문제 CRUD 연동

4. **추가 기능** (P2)
   - Studio input() 처리
   - QR 스캔
   - Remember Me

---

**문서 버전:** 1.0  
**마지막 업데이트:** 2025-10-10

