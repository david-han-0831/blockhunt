/**
 * BlockHunt 학생 계정 생성 스크립트 (브라우저 콘솔용)
 * 
 * 사용 방법:
 * 1. Register 페이지 (http://localhost:3000/register) 열기
 * 2. 브라우저 콘솔 열기 (F12)
 * 3. 이 스크립트를 복사하여 콘솔에 붙여넣기 후 실행
 * 
 * 주의: 이미 존재하는 계정은 건너뜁니다.
 */

(async function createStudentAccounts() {
  console.log('🚀 학생 계정 생성 시작...\n');
  
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
  
  const form = document.querySelector('form');
  if (!form) {
    console.error('❌ Register 폼을 찾을 수 없습니다. Register 페이지를 확인하세요.');
    return;
  }
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const student of TEST_STUDENTS) {
    try {
      // 폼 필드 찾기
      const emailInput = form.querySelector('input[type="email"]');
      const passwordInput = form.querySelector('input[type="password"]');
      const displayNameInput = form.querySelector('input[name*="display"]') || form.querySelector('input[placeholder*="Name"]');
      const firstNameInput = form.querySelector('input[name*="first"]');
      const lastNameInput = form.querySelector('input[name*="last"]');
      const usernameInput = form.querySelector('input[name*="username"]');
      const submitButton = form.querySelector('button[type="submit"]');
      
      if (!emailInput || !passwordInput || !submitButton) {
        console.error('❌ 필수 폼 필드를 찾을 수 없습니다.');
        continue;
      }
      
      // 값 입력
      emailInput.value = student.email;
      passwordInput.value = student.password;
      
      if (displayNameInput) displayNameInput.value = student.displayName;
      if (firstNameInput) firstNameInput.value = student.firstName;
      if (lastNameInput) lastNameInput.value = student.lastName;
      if (usernameInput) usernameInput.value = student.username;
      
      // React 상태 업데이트를 위한 이벤트 발생
      ['input', 'change'].forEach(eventType => {
        emailInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        passwordInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        if (displayNameInput) displayNameInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        if (firstNameInput) firstNameInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        if (lastNameInput) lastNameInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        if (usernameInput) usernameInput.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      // 제출 버튼 클릭
      submitButton.click();
      
      // 제출 완료 대기 (최대 10초)
      let waited = 0;
      while (submitButton.disabled && waited < 10000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waited += 100;
      }
      
      // 추가 대기 (서버 응답 및 리다이렉트 대기)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 성공 여부 확인 (에러 메시지 또는 성공 메시지 확인)
      const errorMessage = document.querySelector('.error, .alert-danger, [role="alert"]');
      if (errorMessage && errorMessage.textContent.includes('already')) {
        console.log(`⏭️  "${student.email}" 이미 존재함 - 건너뜀`);
        skipCount++;
      } else {
        console.log(`✅ "${student.displayName}" 계정 생성 완료`);
        successCount++;
      }
      
      // 폼 초기화
      form.reset();
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ "${student.email}" 오류:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 학생 계정 생성 결과: 성공 ${successCount}, 건너뜀 ${skipCount}, 실패 ${errorCount}`);
  console.log('\n✅ 완료!');
})();

