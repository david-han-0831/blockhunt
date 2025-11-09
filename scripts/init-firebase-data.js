/**
 * BlockHunt Firebase 데이터 초기화 스크립트
 * 
 * 사용 방법:
 * 1. Admin 계정으로 로그인한 상태에서 브라우저 콘솔 열기 (F12)
 * 2. 이 스크립트를 복사하여 콘솔에 붙여넣기
 * 3. 실행
 * 
 * 주의: 이미 존재하는 문제/사용자는 건너뜁니다.
 */

// QUESTIONS 배열 (Challenges.jsx에서 가져옴)
const QUESTIONS = [
  {
    id: 'sum-1-to-n',
    title: 'Sum from 1 to n',
    difficulty: 'easy',
    tags: ['math', 'loops'],
    body: `Write a program that reads an integer <em>n</em> and prints the sum 1+2+...+n.
If <em>n</em> is negative, print <code>0</code>. Example: input <code>5</code> → output <code>15</code>.`
  },
  {
    id: 'reverse-string',
    title: 'Reverse a String',
    difficulty: 'easy',
    tags: ['strings'],
    body: `Read a line of text and print it reversed. Example: <code>hello</code> → <code>olleh</code>.`
  },
  {
    id: 'count-vowels',
    title: 'Count Vowels',
    difficulty: 'medium',
    tags: ['strings'],
    body: `Read a string and print the number of vowels (a,e,i,o,u). Case-insensitive.`
  },
  {
    id: 'max-in-list',
    title: 'Maximum in List',
    difficulty: 'medium',
    tags: ['lists', 'loops'],
    body: `Read an integer <em>n</em>, then read <em>n</em> integers. Print the maximum value.`
  },
  {
    id: 'prime-check',
    title: 'Prime Check',
    difficulty: 'hard',
    tags: ['math', 'loops'],
    body: `Read an integer and print <code>YES</code> if it is prime, otherwise <code>NO</code>.`
  }
];

// 테스트 학생 계정 데이터
const TEST_STUDENTS = [
  {
    email: 'student1@test.com',
    password: 'student1234',
    displayName: 'Student One',
    firstName: 'Student',
    lastName: 'One',
    username: 'student1'
  },
  {
    email: 'student2@test.com',
    password: 'student1234',
    displayName: 'Student Two',
    firstName: 'Student',
    lastName: 'Two',
    username: 'student2'
  },
  {
    email: 'student3@test.com',
    password: 'student1234',
    displayName: 'Student Three',
    firstName: 'Student',
    lastName: 'Three',
    username: 'student3'
  },
  {
    email: 'student4@test.com',
    password: 'student1234',
    displayName: 'Student Four',
    firstName: 'Student',
    lastName: 'Four',
    username: 'student4'
  },
  {
    email: 'student5@test.com',
    password: 'student1234',
    displayName: 'Student Five',
    firstName: 'Student',
    lastName: 'Five',
    username: 'student5'
  }
];

// Firebase 함수 import (브라우저에서 실행 시)
async function initFirebaseData() {
  console.log('🚀 Firebase 데이터 초기화 시작...\n');
  
  // Firebase 모듈 import 확인
  if (typeof window === 'undefined' || !window.firebase) {
    console.error('❌ Firebase가 로드되지 않았습니다. 페이지를 새로고침하세요.');
    return;
  }

  // React 앱의 Firebase 함수 사용
  // Admin 페이지가 열려있어야 addQuestion 함수를 사용할 수 있습니다.
  
  console.log('📝 문제 추가 중...');
  await addQuestions();
  
  console.log('\n👥 학생 계정 생성 중...');
  await createStudents();
  
  console.log('\n✅ 초기화 완료!');
}

// 문제 추가 함수
async function addQuestions() {
  // Admin 페이지의 addQuestion 함수 사용
  // 또는 직접 Firebase 호출
  
  const { addQuestion } = await import('./src/firebase/firestore.js');
  const { auth } = await import('./src/firebase/firebaseConfig.js');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('❌ 로그인이 필요합니다.');
    return;
  }
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const question of QUESTIONS) {
    try {
      // 이미 존재하는지 확인
      const { getQuestions } = await import('./src/firebase/firestore.js');
      const existing = await getQuestions();
      
      if (existing.success && existing.data.some(q => q.id === question.id)) {
        console.log(`⏭️  "${question.title}" 이미 존재함 - 건너뜀`);
        skipCount++;
        continue;
      }
      
      const result = await addQuestion({
        ...question,
        createdBy: currentUser.uid,
        isActive: true,
        isBuiltIn: false
      });
      
      if (result.success) {
        console.log(`✅ "${question.title}" 추가 완료`);
        successCount++;
      } else {
        console.error(`❌ "${question.title}" 추가 실패:`, result.error);
        errorCount++;
      }
      
      // API 호출 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ "${question.title}" 오류:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 문제 추가 결과: 성공 ${successCount}, 건너뜀 ${skipCount}, 실패 ${errorCount}`);
}

// 학생 계정 생성 함수
async function createStudents() {
  const { registerUser } = await import('./src/firebase/auth.js');
  const { createUserProfile } = await import('./src/firebase/firestore.js');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const student of TEST_STUDENTS) {
    try {
      // 계정 생성
      const result = await registerUser(
        student.email,
        student.password,
        student.displayName
      );
      
      if (result.success) {
        // 프로필 생성
        await createUserProfile(result.user.uid, {
          email: student.email,
          displayName: student.displayName,
          firstName: student.firstName,
          lastName: student.lastName,
          username: student.username,
          collectedBlocks: [],
          role: 'user'
        });
        
        console.log(`✅ "${student.displayName}" 계정 생성 완료`);
        successCount++;
      } else {
        if (result.error.includes('already-in-use')) {
          console.log(`⏭️  "${student.displayName}" 이미 존재함 - 건너뜀`);
          skipCount++;
        } else {
          console.error(`❌ "${student.displayName}" 생성 실패:`, result.error);
          errorCount++;
        }
      }
      
      // API 호출 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ "${student.displayName}" 오류:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 학생 계정 생성 결과: 성공 ${successCount}, 건너뜀 ${skipCount}, 실패 ${errorCount}`);
}

// 실행
initFirebaseData();

