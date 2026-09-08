import React from 'react';

const Footer = () => {
  return (
    <footer className="app-footer">
      <span>© 2026</span>
      <strong style={{ color: 'var(--text)' }}>TechnoKraft Training &amp; Solution</strong>
      <span>| Powered by</span>
      <a href="https://www.technokraftservices.com/" target="_blank" rel="noopener noreferrer">
        TechnoKraft Services LLP
      </a>
      <span className="app-footer-sep">|</span>
      <span className="app-footer-version">v3.1</span>
    </footer>
  );
};

export default Footer;
