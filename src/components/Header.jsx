import React, { useState } from 'react';
import { Modal } from 'bootstrap';
import Swal from 'sweetalert2';

const Header = ({ activePage, toggleSidebar }) => {
  const [isDropdownShow, setIsDropdownShow] = useState(false);

  const pageTitles = {
    'dashboard': 'Dashboard Overview',
    'all-transactions': 'All Transactions',
    'add-income': 'Add Income (Receive Money)',
    'add-expense': 'Add Expense (Pay Money)',
    'transfer-money': 'Transfer Money',
    'all-accounts': 'All Accounts (Bank + Cash)',
    'add-account': 'Add Account',
    'account-statement': 'Account Statement',
    'bank-statement': 'Bank Statement',
    'company-report': 'Company Report',
    'combined-report': 'Combined Report',
    'date-wise-report': 'Date-wise Report',
    'all-users': 'All Users',
    'add-user': 'Add User',
    'role-management': 'Role Management',
    'company-master': 'Company Master',
    'bank-master': 'Bank Master',
    'account-master': 'Account Master',
    'payment-mode-master': 'Payment Mode Master',
    'category-master': 'Purpose / Category Master',
    'general-settings': 'General Settings',
    'preferences': 'Preferences'
  };

  const handleAction = (action) => {
    setIsDropdownShow(false);
    const modalId = action === 'profile' ? 'profileModal' : 
                    action === 'settings' ? 'settingsModal' : 
                    action === 'notifications' ? 'notificationsModal' : null;
    
    if (modalId) {
      const modal = new Modal(document.getElementById(modalId));
      modal.show();
    } else if (action === 'logout') {
      Swal.fire({
        title: 'Logout?',
        text: "Are you sure you want to end your session?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Yes, logout'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            icon: 'success',
            title: 'Logged out!',
            text: 'You have been logged out successfully',
            confirmButtonColor: '#4f46e5'
          });
        }
      });
    }
  };

  return (
    <nav className="top-navbar">
      <div className="nav-left">
        <button className="toggle-btn" id="sidebarToggle" onClick={toggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
        <h4 className="page-title">{pageTitles[activePage] || 'Dashboard Overview'}</h4>
      </div>
      
      <div className="nav-right">
        <div className="search-container d-none d-md-block">
          <i className="bi bi-search"></i>
          <input type="text" placeholder="Search data..." />
        </div>
        
        <div className="user-profile-dropdown">
          <button 
            className="user-profile-btn" 
            onClick={() => setIsDropdownShow(!isDropdownShow)}
          >
            <img src="https://ui-avatars.com/api/?name=kunal+patil&background=4f46e5&color=fff" alt="User" className="user-avatar" />
            <div className="user-details">
              <div className="user-name">kunal patil</div>
              <div className="user-role">Super Admin</div>
            </div>
            <i className="bi bi-chevron-down dropdown-arrow"></i>
          </button>
          
          <div className={`user-dropdown-menu ${isDropdownShow ? 'show' : ''}`}>
            <div className="dropdown-header">
              <h6>kunal patil</h6>
              <p>kunal.patil@technokraft.com</p>
            </div>
            <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleAction('profile'); }}>
              <i className="bi bi-person"></i>
              <span>My Profile</span>
            </a>
            <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleAction('settings'); }}>
              <i className="bi bi-gear"></i>
              <span>Account Settings</span>
            </a>
            <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleAction('reset-password'); }}>
              <i className="bi bi-key"></i>
              <span>Reset Password</span>
            </a>
            <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleAction('notifications'); }}>
              <i className="bi bi-bell"></i>
              <span>Notifications</span>
            </a>
            <div className="dropdown-divider"></div>
            <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleAction('help'); }}>
              <i className="bi bi-question-circle"></i>
              <span>Help & Support</span>
            </a>
            <div className="dropdown-divider"></div>
            <a href="#" className="dropdown-item danger" onClick={(e) => { e.preventDefault(); handleAction('logout'); }}>
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
