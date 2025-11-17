import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../firebase/firestore';

function useAdminAuth() {
  const { currentUser, userProfile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      console.log('🔍 useAdminAuth - Starting admin check:', { 
        currentUser: currentUser?.uid, 
        userProfile: userProfile?.role 
      });
      
      setIsLoading(true);
      
      try {
        // 1. 로그인되지 않은 경우
        if (!currentUser) {
          console.log('🔍 useAdminAuth - No current user, setting isAdmin to false');
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // 2. AuthContext에서 이미 로드된 프로필이 있는 경우
        if (userProfile && userProfile.role) {
          const adminStatus = userProfile.role === 'admin';
          console.log('🔍 useAdminAuth - Using userProfile role:', { 
            role: userProfile.role, 
            isAdmin: adminStatus 
          });
          setIsAdmin(adminStatus);
          setIsLoading(false);
          return;
        }

        // 3. Firestore에서 직접 프로필을 가져오는 경우
        console.log('🔍 useAdminAuth - Fetching profile from Firestore');
        const result = await getUserProfile(currentUser.uid);
        console.log('🔍 useAdminAuth - Firestore result:', result);
        
        if (result.success && result.data.role === 'admin') {
          console.log('🔍 useAdminAuth - User is admin (from Firestore)');
          setIsAdmin(true);
        } else {
          console.log('🔍 useAdminAuth - User is not admin (from Firestore)');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('❌ useAdminAuth - Admin role check failed:', error);
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




















