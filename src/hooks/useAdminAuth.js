import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../firebase/firestore';

function useAdminAuth() {
  const { currentUser, userProfile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      setIsLoading(true);
      
      try {
        // 1. 로그인되지 않은 경우
        if (!currentUser) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // 2. AuthContext에서 이미 로드된 프로필이 있는 경우
        if (userProfile && userProfile.role) {
          setIsAdmin(userProfile.role === 'admin');
          setIsLoading(false);
          return;
        }

        // 3. Firestore에서 직접 프로필을 가져오는 경우
        const result = await getUserProfile(currentUser.uid);
        if (result.success && result.data.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Admin role check failed:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminRole();
  }, [currentUser, userProfile]);

  return { isAdmin, isLoading };
}

export default useAdminAuth;
