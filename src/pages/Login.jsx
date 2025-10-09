import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import AppBar from '../components/AppBar';
import AlertModal from '../components/AlertModal';

function Login() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [validated, setValidated] = useState(false);
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
    if (error.includes('auth/invalid-credential')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    } else if (error.includes('auth/user-not-found')) {
      return '등록되지 않은 이메일입니다.';
    } else if (error.includes('auth/wrong-password')) {
      return '비밀번호가 올바르지 않습니다.';
    } else if (error.includes('auth/invalid-email')) {
      return '올바른 이메일 형식이 아닙니다.';
    } else if (error.includes('auth/too-many-requests')) {
      return '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
    } else if (error.includes('auth/network-request-failed')) {
      return '네트워크 연결을 확인해주세요.';
    } else if (error.includes('auth/user-disabled')) {
      return '비활성화된 계정입니다.';
    } else {
      return error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    setValidated(true);
    
    // Get form data
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    setIsLoading(true);
    
    try {
      // Login user with Firebase Auth
      const result = await loginUser(email, password);
      
      if (result.success) {
        // Show success modal
        setModal({
          isOpen: true,
          type: 'success',
          title: '로그인 성공!',
          message: '환영합니다! 챌린지 페이지로 이동합니다.'
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
          title: '로그인 실패',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: '오류 발생',
        message: `로그인 중 오류가 발생했습니다: ${getErrorMessage(error.message)}`
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
          <div className="col-md-7 col-lg-5">
            <div className="panel p-4 p-md-5">
              <div className="mb-3 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-4 border" style={{ width: '52px', height: '52px', borderColor: '#ffe0e7', background: '#fff5f7' }}>
                  <i className="bi bi-lock-fill" style={{ fontSize: '1.25rem', color: 'var(--brand)' }}></i>
                </div>
                <h1 className="h4 mt-3 mb-1 brand-title">Welcome back</h1>
                <p className="mb-0 text-muted">Sign in to your BlockHunt account</p>
              </div>

              <form className={`needs-validation ${validated ? 'was-validated' : ''}`} noValidate onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input type="email" className="form-control" id="email" placeholder="you@example.com" required />
                  <div className="invalid-feedback">Please enter a valid email.</div>
                </div>

                <div className="mb-2 position-relative">
                  <label htmlFor="password" className="form-label">Password</label>
                  <div className="input-group">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      className="form-control" 
                      id="password" 
                      placeholder="••••••••" 
                      minLength="6" 
                      required 
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
                  <div className="invalid-feedback">Minimum 6 characters.</div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" value="1" id="remember" />
                    <label className="form-check-label" htmlFor="remember">Remember me</label>
                  </div>
                </div>

                <button 
                  className="btn btn-brand w-100 py-2" 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
                    </>
                  )}
                </button>
              </form>

              <p className="text-center mt-4 mb-0">
                No account? <Link to="/register">Create one</Link>
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

export default Login;

