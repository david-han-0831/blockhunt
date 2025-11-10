import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../firebase/auth';
import { createUserProfile } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import AlertModal from '../components/AlertModal';

function Register() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  // Field validation states
  const [fieldErrors, setFieldErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    username: false,
    password: false,
    confirm: false,
    terms: false
  });
  const [passwordMatch, setPasswordMatch] = useState(true);

  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const termsRef = useRef(null);

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

  // 페이지 로드 시 모든 입력 필드 초기화 (브라우저 자동완성 방지)
  useEffect(() => {
    if (firstNameRef.current) firstNameRef.current.value = '';
    if (lastNameRef.current) lastNameRef.current.value = '';
    if (emailRef.current) emailRef.current.value = '';
    if (usernameRef.current) usernameRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';
    if (confirmRef.current) confirmRef.current.value = '';
    if (termsRef.current) termsRef.current.checked = false;
  }, []);

  // Password match validation
  useEffect(() => {
    if (confirm && password !== confirm) {
      setPasswordMatch(false);
      if (confirmRef.current) {
        confirmRef.current.setCustomValidity('Passwords must match');
      }
    } else {
      setPasswordMatch(true);
      if (confirmRef.current) {
        confirmRef.current.setCustomValidity('');
      }
    }
  }, [password, confirm]);

  // Firebase error message translation
  const getErrorMessage = (error) => {
    if (error.includes('auth/email-already-in-use')) {
      return 'This email is already in use.';
    } else if (error.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    } else if (error.includes('auth/weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    } else if (error.includes('auth/operation-not-allowed')) {
      return 'Email/password login is not enabled.';
    } else if (error.includes('auth/network-request-failed')) {
      return 'Please check your network connection.';
    } else {
      return error;
    }
  };

  const handleInputChange = (e) => {
    const fieldName = e.target.id;
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: false }));
    }
    if (e.target.id === 'password') {
      setPassword(e.target.value);
    } else if (e.target.id === 'confirm') {
      setConfirm(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Validate all fields
    const firstName = firstNameRef.current;
    const lastName = lastNameRef.current;
    const email = emailRef.current;
    const username = usernameRef.current;
    const password = passwordRef.current;
    const confirm = confirmRef.current;
    const terms = termsRef.current;

    let isValid = true;
    const newErrors = { ...fieldErrors };

    if (!firstName?.validity.valid) {
      newErrors.firstName = true;
      isValid = false;
    }
    if (!lastName?.validity.valid) {
      newErrors.lastName = true;
      isValid = false;
    }
    if (!email?.validity.valid) {
      newErrors.email = true;
      isValid = false;
    }
    if (!username?.validity.valid) {
      newErrors.username = true;
      isValid = false;
    }
    if (!password?.validity.valid) {
      newErrors.password = true;
      isValid = false;
    }
    if (!confirm?.validity.valid || !passwordMatch) {
      newErrors.confirm = true;
      isValid = false;
    }
    if (!terms?.checked) {
      newErrors.terms = true;
      isValid = false;
    }

    setFieldErrors(newErrors);

    if (!isValid) {
      return;
    }
    
    const formData = new FormData(form);
    const firstNameValue = formData.get('firstName') || firstName.value;
    const lastNameValue = formData.get('lastName') || lastName.value;
    const emailValue = formData.get('email') || email.value;
    const usernameValue = formData.get('username') || username.value;
    
    const displayName = `${firstNameValue} ${lastNameValue}`;
    
    setIsLoading(true);
    
    try {
      const result = await registerUser(emailValue, password.value, displayName);
      
      if (result.success) {
        await createUserProfile(result.user.uid, {
          email: emailValue,
          displayName: displayName,
          firstName: firstNameValue,
          lastName: lastNameValue,
          username: usernameValue,
          collectedBlocks: [],
          createdAt: new Date().toISOString()
        });
        
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Account Created!',
          message: 'Your account has been successfully created. Redirecting to login page...'
        });
        
        setTimeout(() => {
          setModal({ ...modal, isOpen: false });
          navigate('/login');
        }, 2000);
      } else {
        const errorMessage = getErrorMessage(result.error);
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Registration Failed',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `An error occurred during registration: ${getErrorMessage(error.message)}`
      });
    } finally {
      setIsLoading(false);
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
            <span className="kicker">Join us</span>
            <h1 className="title">Create your BlockHunt account</h1>
            <p className="subtitle">One account for Challenges and Studio.</p>
          </div>

          <form 
            className="login-form" 
            noValidate 
            onSubmit={handleSubmit}
          >
            <div className="field">
              <label htmlFor="firstName" className="label">First name</label>
              <input 
                type="text" 
                id="firstName" 
                name="firstName"
                ref={firstNameRef}
                className={`input ${fieldErrors.firstName ? 'is-invalid' : ''}`}
                placeholder="Ada" 
                required 
                onChange={handleInputChange}
              />
              <div className="error">Enter your first name.</div>
            </div>

            <div className="field">
              <label htmlFor="lastName" className="label">Last name</label>
              <input 
                type="text" 
                id="lastName" 
                name="lastName"
                ref={lastNameRef}
                className={`input ${fieldErrors.lastName ? 'is-invalid' : ''}`}
                placeholder="Lovelace" 
                required 
                onChange={handleInputChange}
              />
              <div className="error">Enter your last name.</div>
            </div>

            <div className="field">
              <label htmlFor="email" className="label">Email</label>
              <input 
                type="email" 
                id="email" 
                name="new-email"
                ref={emailRef}
                className={`input ${fieldErrors.email ? 'is-invalid' : ''}`}
                placeholder="you@example.com" 
                required 
                onChange={handleInputChange}
                autoComplete="email"
                data-lpignore="true"
              />
              <div className="error">Provide a valid email.</div>
            </div>

            <div className="field">
              <label htmlFor="username" className="label">Username</label>
              <input 
                type="text" 
                id="username" 
                name="new-username"
                ref={usernameRef}
                className={`input ${fieldErrors.username ? 'is-invalid' : ''}`}
                placeholder="blockhuntr" 
                minLength="3" 
                required 
                onChange={handleInputChange}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
              />
              <div className="error">Minimum 3 characters.</div>
            </div>

            <div className="field">
              <label htmlFor="password" className="label">Password</label>
              <div className="pw-group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="password" 
                  name="password"
                  ref={passwordRef}
                  className={`input ${fieldErrors.password ? 'is-invalid' : ''}`}
                  placeholder="••••••••" 
                  minLength="6" 
                  required 
                  onChange={handleInputChange}
                  autoComplete="new-password"
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
              <div className="error">At least 6 characters.</div>
            </div>

            <div className="field">
              <label htmlFor="confirm" className="label">Confirm password</label>
              <div className="pw-group">
                <input 
                  type={showConfirm ? 'text' : 'password'} 
                  id="confirm" 
                  name="confirm"
                  ref={confirmRef}
                  className={`input ${fieldErrors.confirm || !passwordMatch ? 'is-invalid' : ''}`}
                  placeholder="••••••••" 
                  minLength="6" 
                  required 
                  onChange={handleInputChange}
                  autoComplete="new-password"
                />
                <button 
                  className="pw-toggle" 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi bi-eye${showConfirm ? '-slash' : ''}`}></i>
                </button>
              </div>
              <div className="error" style={{ color: passwordMatch && confirm ? '#15803d' : '#b91c1c' }}>
                {passwordMatch && confirm ? 'Looks good.' : 'Passwords must match.'}
              </div>
            </div>

            <div className="row-aux">
              <label className="check">
                <input 
                  type="checkbox" 
                  id="terms" 
                  name="terms"
                  ref={termsRef}
                  required 
                  onChange={handleInputChange}
                />
                <span>I agree to the <a className="link" href="#terms" onClick={(e) => e.preventDefault()}>Terms</a> and <a className="link" href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a></span>
              </label>
            </div>

            <button 
              className="btn-solve btn-wide" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <i className="bi bi-person-check-fill"></i>
                  <span>Create account</span>
                </>
              )}
            </button>

            <p className="signup">
              Already have an account? <Link className="link-strong" to="/login">Sign in</Link>
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

export default Register;
