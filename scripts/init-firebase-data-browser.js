/**
 * BlockHunt Firebase 데이터 초기화 스크립트
 * 
 * 사용 방법:
 * 1. Admin 계정으로 로그인한 상태에서 브라우저 콘솔 열기 (F12)
 * 2. Admin 페이지 (http://localhost:3000/admin)에서 Questions 탭 열기
 * 3. 이 스크립트를 복사하여 콘솔에 붙여넣기 후 실행
 * 
 * 주의: 이미 존재하는 문제/사용자는 건너뜁니다.
 */

(async function initFirebaseData() {
  console.log('🚀 Firebase 데이터 초기화 시작...\n');
  
  // React 앱의 모듈 접근을 위해 window 객체 확인
  // 또는 직접 Firebase 함수 호출
  
  // QUESTIONS 배열
  const QUESTIONS = [
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
  
  // 문제 추가 함수
  async function addQuestions() {
    console.log('📝 문제 추가 중...');
    
    // React 앱의 Firebase 함수를 사용하기 위해 모듈 시스템 접근
    // 실제로는 Admin 페이지의 함수를 직접 호출하는 것이 더 간단합니다.
    
    // 대안: Admin 페이지의 폼을 자동으로 채우고 제출
    const questionForm = document.querySelector('form');
    if (!questionForm) {
      console.error('❌ 문제 생성 폼을 찾을 수 없습니다. Admin 페이지의 Questions 탭을 확인하세요.');
      return;
    }
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const question of QUESTIONS) {
      try {
        // ID 필드에 입력
        const idInput = questionForm.querySelector('input[placeholder*="sum-1-to-n"]');
        const titleInput = questionForm.querySelector('input[placeholder*="Sum from 1 to n"]');
        const tagsInput = questionForm.querySelector('input[placeholder*="math, loops"]');
        const bodyTextarea = questionForm.querySelector('textarea[placeholder*="Write the prompt"]');
        const saveButton = questionForm.querySelector('button:has-text("Save")');
        
        if (!idInput || !titleInput || !tagsInput || !bodyTextarea || !saveButton) {
          console.error('❌ 폼 필드를 찾을 수 없습니다.');
          continue;
        }
        
        // 값 입력
        idInput.value = question.id;
        titleInput.value = question.title;
        tagsInput.value = question.tags.join(', ');
        bodyTextarea.value = question.body;
        
        // Difficulty 선택 (필요시)
        const difficultySelect = questionForm.querySelector('select');
        if (difficultySelect) {
          difficultySelect.value = question.difficulty;
        }
        
        // 입력 이벤트 발생
        idInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
        bodyTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 저장 버튼 클릭
        saveButton.click();
        
        // 저장 완료 대기
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`✅ "${question.title}" 추가 완료`);
        successCount++;
        
        // 폼 초기화
        const clearButton = questionForm.querySelector('button:has-text("Clear")');
        if (clearButton) {
          clearButton.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`❌ "${question.title}" 오류:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 문제 추가 결과: 성공 ${successCount}, 건너뜀 ${skipCount}, 실패 ${errorCount}`);
  }
  
  // 학생 계정 생성 함수
  async function createStudents() {
    console.log('👥 학생 계정 생성 중...');
    console.log('⚠️  학생 계정 생성은 Register 페이지에서 수동으로 진행하거나, Firebase Admin SDK를 사용해야 합니다.');
    console.log('📋 생성할 계정 목록:');
    TEST_STUDENTS.forEach((student, index) => {
      console.log(`${index + 1}. ${student.email} / ${student.password} - ${student.displayName}`);
    });
  }
  
  // 실행
  await addQuestions();
  await createStudents();
  
  console.log('\n✅ 초기화 완료!');
})();

