import React, { useState, useEffect } from 'react';
import './MaintenanceView.css';

export default function MaintenanceView({ onRestore, errorDetails }) {
  const [countdown, setCountdown] = useState(15);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Backend Service Offline');
  const [statusColor, setStatusColor] = useState('#f87171');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(new Date().toLocaleTimeString());
  const [pingResult, setPingResult] = useState('Waiting for reconnect...');

  // Auto-retry countdown
  useEffect(() => {
    let timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleHealthCheck(false);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isChecking]);

  const handleHealthCheck = async (manual = false) => {
    if (isChecking) return;
    setIsChecking(true);
    setStatusMessage('Pinging Backend Service...');
    setStatusColor('#fbbf24');
    setLastCheckTime(new Date().toLocaleTimeString());
    setPingResult('Connecting...');

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9091/api';
      // Normalize health check URL
      let healthUrl;
      if (baseUrl.includes('/api')) {
        healthUrl = baseUrl.replace(/\/api\/?$/, '/actuator/health');
      } else {
        healthUrl = `${baseUrl}/actuator/health`;
      }

      const res = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        setStatusMessage('Backend Restored! Reconnecting...');
        setStatusColor('#34d399');
        setPingResult(`Online (HTTP ${res.status})`);
        
        setTimeout(() => {
          if (typeof onRestore === 'function') {
            onRestore();
          } else {
            window.location.reload();
          }
        }, 1200);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      setStatusMessage('Backend Still Unavailable');
      setStatusColor('#f87171');
      setPingResult(err.message || 'Connection Refused');
      setCountdown(15);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="maintenance-wrapper">
      <div className="maintenance-grid"></div>
      <div className="maint-orb maint-orb-blue"></div>
      <div className="maint-orb maint-orb-indigo"></div>
      <div className="maint-orb maint-orb-amber"></div>

      <div className="maintenance-card-container">
        
        {/* Status Pill */}
        <div className="maint-status-pill">
          <span className="maint-pulse-dot"></span>
          <span>System Maintenance &bull; Service Unavailable</span>
        </div>

        {/* Animated Server + Gear Graphic */}
        <div className="maint-graphic-box">
          <div className="maint-graphic-glow"></div>
          <div className="maint-icon-square">
            {/* Server SVG */}
            <svg className="maint-server-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
              <line x1="10" y1="6" x2="14" y2="6"></line>
              <line x1="10" y1="18" x2="14" y2="18"></line>
            </svg>
            {/* Spinning Gear SVG */}
            <svg className="maint-gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
        </div>

        {/* Headings */}
        <h1 className="maint-title">Server Under Maintenance</h1>
        <p className="maint-description">
          The finance backend service is currently undergoing scheduled maintenance or restarting. Automatic reconnection will occur when the server is ready.
        </p>

        {/* Info Box */}
        <div className="maint-info-bar">
          <div className="maint-info-left">
            <div className="maint-badge-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div>
              <div className="maint-status-text" style={{ color: statusColor }}>
                {statusMessage}
              </div>
              <div className="maint-endpoint-text">
                Target: {import.meta.env.VITE_API_BASE_URL || 'Backend Service (9091)'}
              </div>
            </div>
          </div>
          <div className="maint-timer-pill">
            {isChecking ? 'Checking...' : `Auto-retry in ${countdown}s`}
          </div>
        </div>

        {/* Action Buttons - ZERO translateY on hover */}
        <div className="maint-btn-group">
          <button 
            className="maint-btn-primary" 
            onClick={() => handleHealthCheck(true)}
            disabled={isChecking}
          >
            {isChecking ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            )}
            <span>{isChecking ? 'Testing Connection...' : 'Retry Connection'}</span>
          </button>

          <button 
            className="maint-btn-secondary" 
            onClick={() => window.location.reload()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            <span>Reload App</span>
          </button>
        </div>

        {/* Diagnostics Toggle */}
        <div>
          <button 
            className="maint-diag-btn" 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>{showDiagnostics ? 'Hide Diagnostics' : 'Technical Diagnostics'}</span>
          </button>

          {showDiagnostics && (
            <div className="maint-diag-box">
              <div className="maint-diag-row">
                <span className="maint-diag-lbl">Status</span>
                <span className="maint-diag-val">{errorDetails?.status || '502/503 Service Unavailable'}</span>
              </div>
              <div className="maint-diag-row">
                <span className="maint-diag-lbl">Timestamp</span>
                <span className="maint-diag-val">{lastCheckTime}</span>
              </div>
              <div className="maint-diag-row">
                <span className="maint-diag-lbl">Ping Result</span>
                <span className="maint-diag-val">{pingResult}</span>
              </div>
              <div className="maint-diag-row">
                <span className="maint-diag-lbl">API Base</span>
                <span className="maint-diag-val">{import.meta.env.VITE_API_BASE_URL || 'Default /api'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="maint-footer-bar">
          <span>TTS Finance SaaS v3.1 &bull; System Monitoring</span>
          <span>Support: <a href="mailto:technokrafttrainingg@gmail.com" className="maint-footer-link">technokrafttrainingg@gmail.com</a></span>
        </div>

      </div>
    </div>
  );
}
