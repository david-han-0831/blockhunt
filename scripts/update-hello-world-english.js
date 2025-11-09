/**
 * Hello World 문제 한국어 텍스트 영어로 변환 스크립트
 * 
 * 사용 방법:
 * 1. Admin 계정으로 로그인
 * 2. Admin 페이지 (http://localhost:3000/admin)에서 Questions 탭 열기
 * 3. 브라우저 콘솔 열기 (F12)
 * 4. 이 스크립트를 복사하여 콘솔에 붙여넣기 후 실행
 */

(async function updateHelloWorldQuestion() {
  console.log('🔄 Hello World 문제 업데이트 시작...\n');
  
  try {
    // React 앱의 Firebase 함수 사용
    const { updateQuestion } = await import('./src/firebase/firestore.js');
    
    const questionId = 'hello-world';
    const updatedData = {
      body: 'This is the first test problem. Print "Hello World" to get started.'
    };
    
    console.log(`📝 문제 ID: ${questionId}`);
    console.log(`📝 업데이트 내용: ${updatedData.body}\n`);
    
    const result = await updateQuestion(questionId, updatedData);
    
    if (result.success) {
      console.log('✅ 문제 업데이트 완료!');
      console.log('   페이지를 새로고침하여 변경사항을 확인하세요.');
    } else {
      console.error('❌ 문제 업데이트 실패:', result.error);
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.log('\n💡 대안: Admin 페이지의 Questions 탭에서 직접 수정하세요.');
    console.log('   1. "Hello World" 문제의 "Edit" 버튼 클릭');
    console.log('   2. Question Body 필드를 다음으로 변경:');
    console.log('      "This is the first test problem. Print \\"Hello World\\" to get started."');
    console.log('   3. "Update" 버튼 클릭');
  }
})();

