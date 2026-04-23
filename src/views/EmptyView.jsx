import React from 'react';

const EmptyView = ({ pageId }) => {
  const configs = {
    'all-transactions': { title: 'All Transactions', icon: 'bi-arrow-left-right', text: 'View and manage all financial transactions.' },
    'add-income': { title: 'Add Income', icon: 'bi-plus-circle', text: 'Record new incoming money/revenue.' },
    'add-expense': { title: 'Add Expense', icon: 'bi-dash-circle', text: 'Record new outgoing money/expenses.' },
    'transfer-money': { title: 'Transfer Money', icon: 'bi-arrow-repeat', text: 'Move money between bank accounts or cash.' },
    'all-accounts': { title: 'All Accounts', icon: 'bi-bank', text: 'Manage bank accounts and cash balances.' },
    'add-account': { title: 'Add Account', icon: 'bi-plus-lg', text: 'Set up a new bank or cash account.' },
    'account-statement': { title: 'Account Statement', icon: 'bi-file-text', text: 'Generate statements for specific accounts.' },
    'bank-statement': { title: 'Bank Statement', icon: 'bi-file-earmark-text', text: 'Detailed bank reconciliation and statements.' },
    'company-report': { title: 'Company Report', icon: 'bi-building', text: 'Financial performance report for individual companies.' },
    'combined-report': { title: 'Combined Report', icon: 'bi-layout-three-columns', text: 'Consolidated report across all entities.' },
    'date-wise-report': { title: 'Date-wise Report', icon: 'bi-calendar3', text: 'Filter financial data by specific date ranges.' },
    'all-users': { title: 'All Users', icon: 'bi-people', text: 'Manage system users and access.' },
    'add-user': { title: 'Add User', icon: 'bi-person-plus', text: 'Create new user profiles.' },
    'role-management': { title: 'Role Management', icon: 'bi-shield-lock', text: 'Define permissions and user roles.' },
    'company-master': { title: 'Company Master', icon: 'bi-database', text: 'Configure company details.' },
    'bank-master': { title: 'Bank Master', icon: 'bi-database-add', text: 'Manage list of associated banks.' },
    'account-master': { title: 'Account Master', icon: 'bi-database-check', text: 'Core account configuration.' },
    'payment-mode-master': { title: 'Payment Mode Master', icon: 'bi-wallet2', text: 'Manage payment methods (UPI, Cash, Bank).' },
    'category-master': { title: 'Purpose / Category Master', icon: 'bi-tags', text: 'Manage income and expense categories.' },
    'general-settings': { title: 'General Settings', icon: 'bi-gear', text: 'Core system configuration.' },
    'preferences': { title: 'Preferences', icon: 'bi-sliders', text: 'User-specific interface preferences.' },
  };

  const config = configs[pageId] || { title: 'Module Content', icon: 'bi-app-indicator', text: 'Content for this module is under development.' };

  return (
    <div className="view-section active">
      <div className="empty-state">
        <i className={`bi ${config.icon}`}></i>
        <h3>{config.title}</h3>
        <p>{config.text}</p>
      </div>
    </div>
  );
};

export default EmptyView;
