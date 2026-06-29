import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './Login.css';

export const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shakeError, setShakeError] = useState(false);
  
  // Custom Sign Up states
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  // Google login modal states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Sign In Submit Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setShakeError(false);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setErrorMsg(res.error || 'Login failed');
      setShakeError(true);
    }
  };

  // Sign Up (Client Registration) Submit Handler
  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setShakeError(false);
    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        role: 'CLIENT'
      });
      
      const res = await login(signUpEmail, signUpPassword);
      setLoading(false);
      if (res.success) {
        navigate('/');
      } else {
        setErrorMsg('Registration succeeded, but auto-login failed.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.error || 'Registration failed');
      setShakeError(true);
    }
  };

  // Demo account quick login
  const handleDemoLogin = async (roleEmail, rolePassword) => {
    setEmail(roleEmail);
    setPassword(rolePassword);
    setIsSignUp(false);
    
    setLoading(true);
    setErrorMsg('');
    setShakeError(false);
    
    const res = await login(roleEmail, rolePassword);
    setLoading(false);
    if (res.success) {
      navigate('/');
    } else {
      setErrorMsg(res.error || 'Login failed');
      setShakeError(true);
    }
  };

  // Automated Google Sign-in/Sign-up flow (Registers as CLIENT if not present)
  const handleGoogleAuth = async (name, googleEmail) => {
    setShowGoogleModal(false);
    setLoading(true);
    setErrorMsg('');
    
    try {
      const res = await login(googleEmail, 'google123');
      if (res.success) {
        setLoading(false);
        navigate('/');
        return;
      }
      
      await axios.post(`${API_URL}/auth/register`, {
        name: name,
        email: googleEmail,
        password: 'google123',
        role: 'CLIENT'
      });
      
      const finalRes = await login(googleEmail, 'google123');
      setLoading(false);
      if (finalRes.success) {
        navigate('/');
      } else {
        setErrorMsg('Google login failed after auto-registration');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.error || 'Google Authentication failed');
    }
  };

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    if (!customGoogleEmail || !customGoogleName) return;
    handleGoogleAuth(customGoogleName, customGoogleEmail);
  };

  const demoRoles = [
    { role: 'Admin', email: 'admin@crownridge.com', password: 'admin123', class: 'pill-admin' },
    { role: 'Manager', email: 'manager@crownridge.com', password: 'manager123', class: 'pill-manager' },
    { role: 'Agent', email: 'agent@crownridge.com', password: 'agent123', class: 'pill-agent' },
    { role: 'Client', email: 'client@crownridge.com', password: 'client123', class: 'pill-client' }
  ];

  return (
    <div className="login-container-split">
      {/* Left Panel */}
      <div className="login-left-panel">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        <div className="left-content fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="brand-logo">
            <svg className="brand-premium-logo" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l3 12h14l3-12-5 6-4-6-4 6-5-6z" fill="rgba(212,175,55,0.1)" />
              <path d="M3 20h18" />
            </svg>
            <div className="logo-text">
              <h1>Crownridge LLP</h1>
              <span className="logo-subtitle">Support Management</span>
            </div>
          </div>
        </div>

        <div className="left-hero">
          <span className="eyebrow fade-up" style={{ animationDelay: '0.2s' }}>ENTERPRISE PLATFORM</span>
          <h2 className="headline fade-up" style={{ animationDelay: '0.3s' }}>
            Support that <br />
            <span className="shimmer-text">never sleeps.</span>
          </h2>
        </div>

        <div className="stats-row fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="stat-mini-card">
            <div className="stat-val">98%</div>
            <div className="stat-lbl">SLA rate</div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-val">&lt;4m</div>
            <div className="stat-lbl">Avg response</div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-val">5</div>
            <div className="stat-lbl">Role levels</div>
          </div>
        </div>

        <div className="features-list">
          <div className="feature-item slide-right" style={{ animationDelay: '0.5s' }}>
            <div className="icon-box box-gold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="feature-text">Role-based access control</div>
          </div>
          <div className="feature-item slide-right" style={{ animationDelay: '0.6s' }}>
            <div className="icon-box box-purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="feature-text">Live real-time tracking</div>
          </div>
          <div className="feature-item slide-right" style={{ animationDelay: '0.7s' }}>
            <div className="icon-box box-teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="feature-text">AI assistant built in</div>
          </div>
        </div>

        <div className="left-footer fade-up" style={{ animationDelay: '0.8s' }}>
          <span className="live-dot"></span>
          <span className="operational-text">All systems operational</span>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right-panel">
        <div className="right-content-wrapper">
          <span className="eyebrow-small fade-up" style={{ animationDelay: '0.2s' }}>
            {isSignUp ? 'CLIENT REGISTRATION' : 'SECURE SIGN-IN'}
          </span>
          <h2 className="right-title fade-up" style={{ animationDelay: '0.3s' }}>
            {isSignUp ? 'Create Client Account' : 'Welcome back'}
          </h2>
          <p className="right-subtitle fade-up" style={{ animationDelay: '0.4s' }}>
            {isSignUp ? 'Register to submit and track support incidents' : 'Sign in to your Crownridge workspace'}
          </p>

          {/* Form conditional render */}
          {!isSignUp ? (
            <form className="login-form-custom" onSubmit={handleLogin}>
              <div className="form-group-custom fade-up" style={{ animationDelay: '0.5s' }}>
                <label>EMAIL ADDRESS</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@crownridge.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group-custom fade-up" style={{ animationDelay: '0.6s' }}>
                <label>PASSWORD</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className={`error-msg-custom ${shakeError ? 'shake' : ''}`}>
                  <span className="error-icon">⚠️</span>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="login-submit-btn-custom fade-up" style={{ animationDelay: '0.7s' }} disabled={loading}>
                {loading ? (
                  <div className="spinner-dots-gold">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center mt-4 text-xs text-text-muted fade-up" style={{ animationDelay: '0.75s' }}>
                Don't have an account?{' '}
                <button type="button" className="text-gold hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer" onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                }}>
                  Register as Client
                </button>
              </div>
            </form>
          ) : (
            <form className="login-form-custom" onSubmit={handleSignUp}>
              <div className="form-group-custom fade-up" style={{ animationDelay: '0.5s' }}>
                <label>FULL NAME</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="form-group-custom fade-up" style={{ animationDelay: '0.55s' }}>
                <label>EMAIL ADDRESS</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group-custom fade-up" style={{ animationDelay: '0.6s' }}>
                <label>PASSWORD</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className={`error-msg-custom ${shakeError ? 'shake' : ''}`}>
                  <span className="error-icon">⚠️</span>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="login-submit-btn-custom fade-up" style={{ animationDelay: '0.7s' }} disabled={loading}>
                {loading ? (
                  <div className="spinner-dots-gold">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Google Sign-in Button only visible on Sign-Up Mode */}
              <button
                type="button"
                className="google-signin-btn-custom fade-up"
                style={{ animationDelay: '0.75s' }}
                onClick={() => setShowGoogleModal(true)}
                disabled={loading}
              >
                <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign up with Google</span>
              </button>

              <div className="text-center mt-4 text-xs text-text-muted fade-up" style={{ animationDelay: '0.8s' }}>
                Already have an account?{' '}
                <button type="button" className="text-gold hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer" onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                }}>
                  Sign In
                </button>
              </div>
            </form>
          )}

          <div className="divider-custom fade-up" style={{ animationDelay: '0.8s' }}>
            <span>or continue as</span>
          </div>

          <div className="demo-roles-grid fade-up" style={{ animationDelay: '0.9s' }}>
            {demoRoles.map((dr) => (
              <button
                key={dr.role}
                className={`demo-pill ${dr.class}`}
                onClick={() => handleDemoLogin(dr.email, dr.password)}
                disabled={loading}
              >
                {dr.role}
              </button>
            ))}
          </div>

          <footer className="right-footer fade-up" style={{ animationDelay: '1s' }}>
            Protected by Crownridge Security · Powered by Anthropic Claude
          </footer>
        </div>
      </div>

      {/* Google OAuth Simulated Popup Modal */}
      {showGoogleModal && (
        <div className="google-modal-overlay">
          <div className="google-modal-card">
            <button className="google-modal-close-btn" onClick={() => {
              setShowGoogleModal(false);
              setShowCustomGoogleInput(false);
            }}>×</button>
            
            <div className="google-logo-wrapper">
              <svg width="40" height="40" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            
            <h3 className="google-modal-title">Sign up with Google</h3>
            <p className="google-modal-subtitle">to continue to Crownridge LLP</p>
            
            {!showCustomGoogleInput ? (
              <>
                <div className="google-accounts-list">
                  <button className="google-account-item" onClick={() => handleGoogleAuth('Alex Johnson', 'alex.johnson@gmail.com')}>
                    <div className="google-avatar">AJ</div>
                    <div className="google-account-details">
                      <span className="google-account-name">Alex Johnson</span>
                      <span className="google-account-email">alex.johnson@gmail.com</span>
                    </div>
                  </button>
                  <button className="google-account-item" onClick={() => handleGoogleAuth('Sarah Miller', 'sarah.miller@gmail.com')}>
                    <div className="google-avatar">SM</div>
                    <div className="google-account-details">
                      <span className="google-account-name">Sarah Miller</span>
                      <span className="google-account-email">sarah.miller@gmail.com</span>
                    </div>
                  </button>
                  <button className="google-account-item" onClick={() => setShowCustomGoogleInput(true)}>
                    <div className="google-avatar" style={{ backgroundColor: '#f1f3f4', color: '#5f6368' }}>+</div>
                    <div className="google-account-details">
                      <span className="google-account-name" style={{ color: '#1a73e8' }}>Use another account</span>
                      <span className="google-account-email">Sign in or register a new email</span>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <form className="google-custom-form" onSubmit={handleCustomGoogleSubmit}>
                <div className="google-input-group">
                  <label>FULL NAME</label>
                  <input
                    type="text"
                    required
                    className="google-field-input"
                    placeholder="Enter your name"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                  />
                </div>
                <div className="google-input-group">
                  <label>GOOGLE EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    className="google-field-input"
                    placeholder="you@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="google-submit-btn">Continue</button>
                <button 
                  type="button" 
                  className="google-submit-btn" 
                  style={{ backgroundColor: '#fff', color: '#1a73e8', border: '1px solid #dadce0', marginTop: '-0.5rem' }}
                  onClick={() => setShowCustomGoogleInput(false)}
                >
                  Back to Accounts
                </button>
              </form>
            )}
            
            <div className="google-modal-footer">
              To continue, Google will share your name, email address, profile picture, and language preference with Crownridge LLP. See their <a href="#privacy">Privacy Policy</a> and <a href="#terms">Terms of Service</a>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
