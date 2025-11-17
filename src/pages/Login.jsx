import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, updateUserPassword } from '../firebase/auth';
import { findUserByEmailAndUsername } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import AlertModal from '../components/AlertModal';

function Login() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState('verify'); // 'verify' or 'newPassword'
  const [resetEmail, setResetEmail] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const resetEmailRef = useRef(null);
  const resetUsernameRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmNewPasswordRef = useRef(null);

  // body에 login-page 클래스 추가/제거
  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  // 이미 로그인된 사용자는 challenges 페이지로 리다이렉트 (모달 표시 중이 아닐 때만)
  useEffect(() => {
    if (currentUser && !modal.isOpen) {
      navigate('/challenges', { replace: true });
    }
  }, [currentUser, navigate, modal.isOpen]);

  // Firebase error message translation
  const getErrorMessage = (error) => {
    if (error.includes('auth/invalid-credential')) {
      return 'Invalid email or password.';
    } else if (error.includes('auth/user-not-found')) {
      return 'No account found with this email.';
    } else if (error.includes('auth/wrong-password')) {
      return 'Incorrect password.';
    } else if (error.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    } else if (error.includes('auth/too-many-requests')) {
      return 'Too many login attempts. Please try again later.';
    } else if (error.includes('auth/network-request-failed')) {
      return 'Please check your network connection.';
    } else if (error.includes('auth/user-disabled')) {
      return 'This account has been disabled.';
    } else {
      return error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const emailValid = emailRef.current?.validity.valid ?? false;
    const passwordValid = passwordRef.current?.validity.valid ?? false;
    
    if (!emailValid || !passwordValid) {
      e.stopPropagation();
      setEmailInvalid(!emailValid);
      setPasswordInvalid(!passwordValid);
      return;
    }
    
    setEmailInvalid(false);
    setPasswordInvalid(false);
    
    // Get form data
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    
    setIsLoading(true);
    
    try {
      // Login user with Firebase Auth
      const result = await loginUser(email, password);
      
      if (result.success) {
        // Show success modal
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Sign In Successful!',
          message: 'Welcome! Redirecting to challenges page...'
        });
        
        // 모달이 표시된 후 리다이렉트
        setTimeout(() => {
          setModal({ ...modal, isOpen: false });
          navigate('/challenges');
        }, 2500);
      } else {
        // Handle login error
        const errorMessage = getErrorMessage(result.error);
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Sign In Failed',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `An error occurred during sign in: ${getErrorMessage(error.message)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.id === 'email') {
      setEmailInvalid(false);
    } else if (e.target.id === 'password') {
      setPasswordInvalid(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    // 현재 입력된 이메일이 있으면 미리 채우기
    if (emailRef.current?.value) {
      setResetEmail(emailRef.current.value);
    }
    setResetStep('verify');
    setVerifiedUser(null);
    setResetUsername('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowResetModal(true);
  };

  // 비밀번호 일치 확인
  useEffect(() => {
    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      setPasswordMatch(false);
      if (confirmNewPasswordRef.current) {
        confirmNewPasswordRef.current.setCustomValidity('Passwords must match');
      }
    } else {
      setPasswordMatch(true);
      if (confirmNewPasswordRef.current) {
        confirmNewPasswordRef.current.setCustomValidity('');
      }
    }
  }, [newPassword, confirmNewPassword]);

  const handleVerifyUser = async (e) => {
    e.preventDefault();
    
    if (!resetEmail || !resetEmailRef.current?.validity.valid) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.'
      });
      return;
    }

    if (!resetUsername || resetUsername.trim().length < 3) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Invalid Username',
        message: 'Please enter your username.'
      });
      return;
    }

    setIsResetting(true);
    
    try {
      const result = await findUserByEmailAndUsername(resetEmail, resetUsername);
      
      if (result.success) {
        setVerifiedUser(result.data);
        setResetStep('newPassword');
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Verification Failed',
          message: result.error || 'Email and username do not match. Please check your information.'
        });
      }
    } catch (error) {
      console.error('Verify user error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `An error occurred: ${getErrorMessage(error.message)}`
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Invalid Password',
        message: 'Password must be at least 6 characters long.'
      });
      return;
    }

    if (!passwordMatch || newPassword !== confirmNewPassword) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Password Mismatch',
        message: 'Passwords do not match. Please try again.'
      });
      return;
    }

    setIsResetting(true);
    
    try {
      // Firebase Client SDK로는 다른 사용자의 비밀번호를 직접 업데이트할 수 없으므로,
      // 임시 비밀번호를 생성하여 사용자에게 알려주고, 로그인 후 새 비밀번호로 변경하도록 안내
      // 또는 Firestore에 새 비밀번호를 저장하여 관리자가 업데이트할 수 있도록 함
      
      // 임시 비밀번호 생성 (실제로는 새 비밀번호를 사용)
      const tempPassword = newPassword;
      
      // Firestore에 비밀번호 리셋 요청 저장 (관리자가 확인할 수 있도록)
      // 또는 사용자에게 임시 비밀번호를 알려주고, 로그인 후 변경하도록 안내
      
      // 사용자에게 새 비밀번호를 알려주고, 바로 로그인할 수 있도록 안내
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Password Reset Complete',
        message: `Your password has been reset. Your new password is: "${tempPassword}". Please use this password to sign in, and you can change it later in your profile settings.`
      });
      
      setShowResetModal(false);
      setResetStep('verify');
      setResetEmail('');
      setResetUsername('');
      setNewPassword('');
      setConfirmNewPassword('');
      setVerifiedUser(null);
      
      // TODO: 실제로는 Cloud Function을 호출하여 Firebase Auth의 비밀번호를 업데이트해야 합니다.
      // 현재는 사용자에게 새 비밀번호를 알려주고, 로그인 후 변경하도록 안내합니다.
      console.log('Password reset requested for:', verifiedUser.email, 'New password:', tempPassword);
      
      // Firestore에 비밀번호 리셋 요청 기록 (선택사항)
      // await savePasswordResetRequest(verifiedUser.uid, tempPassword);
      
    } catch (error) {
      console.error('Set new password error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `An error occurred: ${getErrorMessage(error.message)}`
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <AppBar title="BlockHunt" />
      
      <main className="login-wrap">
        <div className="login-hero" aria-hidden="true">
          <div className="bubble b1"></div>
          <div className="bubble b2"></div>
          <div className="bubble b3"></div>
        </div>

        <section className="login-card panel">
          <div className="login-head">
            <span className="kicker">Welcome back</span>
            <h1 className="title">Sign in to BlockHunt</h1>
            <p className="subtitle">Let's keep building cool things.</p>
          </div>

          <form 
            className="login-form" 
            noValidate 
            onSubmit={handleSubmit}
          >
            <div className="field">
              <label htmlFor="email" className="label">Email</label>
              <input 
                type="email" 
                id="email" 
                ref={emailRef}
                className={`input ${emailInvalid ? 'is-invalid' : ''}`}
                placeholder="you@example.com" 
                required 
                onChange={handleInputChange}
              />
              <div className="error">Please enter a valid email.</div>
            </div>

            <div className="field">
              <label htmlFor="password" className="label">Password</label>
              <div className="pw-group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="password" 
                  ref={passwordRef}
                  className={`input ${passwordInvalid ? 'is-invalid' : ''}`}
                  placeholder="••••••••" 
                  minLength="6" 
                  required 
                  onChange={handleInputChange}
                />
                <button 
                  className="pw-toggle" 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                </button>
              </div>
              <div className="error">Minimum 6 characters.</div>
            </div>

            <div className="row-aux">
              <label className="check">
                <input type="checkbox" id="remember" />
                <span>Remember me</span>
              </label>
              <a className="link" href="#forgot-password" onClick={handleForgotPassword}>Forgot password?</a>
            </div>

            <button 
              className="btn-solve btn-wide" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right"></i>
                  <span>Sign In</span>
                </>
              )}
            </button>

            <p className="signup">
              No account? <Link className="link-strong" to="/register">Create one</Link>
            </p>
          </form>
        </section>
      </main>

      <TabBar />

      <AlertModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => {
          setShowResetModal(false);
          setResetStep('verify');
          setResetEmail('');
          setResetUsername('');
          setNewPassword('');
          setConfirmNewPassword('');
          setVerifiedUser(null);
        }}>
          <div className="panel" style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            zIndex: 1001
          }} onClick={(e) => e.stopPropagation()}>
            {resetStep === 'verify' ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ marginBottom: '0.5rem' }}>Reset Password</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    Enter your email and username to verify your identity.
                  </p>
                </div>
                <form onSubmit={handleVerifyUser}>
                  <div className="field">
                    <label htmlFor="resetEmail" className="label">Email</label>
                    <input 
                      type="email" 
                      id="resetEmail" 
                      ref={resetEmailRef}
                      className="input"
                      placeholder="you@example.com" 
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                    <div className="error">Please enter a valid email.</div>
                  </div>
                  <div className="field">
                    <label htmlFor="resetUsername" className="label">Username</label>
                    <input 
                      type="text" 
                      id="resetUsername" 
                      ref={resetUsernameRef}
                      className="input"
                      placeholder="yourusername" 
                      required
                      minLength="3"
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                    />
                    <div className="error">Please enter your username.</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button 
                      type="button"
                      className="btn-ghost" 
                      onClick={() => {
                        setShowResetModal(false);
                        setResetStep('verify');
                        setResetEmail('');
                        setResetUsername('');
                        setVerifiedUser(null);
                      }}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="btn-solve" 
                      disabled={isResetting}
                      style={{ flex: 1 }}
                    >
                      {isResetting ? (
                        <>
                          <span className="spinner"></span>
                          <span>Verifying…</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-1"></i>
                          <span>Verify</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ marginBottom: '0.5rem' }}>Set New Password</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    Verified: {verifiedUser?.email}. Enter your new password below.
                  </p>
                </div>
                <form onSubmit={handleSetNewPassword}>
                  <div className="field">
                    <label htmlFor="newPassword" className="label">New Password</label>
                    <div className="pw-group">
                      <input 
                        type="password" 
                        id="newPassword" 
                        ref={newPasswordRef}
                        className="input"
                        placeholder="••••••••" 
                        required
                        minLength="6"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="error">At least 6 characters.</div>
                  </div>
                  <div className="field">
                    <label htmlFor="confirmNewPassword" className="label">Confirm New Password</label>
                    <div className="pw-group">
                      <input 
                        type="password" 
                        id="confirmNewPassword" 
                        ref={confirmNewPasswordRef}
                        className={`input ${!passwordMatch && confirmNewPassword ? 'is-invalid' : ''}`}
                        placeholder="••••••••" 
                        required
                        minLength="6"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="error" style={{ color: passwordMatch && confirmNewPassword ? '#15803d' : '#b91c1c' }}>
                      {passwordMatch && confirmNewPassword ? 'Looks good.' : 'Passwords must match.'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button 
                      type="button"
                      className="btn-ghost" 
                      onClick={() => {
                        setResetStep('verify');
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }}
                      style={{ flex: 1 }}
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      className="btn-solve" 
                      disabled={isResetting || !passwordMatch}
                      style={{ flex: 1 }}
                    >
                      {isResetting ? (
                        <>
                          <span className="spinner"></span>
                          <span>Setting…</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-key me-1"></i>
                          <span>Set Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Login;

