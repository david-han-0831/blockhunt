/**
 * BlockHunt 학생 계정 생성 스크립트 (Node.js)
 * 
 * 사용 방법:
 * 1. .env.local 또는 .env 파일이 있으면 자동으로 로드됩니다
 * 2. 터미널에서 실행: node scripts/create-students.mjs
 * 
 * 또는 npm 스크립트 사용:
 * npm run create-students
 * 
 * 주의: 이 스크립트는 ES modules를 사용합니다 (.mjs 확장자).
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 현재 파일의 디렉토리 경로
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드 (.env.local 우선, 없으면 .env)
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  try {
    const envPath = join(__dirname, '..', envFile);
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      // 주석이나 빈 줄 건너뛰기
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
    console.log(`✅ ${envFile} 파일 로드 완료`);
    break; // 첫 번째로 찾은 파일만 사용
  } catch (error) {
    // 파일이 없으면 다음 파일 시도
    continue;
  }
}

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

// 학생 계정 생성 함수
async function createStudentAccount(student) {
  try {
    // 계정 생성
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      student.email,
      student.password
    );
    
    // 프로필 업데이트
    await updateProfile(userCredential.user, {
      displayName: student.displayName
    });
    
    // Firestore에 프로필 저장
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: student.email,
      displayName: student.displayName,
      firstName: student.firstName,
      lastName: student.lastName,
      username: student.username,
      collectedBlocks: [],
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return { success: true, uid: userCredential.user.uid };
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, error: 'already-exists', message: error.message };
    }
    return { success: false, error: error.code, message: error.message };
  }
}

// 메인 함수
async function main() {
  console.log('🚀 학생 계정 생성 시작...\n');
  
// Firebase 설정 확인
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
  console.error('❌ Firebase 설정이 없습니다.');
  console.error('   .env.local 또는 .env 파일에 REACT_APP_FIREBASE_* 환경 변수를 설정하세요.');
  console.error('\n현재 로드된 환경 변수:');
  console.error(`   REACT_APP_FIREBASE_API_KEY: ${firebaseConfig.apiKey ? '✅' : '❌'}`);
  console.error(`   REACT_APP_FIREBASE_AUTH_DOMAIN: ${firebaseConfig.authDomain ? '✅' : '❌'}`);
  console.error(`   REACT_APP_FIREBASE_PROJECT_ID: ${firebaseConfig.projectId ? '✅' : '❌'}`);
  console.error(`   REACT_APP_FIREBASE_STORAGE_BUCKET: ${firebaseConfig.storageBucket ? '✅' : '❌'}`);
  console.error(`   REACT_APP_FIREBASE_MESSAGING_SENDER_ID: ${firebaseConfig.messagingSenderId ? '✅' : '❌'}`);
  console.error(`   REACT_APP_FIREBASE_APP_ID: ${firebaseConfig.appId ? '✅' : '❌'}`);
  process.exit(1);
}
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const student of TEST_STUDENTS) {
    const result = await createStudentAccount(student);
    
    if (result.success) {
      console.log(`✅ "${student.displayName}" 계정 생성 완료 (${student.email})`);
      successCount++;
    } else if (result.error === 'already-exists') {
      console.log(`⏭️  "${student.displayName}" 이미 존재함 - 건너뜀 (${student.email})`);
      skipCount++;
    } else {
      console.error(`❌ "${student.displayName}" 생성 실패: ${result.message}`);
      errorCount++;
    }
    
    // API 호출 제한 방지를 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 학생 계정 생성 결과:`);
  console.log(`   성공: ${successCount}`);
  console.log(`   건너뜀: ${skipCount}`);
  console.log(`   실패: ${errorCount}`);
  console.log('\n✅ 완료!');
  
  process.exit(0);
}

// 실행
main().catch(error => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});

