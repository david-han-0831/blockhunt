import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// 회원가입
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 사용자 프로필 업데이트
    await updateProfile(userCredential.user, {
      displayName: displayName
    });
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 로그인
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 로그아웃
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 인증 상태 관찰
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// 현재 사용자 가져오기
export const getCurrentUser = () => {
  return auth.currentUser;
};

// 비밀번호 리셋 이메일 발송 (기존 방식, 사용 안 함)
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 비밀번호 직접 업데이트 (로그인된 사용자용)
export const updateUserPassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User must be logged in to update password.' };
    }
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

