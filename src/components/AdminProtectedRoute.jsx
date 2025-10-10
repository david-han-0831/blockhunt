import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useAdminAuth from '../hooks/useAdminAuth';

function AdminProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const { isAdmin, isLoading } = useAdminAuth();
  
  // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // 로딩 중인 경우 로딩 표시 (선택사항)
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-brand" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-2 text-muted">Admin 권한을 확인하는 중...</div>
        </div>
      </div>
    );
  }
  
  // Admin이 아닌 경우 Challenges 페이지로 리다이렉트
  if (!isAdmin) {
    return <Navigate to="/challenges" replace />;
  }
  
  // Admin 권한이 있는 경우 페이지 렌더링
  return children;
}

export default AdminProtectedRoute;
