import React, { useState } from 'react';

const Header = ({ activePage, toggleSidebar }) => {
  const [isDropdownShow, setIsDropdownShow] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const pageTitles = {
    'dashboard':           'Dashboard Overview',
    'all-transactions':    'All Transactions',
    'add-income':          'Add Income',
    'add-expense':         'Add Expense',
    'transfer-money':      'Transfer Money',
    'all-accounts':        'All Accounts',
    'add-account':         'Add Account',
    'account-statement':   'Account Statement',
    'bank-statement':      'Bank Statement',
    'company-report':      'Company Report',
    'combined-report':     'Combined Report',
    'date-wise-report':    'Date-wise Report',
    'employee-master':     'Employee Master',
    'company-master':      'Company Master',
    'bank-master':         'Bank Master',
    'payment-mode-master': 'Payment Mode Master',
    'category-master':     'Purpose / Category Master',
    'general-settings':    'General Settings',
    'preferences':         'Preferences'
  };

  const handleAction = (action) => {
    setIsDropdownShow(false);
    
    // Lazy load sweetalert2 to avoid block
    import('sweetalert2').then(({ default: Swal }) => {
        if (action === 'logout') {
            Swal.fire({
              title: 'Logout?',
              text: 'Are you sure you want to end your session?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#ef4444',
              cancelButtonColor: '#94a3b8',
              confirmButtonText: 'Yes, logout'
            }).then(result => {
              if (result.isConfirmed) {
                Swal.fire({ icon: 'success', title: 'Logged out!', text: 'Session ended.', timer: 1500, showConfirmButton: false });
                setTimeout(() => window.location.reload(), 1500);
              }
            });
        } else if (action === 'my-profile') {
            setShowProfileModal(true);
        } else {
            Swal.fire({
                icon: 'info',
                title: action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                text: 'This functionality will be fully implemented soon.',
                confirmButtonColor: '#5c67f2'
            });
        }
    });
  };

  // Close dropdown when clicking outside
  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setTimeout(() => setIsDropdownShow(false), 150);
    }
  };

  return (
    <nav className="top-navbar">
      {/* Left */}
      <div className="nav-left">
        <button className="toggle-btn" id="sidebarToggle" onClick={toggleSidebar} title="Toggle Sidebar">
          <i className="bi bi-list"></i>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 className="page-title">
            {pageTitles[activePage] || 'Dashboard Overview'}
          </h4>
        </div>
      </div>

      {/* Right */}
      <div className="nav-right">
        {/* Search (hidden on mobile via CSS) */}
        <div className="search-container d-none d-lg-block">
          <i className="bi bi-search"></i>
          <input type="text" placeholder="Search anything..." />
        </div>

        {/* User Profile */}
        <div className="user-profile-dropdown" onBlur={handleBlur}>
          <button
            className="user-profile-btn"
            onClick={() => setIsDropdownShow(prev => !prev)}
            aria-expanded={isDropdownShow}
          >
            <img
              src="https://ui-avatars.com/api/?name=Kunal+Patil&background=5c67f2&color=fff&bold=true"
              alt="User"
              className="user-avatar"
            />
            <div className="user-details d-none d-sm-block">
              <span className="user-name">Kunal Patil</span>
              <span className="user-role">Super Admin</span>
            </div>
            <i className={`bi bi-chevron-down dropdown-arrow ${isDropdownShow ? 'rotate-180' : ''}`} style={{ transition: 'transform 0.2s' }}></i>
          </button>

          <div className={`user-dropdown-menu ${isDropdownShow ? 'show' : ''}`}>
            <div className="dropdown-header">
              <h6>Kunal Patil</h6>
              <p>kunal.patil@technokraft.com</p>
            </div>

            <a href="#" className="dropdown-item" onClick={e => { e.preventDefault(); handleAction('my-profile'); }}>
              <i className="bi bi-person-circle"></i>
              <span>My Profile</span>
            </a>
            <a href="#" className="dropdown-item" onClick={e => { e.preventDefault(); handleAction('account-settings'); }}>
              <i className="bi bi-gear"></i>
              <span>Account Settings</span>
            </a>
            <a href="#" className="dropdown-item" onClick={e => { e.preventDefault(); handleAction('notifications'); }}>
              <i className="bi bi-bell"></i>
              <span>Notifications</span>
            </a>
            <a href="#" className="dropdown-item" onClick={e => { e.preventDefault(); handleAction('security'); }}>
              <i className="bi bi-shield-check"></i>
              <span>Security</span>
            </a>
            <div className="dropdown-divider"></div>
            <a href="#" className="dropdown-item" onClick={e => { e.preventDefault(); handleAction('help-and-support'); }}>
              <i className="bi bi-question-circle"></i>
              <span>Help & Support</span>
            </a>
            <div className="dropdown-divider"></div>
            <a href="#" className="dropdown-item danger" onClick={e => { e.preventDefault(); handleAction('logout'); }}>
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </a>
          </div>
        </div>
      </div>
      
      {/* Profile Modal */}
      {showProfileModal && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.2rem', overflow: 'hidden' }}>
                        <div className="modal-header border-bottom-0 pb-0 position-relative">
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(135deg, #5c67f2, #4a54e1)', zIndex: 0 }}></div>
                            <button type="button" className="btn-close position-absolute top-0 end-0 m-3 bg-white rounded-circle p-2 shadow-sm" style={{ zIndex: 2 }} onClick={() => setShowProfileModal(false)}></button>
                        </div>
                        <div className="modal-body text-center px-4 pb-4 pt-0" style={{ zIndex: 1, position: 'relative' }}>
                            <div className="mb-3 position-relative d-inline-block">
                                <img src="https://ui-avatars.com/api/?name=Kunal+Patil&background=fff&color=5c67f2&bold=true&size=120" alt="Profile" className="rounded-circle shadow-sm" style={{ border: '4px solid #fff', marginTop: '40px' }} />
                                <span className="position-absolute bottom-0 end-0 p-2 bg-success border border-light rounded-circle" style={{ width: '20px', height: '20px' }}>
                                    <span className="visually-hidden">Active</span>
                                </span>
                            </div>
                            <h4 className="fw-bold mb-1">Kunal Patil</h4>
                            <p className="text-muted mb-4">Super Admin</p>
                            
                            <div className="bg-light rounded-4 p-3 text-start mb-4 shadow-sm border border-white">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-primary d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-envelope-fill"></i></div>
                                    <div>
                                        <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Email</small>
                                        <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>kunal.patil@technokraft.com</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-primary d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-telephone-fill"></i></div>
                                    <div>
                                        <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Phone</small>
                                        <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>+91 98765 43210</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center">
                                    <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-danger d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-shield-lock-fill"></i></div>
                                    <div>
                                        <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Role & Access</small>
                                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill">Super Admin</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer border-top-0 pt-0 pb-4 justify-content-center bg-white">
                            <button type="button" className="btn btn-light px-4 rounded-pill fw-bold border" onClick={() => setShowProfileModal(false)}>Close</button>
                            <button type="button" className="btn btn-primary px-4 rounded-pill fw-bold border-0 shadow-sm" style={{ background: '#5c67f2' }}>Edit Profile</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}
    </nav>
  );
};

export default Header;
