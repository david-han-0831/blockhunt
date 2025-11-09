import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';

function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (currentUser) {
      navigate('/challenges');
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <AppBar title="BlockHunt" />
      <main className="main">
        <div className="wrap">
          {/* Hero Section */}
          <section className="hero-section" style={{ 
            padding: '4rem 0',
            textAlign: 'center',
            minHeight: 'calc(100vh - 200px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div className="hero-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
              {/* Logo/Brand */}
              <div className="hero-brand" style={{ marginBottom: '2rem' }}>
                <h1 style={{ 
                  fontSize: '3.5rem',
                  fontWeight: '900',
                  margin: '0 0 1rem',
                  background: 'linear-gradient(180deg, #8b5cf6, var(--brand))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  BlockHunt
                </h1>
                <p style={{ 
                  fontSize: '1.5rem',
                  color: 'var(--muted)',
                  margin: '0 0 2rem',
                  fontWeight: '400'
                }}>
                  Learn programming through interactive challenges and collect code blocks
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="hero-actions" style={{ 
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '3rem'
              }}>
                <button 
                  className="btn btn--brand"
                  onClick={handleGetStarted}
                  style={{
                    fontSize: '1.125rem',
                    padding: '0.875rem 2rem',
                    fontWeight: '600',
                    background: 'linear-gradient(180deg, #8b5cf6, var(--brand))',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 8px 20px rgba(124,58,237,.28)'
                  }}
                >
                  <i className="bi bi-rocket-takeoff me-2"></i>
                  Get Started
                </button>
                {!currentUser && (
                  <Link 
                    to="/register"
                    className="btn"
                    style={{
                      fontSize: '1.125rem',
                      padding: '0.875rem 2rem',
                      fontWeight: '600',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Sign Up
                  </Link>
                )}
              </div>

              {/* Features Grid */}
              <div className="features-grid features-grid-responsive" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '2rem',
                marginTop: '4rem',
                textAlign: 'left'
              }}>
                <div className="feature-card" style={{
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}>
                  <div className="feature-icon" style={{
                    fontSize: '2.5rem',
                    color: 'var(--brand)',
                    marginBottom: '1rem'
                  }}>
                    <i className="bi bi-list-task"></i>
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    margin: '0 0 0.5rem',
                    color: 'var(--ink)'
                  }}>
                    Interactive Challenges
                  </h3>
                  <p style={{
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    Solve programming problems step by step and improve your coding skills
                  </p>
                </div>

                <div className="feature-card" style={{
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}>
                  <div className="feature-icon" style={{
                    fontSize: '2.5rem',
                    color: 'var(--brand)',
                    marginBottom: '1rem'
                  }}>
                    <i className="bi bi-qr-code-scan"></i>
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    margin: '0 0 0.5rem',
                    color: 'var(--ink)'
                  }}>
                    Collect Blocks
                  </h3>
                  <p style={{
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    Scan QR codes to collect programming blocks and build your collection
                  </p>
                </div>

                <div className="feature-card" style={{
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}>
                  <div className="feature-icon" style={{
                    fontSize: '2.5rem',
                    color: 'var(--brand)',
                    marginBottom: '1rem'
                  }}>
                    <i className="bi bi-code-slash"></i>
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    margin: '0 0 0.5rem',
                    color: 'var(--ink)'
                  }}>
                    Visual Studio
                  </h3>
                  <p style={{
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    Use Blockly to create programs visually and see your code come to life
                  </p>
                </div>
              </div>

              {/* How It Works */}
              <div className="how-it-works" style={{
                marginTop: '4rem',
                padding: '3rem 0',
                borderTop: '1px solid var(--border)'
              }}>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  margin: '0 0 2rem',
                  textAlign: 'center',
                  color: 'var(--ink)'
                }}>
                  How It Works
                </h2>
                <div className="steps steps-responsive" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '2rem',
                  rowGap: '3rem',
                  maxWidth: '900px',
                  margin: '0 auto'
                }}>
                  <div className="step" style={{ textAlign: 'center' }}>
                    <div className="step-number" style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, #8b5cf6, var(--brand))',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      margin: '0 auto 1rem'
                    }}>
                      1
                    </div>
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      margin: '0 0 0.5rem',
                      color: 'var(--ink)'
                    }}>
                      Sign Up
                    </h4>
                    <p style={{
                      color: 'var(--muted)',
                      margin: 0,
                      fontSize: '0.875rem'
                    }}>
                      Create your account to start learning
                    </p>
                  </div>

                  <div className="step" style={{ textAlign: 'center' }}>
                    <div className="step-number" style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, #8b5cf6, var(--brand))',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      margin: '0 auto 1rem'
                    }}>
                      2
                    </div>
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      margin: '0 0 0.5rem',
                      color: 'var(--ink)'
                    }}>
                      Solve Challenges
                    </h4>
                    <p style={{
                      color: 'var(--muted)',
                      margin: 0,
                      fontSize: '0.875rem'
                    }}>
                      Complete programming challenges
                    </p>
                  </div>

                  <div className="step" style={{ textAlign: 'center' }}>
                    <div className="step-number" style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, #8b5cf6, var(--brand))',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      margin: '0 auto 1rem'
                    }}>
                      3
                    </div>
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      margin: '0 0 0.5rem',
                      color: 'var(--ink)'
                    }}>
                      Collect Blocks
                    </h4>
                    <p style={{
                      color: 'var(--muted)',
                      margin: 0,
                      fontSize: '0.875rem'
                    }}>
                      Scan QR codes to collect blocks
                    </p>
                  </div>

                  <div className="step" style={{ textAlign: 'center' }}>
                    <div className="step-number" style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, #8b5cf6, var(--brand))',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      margin: '0 auto 1rem'
                    }}>
                      4
                    </div>
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      margin: '0 0 0.5rem',
                      color: 'var(--ink)'
                    }}>
                      Build Programs
                    </h4>
                    <p style={{
                      color: 'var(--muted)',
                      margin: 0,
                      fontSize: '0.875rem'
                    }}>
                      Use blocks to create programs in Studio
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default Home;

