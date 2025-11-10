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
  arrayUnion
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
    return { success: true, id: submissionRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 사용자의 제출물 목록 가져오기
export const getUserSubmissions = async (uid) => {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', uid),
      orderBy('submittedAt', 'desc')
    );
    
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
 * @param {object} qrData - { name, block, isActive, startDate, endDate, createdBy }
 */
export const createQRCode = async (qrData) => {
  try {
    // QR에 담을 페이로드 생성 (단일 블록)
    const qrPayload = {
      type: 'blockhunt_blocks',
      block: qrData.block, // 단일 블록 ID
      qrId: '', // 생성 후 업데이트
      timestamp: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'qrCodes'), {
      name: qrData.name,
      block: qrData.block, // 단일 블록 ID
      qrData: JSON.stringify(qrPayload),
      isActive: qrData.isActive !== false,
      startDate: qrData.startDate || new Date().toISOString(),
      endDate: qrData.endDate || null,
      createdBy: qrData.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // QR ID를 페이로드에 추가
    qrPayload.qrId = docRef.id;
    await updateDoc(docRef, {
      qrData: JSON.stringify(qrPayload)
    });

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
 * @param {string} uid - 사용자 UID
 * @param {string} qrData - QR 코드에서 읽은 JSON 문자열
 */
export const processQRScan = async (uid, qrData) => {
  try {
    // QR 데이터 파싱
    let payload;
    try {
      payload = JSON.parse(qrData);
    } catch {
      return { success: false, error: 'Invalid QR code format' };
    }
    
    // QR 타입 검증
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

