import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  increment,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// 사용자 프로필 생성/업데이트
export const createUserProfile = async (uid, data) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 사용자 프로필 가져오기
export const getUserProfile = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 이메일과 유저 이름으로 사용자 찾기
export const findUserByEmailAndUsername = async (email, username) => {
  try {
    // 이메일로 먼저 확인 (보안: limit 10으로 제한)
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase().trim()),
      limit(10)
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (emailSnapshot.empty) {
      return { success: false, error: 'No user found with this email address.' };
    }
    
    // 이메일로 찾은 사용자 중에서 유저 이름이 일치하는지 확인
    let foundUser = null;
    emailSnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      if (userData.username && userData.username.toLowerCase().trim() === username.toLowerCase().trim()) {
        foundUser = { uid: docSnap.id, ...userData };
      }
    });
    
    if (!foundUser) {
      return { success: false, error: 'Username does not match this email address.' };
    }
    
    return { success: true, data: foundUser };
  } catch (error) {
    console.error('findUserByEmailAndUsername error:', error);
    return { success: false, error: error.message };
  }
};

// 사용자 프로필 업데이트
export const updateUserProfile = async (uid, data) => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 블록 수집 정보 저장
export const saveCollectedBlocks = async (uid, blocks) => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      collectedBlocks: blocks,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 제출물 저장
export const saveSubmission = async (uid, questionId, data) => {
  try {
    const submissionRef = await addDoc(collection(db, 'submissions'), {
      userId: uid,
      questionId: questionId,
      code: data.code,
      workspaceState: data.workspaceState,
      status: 'pending',
      submittedAt: new Date().toISOString()
    });

    // 제출 통계: 동일 문제 재제출은 solved에서 1회로 계산하기 위해 문제 ID를 유니크 배열로 관리
    await setDoc(doc(db, 'users', uid), {
      submittedQuestionIds: arrayUnion(questionId),
      submissionCount: increment(1),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, id: submissionRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 워크스페이스 저장 (수동 Save / 자동 Save 공용)
// 같은 사용자-문제 조합은 하나의 문서를 덮어쓰기(upsert)합니다.
export const saveWorkspaceDraft = async (uid, questionId, data) => {
  try {
    const draftId = `${uid}_${questionId}`;
    const draftRef = doc(db, 'workspaceDrafts', draftId);
    await setDoc(draftRef, {
      userId: uid,
      questionId,
      code: data.code || '',
      workspaceState: data.workspaceState || null,
      saveType: data.saveType || 'manual',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true, id: draftId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 워크스페이스 임시저장 불러오기
export const getWorkspaceDraft = async (uid, questionId) => {
  try {
    const draftId = `${uid}_${questionId}`;
    const draftRef = doc(db, 'workspaceDrafts', draftId);
    const draftSnap = await getDoc(draftRef);
    if (!draftSnap.exists()) {
      return { success: false, error: 'Workspace draft not found' };
    }
    return { success: true, data: draftSnap.data() };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 사용자의 제출물 목록 가져오기
export const getUserSubmissions = async (uid) => {
  try {
    let querySnapshot;
    try {
      // 기본: 최신순 정렬 조회 (인덱스 필요 가능)
      const q = query(
        collection(db, 'submissions'),
        where('userId', '==', uid),
        orderBy('submittedAt', 'desc')
      );
      querySnapshot = await getDocs(q);
    } catch (orderedQueryError) {
      // fallback: 인덱스 없이 userId 조건만으로 조회 후 클라이언트 정렬
      const fallbackQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', uid)
      );
      querySnapshot = await getDocs(fallbackQuery);
    }

    const submissions = [];
    
    querySnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });

    // fallback 쿼리에서도 동일한 반환 포맷을 유지하기 위해 클라이언트에서 정렬
    submissions.sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });
    
    return { success: true, data: submissions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 문제 목록 가져오기
export const getQuestions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'questions'));
    const questions = [];
    
    querySnapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: questions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 문제 추가 (Admin)
export const addQuestion = async (questionData) => {
  try {
    const { id, ...data } = questionData;
    const docRef = doc(db, 'questions', id);
    await setDoc(docRef, {
      ...data,
      id: id, // 문서 ID와 필드 ID를 동일하게
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      isBuiltIn: false
    });
    return { success: true, id: id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 문제 업데이트 (Admin)
export const updateQuestion = async (questionId, data) => {
  try {
    const docRef = doc(db, 'questions', questionId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 문제 삭제 (Admin)
export const deleteQuestion = async (questionId) => {
  try {
    const docRef = doc(db, 'questions', questionId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 제출물 채점 (Admin)
export const gradeSubmission = async (submissionId, gradeData) => {
  try {
    const docRef = doc(db, 'submissions', submissionId);
    const updateData = {
      grade: gradeData.grade,
      score: gradeData.score,
      feedback: gradeData.feedback || '',
      gradedAt: new Date().toISOString()
    };
    
    // status가 제공되면 업데이트, 없으면 기본값 'graded'
    if (gradeData.status) {
      updateData.status = gradeData.status;
    } else {
      updateData.status = 'graded';
    }
    
    await updateDoc(docRef, updateData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 모든 제출물 가져오기 (Admin)
export const getAllSubmissions = async (filters = {}) => {
  try {
    let q = collection(db, 'submissions');
    
    // 필터 적용
    const constraints = [];
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.questionId) {
      constraints.push(where('questionId', '==', filters.questionId));
    }
    
    constraints.push(orderBy('submittedAt', 'desc'));
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
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

// ==================== 블록 관리 ====================

/**
 * 전체 블록 목록 가져오기
 */
export const getBlocks = async () => {
  try {
    console.log('🔍 getBlocks: Starting query...');
    
    // 먼저 인덱스 없이 단순 조회 시도
    const querySnapshot = await getDocs(collection(db, 'blocks'));
    const blocks = [];
    
    querySnapshot.forEach((doc) => {
      blocks.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📦 getBlocks: Found ${blocks.length} blocks`);
    
    // 클라이언트 사이드에서 정렬
    blocks.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    
    return { success: true, data: blocks };
  } catch (error) {
    console.error('❌ getBlocks error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 특정 블록 정보 가져오기
 */
export const getBlock = async (blockId) => {
  try {
    const docRef = doc(db, 'blocks', blockId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Block not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * 블록 설정 업데이트 (Admin)
 * @param {string} blockId - 블록 ID
 * @param {object} settings - { isDefaultBlock: boolean }
 */
export const updateBlockSettings = async (blockId, settings) => {
  try {
    const blockRef = doc(db, 'blocks', blockId);
    await updateDoc(blockRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ==================== QR 코드 관리 ====================

/**
 * QR 코드 생성 (Admin) - 하나의 블록만 포함
 * 
 * 이 함수는 관리자가 QR 코드를 생성할 때 사용됩니다.
 * QR 코드에는 블록 ID가 포함되며, 사용자가 스캔하면 해당 블록을 수집할 수 있습니다.
 * 
 * @param {object} qrData - QR 코드 데이터
 * @param {string} qrData.name - QR 코드 이름 (관리용)
 * @param {string} qrData.block - 블록 ID (예: "controls_if")
 * @param {boolean} qrData.isActive - 활성화 여부 (기본값: true)
 * @param {string} qrData.startDate - 시작 날짜 (ISO 8601 형식)
 * @param {string} qrData.endDate - 종료 날짜 (null이면 무제한)
 * @param {string} qrData.createdBy - 생성자 UID
 * 
 * @returns {Promise<{success: boolean, id?: string, qrData?: string, error?: string}>}
 * 
 * 동작 과정:
 * 1. QR 페이로드 생성 (JSON 형식)
 * 2. Firestore에 QR 코드 문서 생성
 * 3. 생성된 문서 ID를 페이로드에 추가
 * 4. 페이로드를 JSON 문자열로 변환하여 반환
 * 
 * QR 페이로드 형식:
 * {
 *   "type": "blockhunt_blocks",  // QR 코드 타입 (검증용)
 *   "block": "controls_if",      // 블록 ID
 *   "qrId": "생성된_문서_ID",     // Firestore 문서 ID
 *   "timestamp": "2025-01-27T..." // 생성 시간
 * }
 * 
 * 사용 예시:
 * const result = await createQRCode({
 *   name: "Logic Block QR",
 *   block: "controls_if",
 *   isActive: true,
 *   createdBy: currentUser.uid
 * });
 * 
 * if (result.success) {
 *   // result.qrData를 QR 코드 생성 라이브러리(qrcode 등)에 전달
 *   // QR 코드 이미지 생성 후 출력/저장
 * }
 */
export const createQRCode = async (qrData) => {
  try {
    // 1단계: QR에 담을 페이로드 생성 (단일 블록)
    // 이 페이로드는 QR 코드에 인코딩되어 사용자가 스캔하면 읽을 수 있습니다.
    const qrPayload = {
      type: 'blockhunt_blocks',  // QR 코드 타입 식별자 (검증용)
      block: qrData.block,        // 단일 블록 ID (사용자가 수집할 블록)
      qrId: '',                   // 아직 생성되지 않았으므로 빈 문자열 (나중에 업데이트)
      timestamp: new Date().toISOString() // 생성 시간 (ISO 8601 형식)
    };

    // 2단계: Firestore에 QR 코드 문서 생성
    // addDoc을 사용하면 자동으로 고유한 문서 ID가 생성됩니다.
    const docRef = await addDoc(collection(db, 'qrCodes'), {
      name: qrData.name,                    // QR 코드 이름 (관리용)
      block: qrData.block,                  // 단일 블록 ID
      qrData: JSON.stringify(qrPayload),    // 페이로드를 JSON 문자열로 저장
      isActive: qrData.isActive !== false,  // 기본값: true (활성화)
      startDate: qrData.startDate || new Date().toISOString(), // 시작 날짜
      endDate: qrData.endDate || null,      // 종료 날짜 (null이면 무제한)
      createdBy: qrData.createdBy,          // 생성자 UID
      createdAt: new Date().toISOString(),  // 생성 시간
      updatedAt: new Date().toISOString()   // 업데이트 시간
    });

    // 3단계: 생성된 문서 ID를 페이로드에 추가
    // 이 ID는 나중에 QR 코드 검증 시 사용됩니다.
    qrPayload.qrId = docRef.id;
    
    // 4단계: 업데이트된 페이로드를 Firestore에 다시 저장
    await updateDoc(docRef, {
      qrData: JSON.stringify(qrPayload)
    });

    // 5단계: 성공 응답 반환
    // qrData는 QR 코드 생성 라이브러리(qrcode 등)에 전달할 수 있는 JSON 문자열입니다.
    return { 
      success: true, 
      id: docRef.id, 
      qrData: JSON.stringify(qrPayload) 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * QR 코드 목록 가져오기 (Admin)
 */
export const getQRCodes = async () => {
  try {
    const q = query(
      collection(db, 'qrCodes'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const qrCodes = [];
    
    querySnapshot.forEach((doc) => {
      qrCodes.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: qrCodes };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * QR 코드 업데이트 (Admin)
 * @param {string} qrCodeId - QR 코드 ID
 * @param {object} updates - { name?, isActive?, startDate?, endDate? }
 */
export const updateQRCode = async (qrCodeId, updates) => {
  try {
    const qrRef = doc(db, 'qrCodes', qrCodeId);
    await updateDoc(qrRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * QR 코드 삭제 (Admin)
 */
export const deleteQRCode = async (qrCodeId) => {
  try {
    const qrRef = doc(db, 'qrCodes', qrCodeId);
    await deleteDoc(qrRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * 테스트용 QR 코드 생성 (개발/테스트 전용)
 */
export const createTestQRCode = async () => {
  try {
    const testQRId = 'test_qr_123';
    const qrPayload = {
      type: 'blockhunt_blocks',
      block: 'controls_if',
      qrId: testQRId,
      timestamp: new Date().toISOString()
    };

    const docRef = doc(db, 'qrCodes', testQRId);
    await setDoc(docRef, {
      name: 'Test QR - Logic Block',
      block: 'controls_if',
      qrData: JSON.stringify(qrPayload),
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: null,
      createdBy: 'test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return { 
      success: true, 
      id: testQRId, 
      qrData: JSON.stringify(qrPayload) 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * QR 스캔 처리 (User) - 단일 블록 처리
 * 
 * 사용자가 QR 코드를 스캔하면 이 함수가 호출되어 블록을 수집합니다.
 * 
 * @param {string} uid - 사용자 UID (Firebase Auth에서 가져온 사용자 ID)
 * @param {string} qrData - QR 코드에서 읽은 JSON 문자열
 * 
 * @returns {Promise<{success: boolean, alreadyCollected?: boolean, blocksObtained?: string[], totalBlocks?: number, error?: string}>}
 * 
 * 동작 과정:
 * 1. QR 데이터 파싱 (JSON 문자열 → 객체)
 * 2. QR 타입 검증 (blockhunt_blocks인지 확인)
 * 3. QR 코드 정보 확인 (Firestore에서 조회)
 * 4. 사용자 프로필 확인/생성
 * 5. 블록 중복 체크 (이미 수집한 블록인지 확인)
 * 6. 블록 추가 (collectedBlocks 배열에 추가)
 * 7. 스캔 기록 저장 (qrScanHistory에 추가)
 * 
 * 에러 처리:
 * - Invalid QR code format: JSON 파싱 실패
 * - Invalid QR code type: type이 "blockhunt_blocks"가 아님
 * - QR code not found: Firestore에 QR 코드가 없음
 * - This QR code is no longer active: QR 코드가 비활성화됨
 * - You already have this block!: 이미 수집한 블록
 * 
 * 사용 예시:
 * const result = await processQRScan(currentUser.uid, scannedQRData);
 * if (result.success) {
 *   if (result.alreadyCollected) {
 *     console.log('이미 수집한 블록입니다.');
 *   } else {
 *     console.log('블록 수집 성공!', result.blocksObtained);
 *   }
 * }
 */
export const processQRScan = async (uid, qrData) => {
  try {
    // 1단계: QR 데이터 파싱
    // QR 코드는 JSON 문자열로 인코딩되어 있으므로 파싱이 필요합니다.
    let payload;
    try {
      payload = JSON.parse(qrData);
    } catch {
      // JSON 파싱 실패 시 에러 반환
      return { success: false, error: 'Invalid QR code format' };
    }
    
    // 2단계: QR 타입 검증
    // type이 "blockhunt_blocks"가 아니면 유효하지 않은 QR 코드입니다.
    if (payload.type !== 'blockhunt_blocks') {
      return { success: false, error: 'Invalid QR code type' };
    }

    // 테스트용 QR 코드인지 확인
    if (payload.qrId === 'qr_abc123' || payload.qrId === 'test_qr_123') {
      // 테스트용 QR 코드는 직접 처리
      const blockToAdd = payload.block;
      
      // 사용자 프로필 가져오기 또는 생성
      let userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        // 사용자 프로필이 없으면 생성
        await setDoc(doc(db, 'users', uid), {
          email: 'user@example.com',
          displayName: 'User',
          collectedBlocks: [],
          qrScanHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        // 생성 후 다시 가져오기
        userDoc = await getDoc(doc(db, 'users', uid));
      }

      const userData = userDoc.data();
      const currentBlocks = userData.collectedBlocks || [];

      // 이미 해당 블록을 보유한 경우
      if (currentBlocks.includes(blockToAdd)) {
        return { 
          success: true, 
          alreadyCollected: true, 
          message: 'You already have this block!' 
        };
      }

      // 블록 추가
      const updatedBlocks = [...currentBlocks, blockToAdd];
      const scanRecord = {
        qrCodeId: payload.qrId,
        scannedAt: new Date().toISOString(),
        blockObtained: blockToAdd
      };

      await updateDoc(doc(db, 'users', uid), {
        collectedBlocks: updatedBlocks,
        qrScanHistory: arrayUnion(scanRecord),
        updatedAt: new Date().toISOString()
      });

      return { 
        success: true, 
        blocksObtained: [blockToAdd],
        totalBlocks: updatedBlocks.length 
      };
    }

    // 실제 QR 코드 정보 가져오기
    const qrDoc = await getDoc(doc(db, 'qrCodes', payload.qrId));
    if (!qrDoc.exists()) {
      return { success: false, error: 'QR code not found' };
    }

    const qrCodeData = qrDoc.data();
    if (!qrCodeData.isActive) {
      return { success: false, error: 'This QR code is no longer active' };
    }

    // 사용자 프로필 가져오기 또는 생성
    let userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      // 사용자 프로필이 없으면 생성
      await setDoc(doc(db, 'users', uid), {
        email: 'user@example.com',
        displayName: 'User',
        collectedBlocks: [],
        qrScanHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      // 생성 후 다시 가져오기
      userDoc = await getDoc(doc(db, 'users', uid));
    }

    const userData = userDoc.data();
    const currentBlocks = userData.collectedBlocks || [];
    const blockToAdd = payload.block; // 단일 블록 ID

    // 이미 해당 블록을 보유한 경우
    if (currentBlocks.includes(blockToAdd)) {
      return { 
        success: true, 
        alreadyCollected: true, 
        message: 'You already have this block!' 
      };
    }

    // 블록 추가
    const updatedBlocks = [...currentBlocks, blockToAdd];
    const scanRecord = {
      qrCodeId: payload.qrId,
      scannedAt: new Date().toISOString(),
      blockObtained: blockToAdd
    };

    await updateDoc(doc(db, 'users', uid), {
      collectedBlocks: updatedBlocks,
      qrScanHistory: arrayUnion(scanRecord),
      updatedAt: new Date().toISOString()
    });

    return { 
      success: true, 
      blocksObtained: [blockToAdd], // 배열 형태로 반환 (기존 UI 호환성)
      totalBlocks: updatedBlocks.length 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * 사용자의 수집된 블록에서 특정 블록을 제거합니다.
 * @param {string} uid - 사용자 ID
 * @param {string} blockId - 제거할 블록 ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const removeCollectedBlock = async (uid, blockId) => {
  try {
    console.log('🗑️ Removing block from user:', { uid, blockId });

    if (!uid || !blockId) {
      return { success: false, error: 'User ID and Block ID are required' };
    }

    // 사용자 프로필 가져오기
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User profile not found' };
    }

    const userData = userDoc.data();
    const currentBlocks = userData.collectedBlocks || [];

    // 해당 블록이 수집된 블록 목록에 있는지 확인
    if (!currentBlocks.includes(blockId)) {
      return { success: false, error: 'Block not found in collected blocks' };
    }

    // 블록 제거
    const updatedBlocks = currentBlocks.filter(id => id !== blockId);

    // Firebase에 업데이트
    await updateDoc(userDocRef, {
      collectedBlocks: updatedBlocks,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Block removed successfully:', { blockId, remainingBlocks: updatedBlocks.length });

    return { 
      success: true, 
      removedBlock: blockId,
      totalBlocks: updatedBlocks.length 
    };

  } catch (error) {
    console.error('❌ Error removing block:', error);
    return { success: false, error: error.message };
  }
};

