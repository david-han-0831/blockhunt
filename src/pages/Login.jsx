import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import AlertModal from '../components/AlertModal';

function Login() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [validated, setValidated] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

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
      setValidated(true);
      setEmailInvalid(!emailValid);
      setPasswordInvalid(!passwordValid);
      return;
    }
    
    setValidated(true);
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
              <a className="link" href="#forgot-password" onClick={(e) => e.preventDefault()}>Forgot password?</a>
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
    </>
  );
}

export default Login;

