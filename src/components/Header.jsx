import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { apiService } from '../services/api';

const Header = ({ activePage, toggleSidebar, onPageChange, onLogout, userRole, userProfile, setUserProfile, systemSettings }) => {
  const [isDropdownShow, setIsDropdownShow] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMode, setProfileMode] = useState('view'); // 'view' or 'edit'
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const displayName = userProfile?.name || 'User';
  const displayRole = userRole || 'Viewer';
  const displayEmail = userProfile?.email || '-';
  const displayPhone = userProfile?.phone || '-';
  const displayDesignation = userProfile?.designation || '-';
  const displayEmpCode = userProfile?.empCode || '-';
  const displayLastLogin = userProfile?.lastLogin ? new Date(userProfile.lastLogin).toLocaleString() : '-';
  const avatarName = encodeURIComponent(displayName);

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
                setTimeout(() => {
                  onLogout?.();
                }, 600);
              }
            });
        } else if (action === 'my-profile') {
            setProfileMode('view');
            setProfileForm({
              name: userProfile?.name || '',
              email: userProfile?.email || '',
              phone: userProfile?.phone || '',
              designation: userProfile?.designation || '',
              department: userProfile?.department || '',
              username: userProfile?.username || ''
            });
            setShowProfileModal(true);
        } else if (action === 'general-settings') {
            if (onPageChange) onPageChange('general-settings');
        } else if (action === 'preferences') {
            if (onPageChange) onPageChange('preferences');
        } else if (action === 'reset-password') {
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordModal(true);
        } else if (action === 'help-and-support') {
            setShowHelpModal(true);
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

  const handleProfileSave = async () => {
    try {
      const updated = await apiService.patch('/auth/me/profile', profileForm || {});
      setUserProfile?.(updated);
      setProfileMode('view');
      Swal.fire({ icon: 'success', title: 'Profile updated', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Update failed', err?.message || 'Unable to update profile', 'error');
    }
  };

  const handlePasswordSave = async () => {
    try {
      const { newPassword, confirmPassword } = passwordForm;
      const minLen = systemSettings?.general?.security?.passwordMinLength || 6;
      const strongPolicy = systemSettings?.general?.security?.strongPasswordPolicy;

      if (newPassword.length < minLen) {
        Swal.fire('Validation Error', `Password must be at least ${minLen} characters long based on Security Settings.`, 'error');
        return;
      }
      if (strongPolicy) {
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!strongRegex.test(newPassword)) {
          Swal.fire('Validation Error', 'Password must contain at least one uppercase, lowercase, number, and special character based on Strong Password Policy.', 'error');
          return;
        }
      }
      if (newPassword !== confirmPassword) {
        Swal.fire('Validation Error', 'Passwords do not match.', 'error');
        return;
      }

      await apiService.patch('/auth/me/password', passwordForm);
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Swal.fire({ icon: 'success', title: 'Password updated', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Update failed', err?.message || 'Unable to update password', 'error');
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


        {/* User Profile */}
        <div className="user-profile-dropdown" onBlur={handleBlur}>
          <button
            className="user-profile-btn"
            onClick={() => setIsDropdownShow(prev => !prev)}
            aria-expanded={isDropdownShow}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${avatarName}&background=5c67f2&color=fff&bold=true`}
              alt="User"
              className="user-avatar"
            />
            <div className="user-details d-none d-sm-block">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{displayRole}</span>
            </div>
            <i className={`bi bi-chevron-down dropdown-arrow ${isDropdownShow ? 'rotate-180' : ''}`} style={{ transition: 'transform 0.2s' }}></i>
          </button>

          <div className={`user-dropdown-menu ${isDropdownShow ? 'show' : ''}`} style={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', padding: '8px' }}>
            <div className="dropdown-header" style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', marginBottom: '8px' }}>
              <div className="d-flex align-items-center gap-3">
                <img src={`https://ui-avatars.com/api/?name=${avatarName}&background=5c67f2&color=fff&bold=true`} alt="User" className="rounded-circle" style={{ width: '40px', height: '40px' }} />
                <div>
                  <h6 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>{displayName}</h6>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{displayEmail}</p>
                </div>
              </div>
            </div>

            <a href="#" className="dropdown-item rounded-3 mb-1" style={{ padding: '10px 16px', fontWeight: '600' }} onClick={e => { e.preventDefault(); handleAction('my-profile'); }}>
              <i className="bi bi-person-circle text-primary me-3"></i>
              <span>My Profile</span>
            </a>
            {userRole !== 'Viewer' && (
              <>
                <a href="#" className="dropdown-item rounded-3 mb-1" style={{ padding: '10px 16px', fontWeight: '600' }} onClick={e => { e.preventDefault(); handleAction('general-settings'); }}>
                  <i className="bi bi-gear text-secondary me-3"></i>
                  <span>General Settings</span>
                </a>
              </>
            )}
            <a href="#" className="dropdown-item rounded-3 mb-1" style={{ padding: '10px 16px', fontWeight: '600' }} onClick={e => { e.preventDefault(); handleAction('preferences'); }}>
              <i className="bi bi-sliders text-secondary me-3"></i>
              <span>Preferences</span>
            </a>
            <a href="#" className="dropdown-item rounded-3 mb-1" style={{ padding: '10px 16px', fontWeight: '600' }} onClick={e => { e.preventDefault(); handleAction('reset-password'); }}>
              <i className="bi bi-key text-warning me-3"></i>
              <span>Reset Password</span>
            </a>
            {userRole !== 'Viewer' && (
              <>
                <div className="dropdown-divider my-2"></div>
                <a href="#" className="dropdown-item rounded-3 mb-1" style={{ padding: '10px 16px', fontWeight: '600' }} onClick={e => { e.preventDefault(); handleAction('help-and-support'); }}>
                  <i className="bi bi-question-circle text-info me-3"></i>
                  <span>Help & Support</span>
                </a>
              </>
            )}
            <div className="dropdown-divider my-2"></div>
            <a href="#" className="dropdown-item danger rounded-3" style={{ padding: '10px 16px', fontWeight: '600', color: '#dc2626' }} onClick={e => { e.preventDefault(); handleAction('logout'); }}>
              <i className="bi bi-box-arrow-right me-3"></i>
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
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.2rem', overflow: 'hidden' }}>
                        <div className="modal-header border-bottom-0 pb-0 position-relative">
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(135deg, #5c67f2, #4a54e1)', zIndex: 0 }}></div>
                            <button type="button" className="btn-close position-absolute top-0 end-0 m-3 bg-white rounded-circle p-2 shadow-sm" style={{ zIndex: 2 }} onClick={() => setShowProfileModal(false)}></button>
                        </div>
                        <div className="modal-body text-center px-4 pb-4 pt-0" style={{ zIndex: 1, position: 'relative' }}>
                            <div className="mb-3 position-relative d-inline-block">
                                <img src={`https://ui-avatars.com/api/?name=${avatarName}&background=fff&color=5c67f2&bold=true&size=120`} alt="Profile" className="rounded-circle shadow-sm" style={{ border: '4px solid #0f172a', marginTop: '40px' }} />
                                <span className="position-absolute bottom-0 end-0 p-2 bg-success border border-light rounded-circle" style={{ width: '20px', height: '20px' }}>
                                    <span className="visually-hidden">Active</span>
                                </span>
                            </div>
                            <h4 className="fw-bold mb-1">{displayName}</h4>
                            <p className="text-muted mb-4">{profileMode === 'edit' ? 'Edit Your Details' : displayRole}</p>
                            
                            {profileMode === 'view' ? (
                                <div className="row g-3 text-start mb-4">
                                    <div className="col-12 col-md-6">
                                        <div className="bg-light rounded-4 p-3 shadow-sm border border-white h-100">
                                            <div className="d-flex align-items-center mb-3">
                                                <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-primary d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-person-badge"></i></div>
                                                <div>
                                                    <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Employee ID</small>
                                                    <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>{displayEmpCode}</span>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center mb-3">
                                                <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-primary d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-envelope-fill"></i></div>
                                                <div>
                                                    <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Email</small>
                                                    <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>{displayEmail}</span>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-primary d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-telephone-fill"></i></div>
                                                <div>
                                                    <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Phone</small>
                                                    <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>{displayPhone}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="bg-light rounded-4 p-3 shadow-sm border border-white h-100">
                                            <div className="d-flex align-items-center mb-3">
                                                <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-info d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-award"></i></div>
                                                <div>
                                                    <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Designation</small>
                                                    <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>{displayDesignation}</span>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center mb-3">
                                                <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-warning d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-building"></i></div>
                                                <div>
                                                    <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Department</small>
                                                    <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>{userProfile?.department || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-secondary d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="bi bi-clock-history"></i></div>
                                                <div>
                                                    <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Last Login</small>
                                                    <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>{displayLastLogin}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            ) : (
                                <div className="text-start mb-4">
                                    <div className="row g-3">
                                        <div className="col-md-12">
                                            <label className="form-label small fw-bold text-muted">Name</label>
                                            <input type="text" className="form-control rounded-3" value={profileForm.name || ''} onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Email</label>
                                            <input type="email" className="form-control rounded-3" value={profileForm.email || ''} onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Phone Number</label>
                                            <input type="text" className="form-control rounded-3" value={profileForm.phone || ''} onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Designation</label>
                                            <input type="text" className="form-control rounded-3" value={profileForm.designation || ''} onChange={(e) => setProfileForm(prev => ({ ...prev, designation: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Department</label>
                                            <input type="text" className="form-control rounded-3" value={profileForm.department || ''} onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer border-top-0 pt-0 pb-4 justify-content-center bg-white">
                            {profileMode === 'view' ? (
                                <>
                                    <button type="button" className="btn btn-light px-4 rounded-pill fw-bold border" onClick={() => setShowProfileModal(false)}>Close</button>
                                    <button type="button" className="btn btn-primary px-4 rounded-pill fw-bold border-0 shadow-sm" style={{ background: '#5c67f2' }} onClick={() => setProfileMode('edit')}>Edit Profile</button>
                                </>
                            ) : (
                                <>
                                    <button type="button" className="btn btn-light px-4 rounded-pill fw-bold border" onClick={() => setProfileMode('view')}>Cancel</button>
                                    <button type="button" className="btn btn-success px-4 rounded-pill fw-bold border-0 shadow-sm" onClick={handleProfileSave}>Save Changes</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.2rem' }}>
                        <div className="modal-header border-bottom-0 pb-0">
                            <h5 className="modal-title fw-bold"><i className="bi bi-key text-warning me-2"></i> Reset Password</h5>
                            <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
                        </div>
                        <div className="modal-body px-4 pt-3 pb-4">
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">Current Password</label>
                                <input type="password" className="form-control rounded-3 bg-light border-0" placeholder="Enter current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">New Password</label>
                                <input type="password" className="form-control rounded-3 bg-light border-0" placeholder="Enter new password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} />
                            </div>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted">Confirm New Password</label>
                                <input type="password" className="form-control rounded-3 bg-light border-0" placeholder="Re-enter new password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))} />
                            </div>
                            <button type="button" className="btn w-100 rounded-pill fw-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #5c67f2, #4a54e1)' }} onClick={handlePasswordSave}>Update Password</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Help & Support Modal */}
      {showHelpModal && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.2rem' }}>
                        <div className="modal-header border-bottom-0 pb-0">
                            <h5 className="modal-title fw-bold"><i className="bi bi-question-circle text-info me-2"></i> Help & Support</h5>
                            <button type="button" className="btn-close" onClick={() => setShowHelpModal(false)}></button>
                        </div>
                        <div className="modal-body px-4 pt-3 pb-4 text-center">
                            <img src="https://illustrations.popsy.co/amber/customer-service.svg" alt="Support" className="img-fluid mb-3" style={{ maxHeight: '140px' }} />
                            <h5 className="fw-bold">Need assistance?</h5>
                            <p className="text-muted small mb-4">Our support team is here to help you with any issues or questions about the Capernaum SaaS application.</p>
                            <div className="d-flex flex-column gap-2">
                                <a href="mailto:support@technokraft.com" className="btn btn-light rounded-pill fw-bold text-start border d-flex align-items-center">
                                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '32px', height: '32px' }}><i className="bi bi-envelope text-primary"></i></div>
                                    Email Support
                                </a>
                                <a href="#" className="btn btn-light rounded-pill fw-bold text-start border d-flex align-items-center">
                                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '32px', height: '32px' }}><i className="bi bi-book text-success"></i></div>
                                    Documentation
                                </a>
                            </div>
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
