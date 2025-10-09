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
    const docRef = await addDoc(collection(db, 'questions'), {
      ...questionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
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

// 제출물 채점 (Admin)
export const gradeSubmission = async (submissionId, gradeData) => {
  try {
    const docRef = doc(db, 'submissions', submissionId);
    await updateDoc(docRef, {
      status: 'graded',
      grade: gradeData.grade,
      score: gradeData.score,
      feedback: gradeData.feedback,
      gradedAt: new Date().toISOString()
    });
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

