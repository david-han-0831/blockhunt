import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../firebase/auth';
import ConfirmModal from './ConfirmModal';

function Navbar() {
  const { currentUser } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    const result = await logoutUser();
    setShowLogoutModal(false);
    
    if (!result.success) {
      alert(`로그아웃 실패: ${result.error}`);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <i className="bi bi-qr-code-scan"></i> BlockHunt
        </Link>
        <div className="ms-auto d-none d-lg-flex gap-2 align-items-center">
          <Link className="btn btn-ghost" to="/challenges">
            <i className="bi bi-list-task me-1"></i>Challenges
          </Link>
          <Link className="btn btn-ghost" to="/profile">
            <i className="bi bi-person me-1"></i>Profile
          </Link>
          <Link className="btn btn-brand" to="/studio">
            <i className="bi bi-code-slash me-1"></i>Studio
          </Link>
          {currentUser && (
            <>
              <span className="text-muted small">
                {currentUser.displayName || currentUser.email}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogoutModal(true)}>
                <i className="bi bi-box-arrow-right me-1"></i>Logout
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="로그아웃"
        message="정말 로그아웃하시겠습니까?"
        confirmText="로그아웃"
        cancelText="취소"
        onConfirm={handleLogout}
        type="warning"
      />
    </nav>
  );
}

export default Navbar;

