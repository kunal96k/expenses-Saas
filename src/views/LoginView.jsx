import React, { useMemo, useState } from 'react';
import Footer from '../components/Footer';
import { apiService } from '../services/api';

const LoginView = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
                <div className="login-brand-app">Expenses</div>
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
            <input
              type="password"
              placeholder="Password"
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

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
                <div className="login-brand-app">Expenses</div>
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
