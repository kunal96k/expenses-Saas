import React, { useMemo, useState } from 'react';
import Footer from '../components/Footer';
import { apiService } from '../services/api';

const LoginView = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(() => !username.trim() || !password, [username, password]);
  const isForgotDisabled = useMemo(() => !forgotEmail.trim(), [forgotEmail]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDisabled) return;
    onLogin?.({ username, password });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (isForgotDisabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await apiService.postPublic('/auth/public/forgot-password', { email: forgotEmail });
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire('Success', response?.message || 'New credentials sent to your email', 'success');
      });
      setIsForgotPassword(false);
      setForgotEmail('');
    } catch (err) {
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire('Error', err?.message || 'Email not present or not authorized', 'warning');
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" aria-hidden="true">
        <div className="login-shape"></div>
        <div className="login-shape"></div>
      </div>

      <div className="login-shell">
        {!isForgotPassword ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-brand">
              <div className="login-brand-logo">
                <img src="/assets/tts-logo-ev.png" alt="TechnoKraft Logo" />
              </div>
              <div className="login-brand-text">
                <div className="login-brand-title">TechnoKraft</div>
                <div className="login-brand-subtitle">Training and Solutions</div>
                <div className="login-brand-app">
                  Expenses <span className="login-version-pill">v3.1</span>
                </div>
              </div>
            </div>

            <h3 className="login-title">Login Here</h3>

            <label htmlFor="login-username">Username</label>
            <input
              type="text"
              placeholder="Email or Phone"
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              inputMode="email"
            />

            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            <div style={{ textAlign: 'right', marginTop: '15px' }}>
              <a href="#" style={{ color: '#ffffff', fontSize: '0.85rem', opacity: 0.8 }} onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); }}>
                Forgot Password?
              </a>
            </div>

            <button className="login-button" type="submit" disabled={isDisabled}>
              Log In
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleForgotSubmit}>
            <div className="login-brand">
              <div className="login-brand-logo">
                <img src="/assets/tts-logo-ev.png" alt="TechnoKraft Logo" />
              </div>
              <div className="login-brand-text">
                <div className="login-brand-title">TechnoKraft</div>
                <div className="login-brand-subtitle">Training and Solutions</div>
                <div className="login-brand-app">
                  Expenses <span className="login-version-pill">v3.1</span>
                </div>
              </div>
            </div>

            <h3 className="login-title">Reset Password</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
              Enter your email to receive your new login credentials.
            </p>

            <label htmlFor="forgot-email">Email Address</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              id="forgot-email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />

            <button className="login-button" type="submit" disabled={isForgotDisabled || isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Credentials'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <a href="#" style={{ color: '#ffffff', fontSize: '0.85rem', opacity: 0.8 }} onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); }}>
                Back to Login
              </a>
            </div>
          </form>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default LoginView;
