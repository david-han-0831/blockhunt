import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../firebase/auth';
import ConfirmModal from './ConfirmModal';

function AppBar({ title = 'BlockHunt', hideLogo = false }) {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // 현재 경로에 따라 활성화된 메뉴 확인
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setShowLogoutModal(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutModal(false);
    }
  };

  const getDisplayName = () => {
    if (userProfile?.displayName) {
      return userProfile.displayName;
    }
    if (currentUser?.displayName) {
      return currentUser.displayName;
    }
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <>
      <header className="appbar">
        <div className="wrap">
          <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!hideLogo && (
              <div className="brand-mark" aria-hidden="true">
                <i className="bi bi-braces"></i>
              </div>
            )}
            <span>{title}</span>
          </Link>
          <nav className="nav-inline">
            <Link 
              className={`btn ${isActive('/challenges') ? 'active' : ''}`} 
              to="/challenges"
            >
              <i className="bi bi-list-task me-1"></i>Challenges
            </Link>
            <Link 
              className={`btn ${isActive('/profile') ? 'active' : ''}`} 
              to="/profile"
            >
              <i className="bi bi-people"></i>Profile
            </Link>
            <Link 
              className={`btn ${isActive('/studio') ? 'active' : ''}`} 
              to="/studio"
            >
              <i className="bi bi-code-slash me-1"></i>Studio
            </Link>
            {currentUser ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}>
                <span className="user-info" style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  {getDisplayName()}
                </span>
                <button className="btn" onClick={() => setShowLogoutModal(true)}>
                  <i className="bi bi-box-arrow-right me-1"></i>Sign Out
                </button>
              </div>
            ) : (
              <Link className="btn" to="/login">
                <i className="bi bi-box-arrow-in-right me-1"></i>Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

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
    </>
  );
}

export default AppBar;

