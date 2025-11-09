# 📝 Firebase 데이터 초기화 스크립트 사용 가이드

**작성일자:** 2025-11-09  
**목적:** 테스트용 문제 및 학생 계정 일괄 생성

---

## 📋 준비 사항

1. Admin 계정으로 로그인
2. 브라우저 개발자 도구 콘솔 열기 (F12)

---

## 🚀 사용 방법

### 1단계: 문제 추가

1. Admin 페이지 (`http://localhost:3000/admin`) 접속
2. **Questions** 탭 클릭
3. 브라우저 콘솔 열기 (F12)
4. `scripts/init-questions-browser.js` 파일 내용을 복사하여 콘솔에 붙여넣기
5. Enter 키로 실행

**예상 결과:**
- `reverse-string` (easy, strings)
- `count-vowels` (medium, strings)
- `max-in-list` (medium, lists, loops)
- `prime-check` (hard, math, loops)

**참고:** `sum-1-to-n`은 이미 브라우저 테스트에서 생성했으므로 제외됩니다.

---

### 2단계: 학생 계정 생성

**방법 1: 터미널 스크립트 사용 (권장)**

1. 프로젝트 루트 디렉토리에서 실행:
   ```bash
   npm run create-students
   ```
   
   또는 직접 실행:
   ```bash
   node scripts/create-students.mjs
   ```

**방법 2: 브라우저 스크립트 사용**

1. Register 페이지 (`http://localhost:3000/register`) 접속
2. 브라우저 콘솔 열기 (F12)
3. `scripts/create-students-browser.js` 파일 내용을 복사하여 콘솔에 붙여넣기
4. Enter 키로 실행

**방법 3: 수동 생성**

Register 페이지에서 각 계정을 수동으로 생성할 수도 있습니다.

**생성될 계정:**
- `student1@test.com` / `student1234` - Student One
- `student2@test.com` / `student1234` - Student Two
- `student3@test.com` / `student1234` - Student Three
- `student4@test.com` / `student1234` - Student Four
- `student5@test.com` / `student1234` - Student Five

---

## 📊 생성될 데이터

### 문제 목록

| ID | 제목 | 난이도 | 태그 |
|----|------|--------|------|
| sum-1-to-n | Sum from 1 to n | easy | math, loops |
| reverse-string | Reverse a String | easy | strings |
| count-vowels | Count Vowels | medium | strings |
| max-in-list | Maximum in List | medium | lists, loops |
| prime-check | Prime Check | hard | math, loops |

### 학생 계정

| 이메일 | 비밀번호 | 이름 |
|--------|----------|------|
| student1@test.com | student1234 | Student One |
| student2@test.com | student1234 | Student Two |
| student3@test.com | student1234 | Student Three |
| student4@test.com | student1234 | Student Four |
| student5@test.com | student1234 | Student Five |

---

## ⚠️ 주의 사항

1. **중복 방지:** 이미 존재하는 문제/계정은 자동으로 건너뜁니다.
2. **에러 처리:** 각 항목 생성 시 에러가 발생하면 다음 항목으로 진행합니다.
3. **API 제한:** Firebase API 호출 제한을 방지하기 위해 각 요청 사이에 딜레이가 있습니다.

---

## 🔍 확인 방법

### 문제 확인
- Admin 페이지 → Questions 탭에서 생성된 문제 확인
- Challenges 페이지에서 태그 필터 테스트

### 학생 계정 확인
- Login 페이지에서 각 계정으로 로그인 테스트
- 또는 Firebase 콘솔에서 `users` 컬렉션 확인

---

## 📝 스크립트 파일 위치

- `blockhunt/scripts/init-questions-browser.js` - 문제 추가 스크립트 (브라우저 콘솔용)
- `blockhunt/scripts/create-students.mjs` - 학생 계정 생성 스크립트 (터미널용)
- `blockhunt/scripts/create-students-browser.js` - 학생 계정 생성 스크립트 (브라우저 콘솔용)

---

**작성일자:** 2025-11-09

