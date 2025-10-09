import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../firebase/auth';
import { createUserProfile } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import AlertModal from '../components/AlertModal';

function Register() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validated, setValidated] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  // 이미 로그인된 사용자는 challenges 페이지로 리다이렉트 (모달 표시 중이 아닐 때만)
  useEffect(() => {
    if (currentUser && !modal.isOpen) {
      navigate('/challenges', { replace: true });
    }
  }, [currentUser, navigate, modal.isOpen]);

  // Firebase 에러 메시지를 한국어로 번역
  const getErrorMessage = (error) => {
    if (error.includes('auth/email-already-in-use')) {
      return '이미 사용 중인 이메일입니다.';
    } else if (error.includes('auth/invalid-email')) {
      return '올바른 이메일 형식이 아닙니다.';
    } else if (error.includes('auth/weak-password')) {
      return '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
    } else if (error.includes('auth/operation-not-allowed')) {
      return '이메일/비밀번호 로그인이 비활성화되어 있습니다.';
    } else if (error.includes('auth/network-request-failed')) {
      return '네트워크 연결을 확인해주세요.';
    } else {
      return error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false || password !== confirm) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    setValidated(true);
    
    // Get form data
    const formData = new FormData(form);
    const firstName = formData.get('firstName') || document.getElementById('firstName').value;
    const lastName = formData.get('lastName') || document.getElementById('lastName').value;
    const email = formData.get('email') || document.getElementById('email').value;
    const username = formData.get('username') || document.getElementById('username').value;
    
    const displayName = `${firstName} ${lastName}`;
    
    setIsLoading(true);
    
    try {
      // Register user with Firebase Auth
      const result = await registerUser(email, password, displayName);
      
      if (result.success) {
        // Create user profile in Firestore
        await createUserProfile(result.user.uid, {
          email: email,
          displayName: displayName,
          firstName: firstName,
          lastName: lastName,
          username: username,
          collectedBlocks: [],
          createdAt: new Date().toISOString()
        });
        
        // Show success modal
        setModal({
          isOpen: true,
          type: 'success',
          title: '회원가입 완료!',
          message: '계정이 성공적으로 생성되었습니다. 로그인 페이지로 이동합니다.'
        });
        
        setTimeout(() => {
          setModal({ ...modal, isOpen: false });
          navigate('/login');
        }, 2000);
      } else {
        // Handle registration error
        const errorMessage = getErrorMessage(result.error);
        setModal({
          isOpen: true,
          type: 'error',
          title: '회원가입 실패',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: '오류 발생',
        message: `회원가입 중 오류가 발생했습니다: ${getErrorMessage(error.message)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <AppBar title="BlockHunt" />
      
      <main className="container py-5">
        <div className="row justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
          <div className="col-md-8 col-lg-6">
            <div className="panel p-4 p-md-5">
              <div className="mb-3 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-4 border" style={{ width: '52px', height: '52px', borderColor: '#ffe0e7', background: '#fff5f7' }}>
                  <i className="bi bi-person-plus-fill" style={{ fontSize: '1.25rem', color: 'var(--brand)' }}></i>
                </div>
                <h1 className="h4 mt-3 mb-1 brand-title">Create your account</h1>
                <p className="mb-0 text-muted">Join BlockHunt to start building</p>
              </div>

              <form className={`needs-validation ${validated ? 'was-validated' : ''}`} noValidate onSubmit={handleSubmit}>
                <div className="row g-3">
              <div className="col-sm-6">
                <label htmlFor="firstName" className="form-label">First name</label>
                <input type="text" className="form-control" id="firstName" name="firstName" placeholder="Ada" required />
                <div className="invalid-feedback">Enter your first name.</div>
              </div>
              <div className="col-sm-6">
                <label htmlFor="lastName" className="form-label">Last name</label>
                <input type="text" className="form-control" id="lastName" name="lastName" placeholder="Lovelace" required />
                <div className="invalid-feedback">Enter your last name.</div>
              </div>
              <div className="col-12">
                <label htmlFor="email" className="form-label">Email</label>
                <input type="email" className="form-control" id="email" name="email" placeholder="you@example.com" required />
                <div className="invalid-feedback">Provide a valid email.</div>
              </div>
              <div className="col-12">
                <label htmlFor="username" className="form-label">Username</label>
                <input type="text" className="form-control" id="username" name="username" placeholder="BlockHuntr" minLength="3" required />
                <div className="invalid-feedback">Minimum 3 characters.</div>
              </div>
                  <div className="col-12">
                    <label htmlFor="password" className="form-label">Password</label>
                    <div className="input-group">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-control" 
                    id="password" 
                    name="password"
                    placeholder="••••••••" 
                    minLength="6" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                      <button 
                        className="btn btn-ghost" 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    <div className="invalid-feedback">At least 6 characters.</div>
                    <div className="form-text">Use 8+ characters with a mix of letters and numbers for better security.</div>
                  </div>
                  <div className="col-12">
                    <label htmlFor="confirm" className="form-label">Confirm password</label>
                    <div className="input-group">
                  <input 
                    type={showConfirm ? 'text' : 'password'} 
                    className="form-control" 
                    id="confirm" 
                    name="confirm"
                    placeholder="••••••••" 
                    minLength="6" 
                    required 
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                      <button 
                        className="btn btn-ghost" 
                        type="button" 
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        <i className={`bi bi-eye${showConfirm ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    <div className={`${password === confirm ? 'valid' : 'invalid'}-feedback`}>
                      {password === confirm ? 'Looks good.' : 'Passwords must match.'}
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-brand w-100 mt-4 py-2" 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating account...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-check-fill me-1"></i> Create account
                    </>
                  )}
                </button>
              </form>

              <p className="text-center mt-4 mb-0">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

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

