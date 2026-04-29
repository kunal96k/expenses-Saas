import React, { useState } from 'react';
import Swal from 'sweetalert2';

const Sidebar = ({ activePage, onPageChange, isCollapsed, isShown, setIsSidebarShown, userRole, onLogout }) => {
  const viewerAllowedSubmodules = new Set([
    'all-transactions',
    'all-accounts',
    'account-statement',
    'bank-statement',
    'company-report',
    'combined-report',
    'date-wise-report',
    'preferences'
  ]);

  const [expandedMenus, setExpandedMenus] = useState({
    transactions: true,
    accounts: false,
    reports: false,
    users: false,
    masters: false,
    settings: false
  });

  const menuStructure = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: 'bi-speedometer2',
      submodules: []
    },
    { 
      id: 'transactions', 
      label: 'Transactions', 
      icon: 'bi-arrow-left-right',
      submodules: [
        { id: 'all-transactions', label: 'All Transactions', icon: 'bi-list-ul' },
        { id: 'add-income', label: 'Add Income', icon: 'bi-plus-circle' },
        { id: 'add-expense', label: 'Add Expense', icon: 'bi-dash-circle' },
        { id: 'transfer-money', label: 'Transfer Money', icon: 'bi-arrow-repeat' }
      ]
    },
    { 
      id: 'accounts', 
      label: 'Accounts', 
      icon: 'bi-bank',
      submodules: [
        { id: 'all-accounts', label: 'Accounts', icon: 'bi-credit-card' },
        { id: 'add-account', label: 'Add Account', icon: 'bi-plus-lg' }
      ]
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: 'bi-file-earmark-bar-graph',
      submodules: [
        { id: 'bank-statement', label: 'Bank Statement', icon: 'bi-receipt' },
        { id: 'company-report', label: 'Company Report', icon: 'bi-building' },
        { id: 'combined-report', label: 'Combined Report', icon: 'bi-collection' },
        { id: 'date-wise-report', label: 'Date-wise Report', icon: 'bi-calendar3' }
      ]
    },
    { 
      id: 'masters', 
      label: 'Masters', 
      icon: 'bi-database',
      submodules: [
        { id: 'employee-master', label: 'Employee Master', icon: 'bi-person-badge' },
        { id: 'company-master', label: 'Company Master', icon: 'bi-building-gear' },
        { id: 'bank-master', label: 'Bank Master', icon: 'bi-bank2' },
        { id: 'payment-mode-master', label: 'Payment Mode Master', icon: 'bi-wallet2' },
        { id: 'category-master', label: 'Purpose / Category Master', icon: 'bi-tags' }
      ]
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: 'bi-gear',
      submodules: [
        { id: 'general-settings', label: 'General Settings', icon: 'bi-sliders' },
        { id: 'preferences', label: 'Preferences', icon: 'bi-palette' }
      ]
    }
  ];

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout?',
      text: "Are you sure you want to end your session?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#5c67f2',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, logout'
    }).then((result) => {
      if (result.isConfirmed) {
        onLogout?.();
        Swal.fire('Logged out!', 'You have been logged out successfully', 'success');
      }
    });
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isShown ? 'show' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">
            <img src="/assets/tts-logo-ev.png" alt="TechnoKraft Logo" />
          </div>
          <div className="brand-content">
            <span className="brand-text">TechnoKraft</span>
            <p className="brand-subtitle">Training and Solutions</p>
          </div>
        </div>
      </div>

      <ul className="sidebar-menu">
        <li className="menu-header">Main Menu</li>
        {menuStructure
          .filter(item => {
            if (userRole === 'Viewer') {
              return !['users', 'masters'].includes(item.id);
            }
            return true;
          })
          .map(item => ({
            ...item,
            submodules: userRole === 'Viewer'
              ? item.submodules.filter(sub => viewerAllowedSubmodules.has(sub.id))
              : item.submodules
          }))
          .map((item) => (
          <li key={item.id}>
            <a 
              href="#" 
              className={`menu-link ${activePage.startsWith(item.id) ? 'active' : ''} ${expandedMenus[item.id] ? 'expanded' : ''}`} 
              onClick={(e) => {
                e.preventDefault();
                if (item.submodules.length > 0) {
                  toggleMenu(item.id);
                } else {
                  onPageChange(item.id);
                }
              }}
              data-tooltip={item.label}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
              {item.submodules.length > 0 && !isCollapsed && (
                <i className="bi bi-chevron-down dropdown-icon"></i>
              )}
            </a>
            
            {item.submodules.length > 0 && !isCollapsed && (
              <ul className={`submenu ${expandedMenus[item.id] ? 'show' : ''}`}>
                {item.submodules.map((sub) => (
                  <li key={sub.id}>
                    <a 
                      href="#" 
                      className={`submenu-link ${activePage === sub.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(sub.id);
                      }}
                    >
                      <i className={`bi ${sub.icon}`}></i>
                      <span>{sub.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="user-mini-profile">
          <img src="https://ui-avatars.com/api/?name=kunal+patil&background=5c67f2&color=fff" alt="User" />
          <div className="user-info">
            <h6>kunal patil</h6>
            <small>Super Admin</small>
          </div>
        </div>
        <button 
          className="btn-logout"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
