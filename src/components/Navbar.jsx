import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../firebase/auth';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

function Navbar() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', title: '', message: '' });
  
  // 현재 경로에 따라 활성화된 메뉴 확인
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    const result = await logoutUser();
    setShowLogoutModal(false);
    
    if (!result.success) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Sign Out Failed',
        message: result.error || 'An error occurred while signing out.'
      });
    }
  };

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <i className="bi bi-qr-code-scan"></i> BlockHunt
        </Link>
        <div className="ms-auto d-none d-lg-flex gap-2 align-items-center">
          <Link className={`btn btn-ghost ${isActive('/challenges') ? 'active' : ''}`} to="/challenges">
            <i className="bi bi-list-task me-1"></i>Challenges
          </Link>
          <Link className={`btn btn-ghost ${isActive('/profile') ? 'active' : ''}`} to="/profile">
            <i className="bi bi-person me-1"></i>Profile
          </Link>
          <Link className={`btn btn-ghost ${isActive('/studio') ? 'active' : ''}`} to="/studio">
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
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        type="warning"
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </nav>
  );
}

export default Navbar;

