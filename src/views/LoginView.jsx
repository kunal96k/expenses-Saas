import React, { useMemo, useState } from 'react';
import Footer from '../components/Footer';

const LoginView = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const isDisabled = useMemo(() => !username.trim() || !password, [username, password]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDisabled) return;
    onLogin?.({ username, password });
  };

  return (
    <div className="login-page">
      <div className="login-background" aria-hidden="true">
        <div className="login-shape"></div>
        <div className="login-shape"></div>
      </div>

      <div className="login-shell">
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

          <button className="login-button" type="submit" disabled={isDisabled}>
            Log In
          </button>
        </form>

        <Footer />
      </div>
    </div>
  );
};

export default LoginView;
