# BlockHunt Firestore 스키마

> BlockHunt 애플리케이션의 Firestore 데이터베이스 구조 및 데이터 모델 정의

**작성일:** 2025-10-10  
**버전:** 1.0

---

## 📋 목차

1. [컬렉션 구조](#컬렉션-구조)
2. [데이터 모델](#데이터-모델)
3. [보안 규칙](#보안-규칙)
4. [인덱스 설정](#인덱스-설정)
5. [사용 예시](#사용-예시)

---

## 컬렉션 구조

```
📁 /users/{uid}
📁 /questions/{questionId}
📁 /submissions/{submissionId}
📁 /collectedBlocks/{uid} (선택적)
📁 /testCases/{questionId} (선택적)
```

---

## 데이터 모델

### 1. Users 컬렉션 (`/users/{uid}`)

사용자 프로필 및 설정 정보를 저장합니다.

```typescript
interface User {
  // 기본 정보
  email: string;                    // "user@example.com"
  displayName: string;              // "John Doe"
  firstName: string;                // "John"
  lastName: string;                 // "Doe"
  username: string;                 // "john_doe"
  
  // 권한 및 역할
  role: 'user' | 'admin';           // "user" (기본값)
  
  // 수집한 블록 정보
  collectedBlocks: string[];        // ["controls_if", "math_number", ...]
  
  // 해결한 문제 (선택적, 통계용)
  solvedProblems?: string[];        // ["sum-1-to-n", "reverse-string"]
  
  // 메타데이터
  createdAt: string;                // ISO 8601 형식
  updatedAt: string;                // ISO 8601 형식
  lastLoginAt?: string;             // 마지막 로그인 시간
}
```

**예시 문서:**
```json
{
  "email": "admin@admin.com",
  "displayName": "Admin",
  "firstName": "Admin",
  "lastName": "Admin",
  "username": "Admin",
  "role": "admin",
  "collectedBlocks": ["controls_if", "math_number", "text_print"],
  "solvedProblems": [],
  "createdAt": "2025-10-09T12:37:53.155Z",
  "updatedAt": "2025-10-09T12:37:53.155Z",
  "lastLoginAt": "2025-10-10T09:30:00.000Z"
}
```

---

### 2. Questions 컬렉션 (`/questions/{questionId}`)

프로그래밍 문제 정보를 저장합니다.

```typescript
interface Question {
  // 기본 정보
  id: string;                       // "sum-1-to-n" (문서 ID와 동일)
  title: string;                    // "Sum from 1 to n"
  difficulty: 'easy' | 'medium' | 'hard';  // "easy"
  
  // 문제 내용
  body: string;                     // HTML 형식 문제 설명
  description?: string;             // 간단한 설명 (검색용)
  
  // 태그 및 분류
  tags: string[];                   // ["math", "loops"]
  category?: string;                // "Basic Programming"
  
  // 테스트 케이스 (선택적)
  testCases?: TestCase[];           // 입력/출력 예시
  
  // 힌트 및 추가 정보
  hints?: string[];                 // ["Think about loops", "Consider edge cases"]
  timeLimit?: number;               // 초 단위 (기본값: 300초)
  memoryLimit?: number;             // MB 단위 (기본값: 128MB)
  
  // 관리 정보
  createdBy: string;                // 생성자 UID
  isActive: boolean;                // 활성화 여부 (기본값: true)
  isBuiltIn: boolean;               // 내장 문제 여부 (기본값: false)
  
  // 통계 (선택적)
  stats?: {
    totalSubmissions: number;       // 총 제출 수
    acceptedSubmissions: number;    // 정답 수
    averageScore: number;           // 평균 점수
  };
  
  // 메타데이터
  createdAt: string;                // ISO 8601 형식
  updatedAt: string;                // ISO 8601 형식
  publishedAt?: string;             // 공개된 시간
}

interface TestCase {
  input: string;                    // 입력 예시
  output: string;                   // 예상 출력
  description?: string;             // 테스트 케이스 설명
  isHidden?: boolean;               // 숨겨진 테스트 케이스 (기본값: false)
}
```

**예시 문서:**
```json
{
  "id": "sum-1-to-n",
  "title": "Sum from 1 to n",
  "difficulty": "easy",
  "body": "Write a program that reads an integer <em>n</em> and prints the sum 1+2+...+n.<br/>If <em>n</em> is negative, print <code>0</code>. Example: input <code>5</code> → output <code>15</code>.",
  "description": "Calculate the sum of integers from 1 to n",
  "tags": ["math", "loops"],
  "category": "Basic Programming",
  "testCases": [
    {
      "input": "5",
      "output": "15",
      "description": "Positive number example"
    },
    {
      "input": "-3",
      "output": "0",
      "description": "Negative number example"
    },
    {
      "input": "0",
      "output": "0",
      "description": "Zero example"
    }
  ],
  "hints": [
    "Use a loop to iterate from 1 to n",
    "Handle the case where n is negative"
  ],
  "timeLimit": 300,
  "memoryLimit": 128,
  "createdBy": "S80Pp6ZTa3SR4fAK6rrlj4HUDYI3",
  "isActive": true,
  "isBuiltIn": true,
  "stats": {
    "totalSubmissions": 150,
    "acceptedSubmissions": 120,
    "averageScore": 85.5
  },
  "createdAt": "2025-10-01T00:00:00.000Z",
  "updatedAt": "2025-10-10T15:30:00.000Z",
  "publishedAt": "2025-10-01T00:00:00.000Z"
}
```

---

### 3. Submissions 컬렉션 (`/submissions/{submissionId}`)

사용자의 제출물 및 채점 결과를 저장합니다.

```typescript
interface Submission {
  // 기본 정보
  id: string;                       // 자동 생성된 문서 ID
  userId: string;                   // 제출자 UID
  questionId: string;               // 문제 ID
  
  // 제출 내용
  code: string;                     // Python 코드
  workspaceState: object;           // Blockly 워크스페이스 JSON
  
  // 채점 정보
  status: 'pending' | 'graded' | 'failed';  // "pending"
  grade?: 'Accepted' | 'Needs Work' | 'Rejected';  // "Accepted"
  score?: number;                   // 0-100 점수
  feedback?: string;                // 교수자 피드백
  
  // 실행 결과 (선택적)
  executionResult?: {
    output: string;                 // 실행 출력
    error?: string;                 // 실행 에러
    executionTime: number;          // 실행 시간 (ms)
    memoryUsed: number;             // 사용 메모리 (MB)
  };
  
  // 자동 채점 결과 (선택적)
  autoGrading?: {
    testCasesPassed: number;        // 통과한 테스트 케이스 수
    totalTestCases: number;         // 전체 테스트 케이스 수
    passed: boolean;                // 모든 테스트 통과 여부
  };
  
  // 메타데이터
  submittedAt: string;              // 제출 시간 (ISO 8601)
  gradedAt?: string;                // 채점 시간 (ISO 8601)
  gradedBy?: string;                // 채점자 UID
}
```

**예시 문서:**
```json
{
  "id": "sub_123456789",
  "userId": "user_abc123",
  "questionId": "sum-1-to-n",
  "code": "n = int(input())\nprint(0 if n < 0 else n * (n + 1) // 2)",
  "workspaceState": {
    "blocks": {
      "languageVersion": 0,
      "blocks": [
        {
          "type": "variables_set",
          "id": "var_1",
          "x": 20,
          "y": 20,
          "fields": {"VAR": {"id": "n", "name": "n"}},
          "inputs": {"VALUE": {"block": {"type": "math_number", "fields": {"NUM": 5}}}}
        }
      ]
    }
  },
  "status": "graded",
  "grade": "Accepted",
  "score": 100,
  "feedback": "Excellent solution! You handled the negative case correctly.",
  "executionResult": {
    "output": "15",
    "executionTime": 45,
    "memoryUsed": 12.5
  },
  "autoGrading": {
    "testCasesPassed": 3,
    "totalTestCases": 3,
    "passed": true
  },
  "submittedAt": "2025-10-10T14:30:00.000Z",
  "gradedAt": "2025-10-10T14:35:00.000Z",
  "gradedBy": "S80Pp6ZTa3SR4fAK6rrlj4HUDYI3"
}
```

---

### 4. CollectedBlocks 컬렉션 (`/collectedBlocks/{uid}`) (선택적)

사용자가 수집한 블록 정보를 별도로 저장합니다. (Users 컬렉션과 중복될 수 있음)

```typescript
interface CollectedBlocks {
  userId: string;                   // 사용자 UID (문서 ID와 동일)
  blocks: string[];                 // 수집한 블록 ID 배열
  lastUpdated: string;              // 마지막 업데이트 시간
}
```

---

## 보안 규칙

Firestore Security Rules 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users: 본인만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Questions: 모든 인증된 사용자가 읽기, Admin만 쓰기
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Submissions: 본인 제출물은 읽기/쓰기, Admin은 모든 제출물 읽기/쓰기
    match /submissions/{submissionId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // CollectedBlocks: 본인만 접근
    match /collectedBlocks/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 인덱스 설정

복합 쿼리를 위한 인덱스:

### Questions 컬렉션
```javascript
// 난이도별 정렬
- Collection: questions
- Fields: difficulty (Ascending), createdAt (Descending)

// 태그별 검색
- Collection: questions  
- Fields: tags (Arrays), difficulty (Ascending)

// 활성 문제만 조회
- Collection: questions
- Fields: isActive (Ascending), difficulty (Ascending)
```

### Submissions 컬렉션
```javascript
// 사용자별 제출물 조회
- Collection: submissions
- Fields: userId (Ascending), submittedAt (Descending)

// 문제별 제출물 조회
- Collection: submissions
- Fields: questionId (Ascending), submittedAt (Descending)

// 상태별 제출물 조회 (Admin용)
- Collection: submissions
- Fields: status (Ascending), submittedAt (Descending)

// 문제별 상태별 조회
- Collection: submissions
- Fields: questionId (Ascending), status (Ascending), submittedAt (Descending)
```

---

## 사용 예시

### 1. 문제 생성 (Admin)

```javascript
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const createQuestion = async (questionData) => {
  try {
    const docRef = await addDoc(collection(db, 'questions'), {
      ...questionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.uid,
      isActive: true,
      isBuiltIn: false
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### 2. 문제 목록 조회

```javascript
import { getDocs, collection, query, where, orderBy } from 'firebase/firestore';

const getQuestions = async (filters = {}) => {
  try {
    let q = query(
      collection(db, 'questions'),
      where('isActive', '==', true),
      orderBy('difficulty', 'asc'),
      orderBy('createdAt', 'desc')
    );
    
    if (filters.difficulty) {
      q = query(q, where('difficulty', '==', filters.difficulty));
    }
    
    const querySnapshot = await getDocs(q);
    const questions = [];
    querySnapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: questions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### 3. 제출물 저장

```javascript
const saveSubmission = async (userId, questionId, submissionData) => {
  try {
    const docRef = await addDoc(collection(db, 'submissions'), {
      userId,
      questionId,
      code: submissionData.code,
      workspaceState: submissionData.workspaceState,
      status: 'pending',
      submittedAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### 4. 사용자별 제출물 조회

```javascript
const getUserSubmissions = async (userId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'submissions'),
      where('userId', '==', userId),
      orderBy('submittedAt', 'desc')
    );
    
    if (filters.questionId) {
      q = query(q, where('questionId', '==', filters.questionId));
    }
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    const querySnapshot = await getDocs(q);
    const submissions = [];
    querySnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: submissions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

---

## 데이터 마이그레이션

### 기존 로컬 데이터를 Firestore로 이전

1. **Questions 데이터 이전**
```javascript
// 기존 QUESTIONS 배열을 Firestore에 저장
const migrateQuestions = async () => {
  const QUESTIONS = [
    {
      id: 'sum-1-to-n',
      title: 'Sum from 1 to n',
      difficulty: 'easy',
      tags: ['math','loops'],
      body: 'Write a program that reads an integer...'
    }
    // ... 기타 문제들
  ];
  
  for (const question of QUESTIONS) {
    await createQuestion({
      ...question,
      createdBy: 'S80Pp6ZTa3SR4fAK6rrlj4HUDYI3', // Admin UID
      isBuiltIn: true
    });
  }
};
```

2. **사용자 프로필 동기화**
```javascript
// localStorage의 사용자 데이터를 Firestore로 동기화
const syncUserProfile = async (user) => {
  const result = await getUserProfile(user.uid);
  if (!result.success) {
    // 프로필이 없으면 생성
    await createUserProfile(user.uid, {
      email: user.email,
      displayName: user.displayName,
      firstName: user.displayName?.split(' ')[0] || '',
      lastName: user.displayName?.split(' ')[1] || '',
      username: user.email.split('@')[0],
      role: 'user',
      collectedBlocks: []
    });
  }
};
```

---

## 성능 최적화

### 1. 캐싱 전략
- Questions: 클라이언트에서 캐싱 (변경 빈도 낮음)
- Submissions: 실시간 조회 (변경 빈도 높음)
- User Profile: AuthContext에서 관리

### 2. 페이지네이션
```javascript
// 20개씩 페이지네이션
const getQuestionsPaginated = async (lastDoc = null) => {
  let q = query(
    collection(db, 'questions'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const querySnapshot = await getDocs(q);
  const questions = [];
  querySnapshot.forEach((doc) => {
    questions.push({ id: doc.id, ...doc.data() });
  });
  
  return {
    questions,
    lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
  };
};
```

### 3. 실시간 업데이트 (선택적)
```javascript
// Admin 대시보드에서 실시간 제출물 모니터링
const unsubscribe = onSnapshot(
  query(collection(db, 'submissions'), where('status', '==', 'pending')),
  (snapshot) => {
    const pendingSubmissions = [];
    snapshot.forEach((doc) => {
      pendingSubmissions.push({ id: doc.id, ...doc.data() });
    });
    setPendingSubmissions(pendingSubmissions);
  }
);
```

---

## 모니터링 및 분석

### 1. 사용량 추적
- 제출 수, 문제 해결율, 사용자 활동
- Firestore 사용량 및 비용 모니터링

### 2. 에러 추적
- 제출 실패, 채점 오류 로깅
- 사용자 피드백 수집

### 3. 성능 메트릭
- 쿼리 응답 시간
- 대용량 데이터 처리 최적화

---

**문서 버전:** 1.0  
**마지막 업데이트:** 2025-10-10  
**다음 검토 예정:** 2025-11-10
