/**
 * BlockHunt Firebase 데이터 초기화 스크립트 (브라우저 콘솔용)
 * 
 * 사용 방법:
 * 1. Admin 계정으로 로그인
 * 2. Admin 페이지 (http://localhost:3000/admin)에서 Questions 탭 열기
 * 3. 브라우저 콘솔 열기 (F12)
 * 4. 이 스크립트를 복사하여 콘솔에 붙여넣기 후 실행
 * 
 * 주의: 이미 존재하는 문제는 건너뜁니다.
 */

(async function initFirebaseData() {
  console.log('🚀 Firebase 데이터 초기화 시작...\n');
  
  // QUESTIONS 배열 (sum-1-to-n은 이미 생성했으므로 제외)
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
  
  // 문제 추가 함수
  async function addQuestions() {
    console.log('📝 문제 추가 중...');
    
    const form = document.getElementById('questionForm');
    if (!form) {
      console.error('❌ 문제 생성 폼을 찾을 수 없습니다. Admin 페이지의 Questions 탭을 확인하세요.');
      return;
    }
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const question of QUESTIONS) {
      try {
        // 폼 필드 찾기
        const idInput = form.querySelector('input[name="id"]');
        const titleInput = form.querySelector('input[name="title"]');
        const tagsInput = form.querySelector('input[name="tags"]');
        const bodyTextarea = form.querySelector('textarea[name="body"]');
        const difficultySelect = form.querySelector('select[name="difficulty"]');
        const saveButton = form.querySelector('button[type="submit"]');
        
        if (!idInput || !titleInput || !tagsInput || !bodyTextarea || !difficultySelect || !saveButton) {
          console.error('❌ 폼 필드를 찾을 수 없습니다.');
          continue;
        }
        
        // 이미 존재하는지 확인 (간단한 체크)
        const existingQuestions = Array.from(document.querySelectorAll('.panel h6 + div')).find(el => 
          el.textContent.includes(question.id)
        );
        
        if (existingQuestions) {
          console.log(`⏭️  "${question.title}" 이미 존재함 - 건너뜀`);
          skipCount++;
          continue;
        }
        
        // 값 입력
        idInput.value = question.id;
        titleInput.value = question.title;
        tagsInput.value = question.tags.join(', ');
        bodyTextarea.value = question.body;
        difficultySelect.value = question.difficulty;
        
        // React 상태 업데이트를 위한 이벤트 발생
        ['input', 'change'].forEach(eventType => {
          idInput.dispatchEvent(new Event(eventType, { bubbles: true }));
          titleInput.dispatchEvent(new Event(eventType, { bubbles: true }));
          tagsInput.dispatchEvent(new Event(eventType, { bubbles: true }));
          bodyTextarea.dispatchEvent(new Event(eventType, { bubbles: true }));
          difficultySelect.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        // 저장 버튼 클릭
        saveButton.click();
        
        // 저장 완료 대기 (최대 5초)
        let waited = 0;
        while (saveButton.disabled && waited < 5000) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waited += 100;
        }
        
        // 추가 대기 (서버 응답 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`✅ "${question.title}" 추가 완료`);
        successCount++;
        
        // 폼 초기화 (Clear 버튼 클릭)
        const clearButton = form.querySelector('button[type="reset"]');
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
  
  // 실행
  await addQuestions();
  
  console.log('\n✅ 문제 추가 완료!');
  console.log('\n📋 다음 단계: 학생 계정 생성');
  console.log('학생 계정은 Register 페이지에서 수동으로 생성하거나, Firebase Admin SDK를 사용하여 생성할 수 있습니다.');
})();

