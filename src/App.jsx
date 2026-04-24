import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import DashboardView from './views/DashboardView';
import EmptyView from './views/EmptyView';
import TransactionsPage from './pages/TransactionsPage';
import AccountsPage from './pages/AccountsPage.jsx';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import MastersPage from './pages/MastersPage';
import SettingsPage from './pages/SettingsPage';
import AddInternModal from './modals/AddInternModal';
import ProfileModal from './modals/ProfileModal';
import SettingsModal from './modals/SettingsModal';
import NotificationsModal from './modals/NotificationsModal';
import Swal from 'sweetalert2';

function App() {
  const [userRole, setUserRole] = useState('Super Admin'); // Simulating 'Super Admin' or 'Viewer'
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarShown, setIsSidebarShown] = useState(false);
  const [mastersData, setMastersData] = useState({
    company: [
      { id: 1, code: 'ACME', name: 'Acme Corp', type: 'Pvt Ltd', gst: '27AAAAA0000A1Z5', pan: 'ABCDE1234F', phone: '9876543210', email: 'contact@acme.com', address: 'Mumbai, India', currency: 'INR (₹)', status: 'Active' },
      { id: 2, code: 'GLOB', name: 'Global Tech', type: 'LLP', gst: '29BBBBB1111B1Z2', pan: 'FGHIJ5678K', phone: '9000080000', email: 'hr@globaltech.com', address: 'Bangalore, India', currency: 'INR (₹)', status: 'Active' },
    ],
    bank: [
      { id: 1, name: 'HDFC Bank', ifsc: 'HDFC0001234', branch: 'Mumbai Main', status: 'Active' },
      { id: 2, name: 'ICICI Bank', ifsc: 'ICIC0005678', branch: 'Delhi NCR', status: 'Active' },
      { id: 3, name: 'SBI Bank', ifsc: 'SBIN0009876', branch: 'Pune Central', status: 'Inactive' },
    ],
    paymentMode: [
      { id: 1, name: 'Cash', description: 'Hard cash payments', status: 'Active' },
      { id: 2, name: 'Online', description: 'NEFT, RTGS, IMPS', status: 'Active' },
      { id: 3, name: 'Cheque', description: 'Bank cheque payments', status: 'Active' },
    ],
    category: [
      { id: 1, name: 'Salary', type: 'Expense', status: 'Active' },
      { id: 2, name: 'Rent', type: 'Expense', status: 'Active' },
      { id: 3, name: 'Consulting Fee', type: 'Income', status: 'Active' },
      { id: 4, name: 'Office Supplies', type: 'Expense', status: 'Active' },
    ]
  });

  const [accounts, setAccounts] = useState([
    { id: 1, companyId: 1, companyName: 'Acme Corp', code: 'AC-MAIN', name: 'HDFC Main', type: 'Bank', bankId: 1, bankName: 'HDFC Bank', accountNumber: '', balance: 1500000, status: 'Active', lastActivity: '2024-04-24', ifsc: 'HDFC0001234', branch: 'Mumbai Main', hasTransactions: true, openingBalance: 1472500, openingDate: '2024-04-01' },
    { id: 2, companyId: 1, companyName: 'Acme Corp', code: 'AC-CASH', name: 'Petty Cash', type: 'Cash', bankId: null, bankName: '-', accountNumber: '', balance: 25000, status: 'Active', lastActivity: '2024-04-22', ifsc: '', branch: '', hasTransactions: true, openingBalance: 20000, openingDate: '2024-04-01' },
    { id: 3, companyId: 2, companyName: 'Global Tech', code: 'GT-OPS', name: 'ICICI Operations', type: 'Bank', bankId: 2, bankName: 'ICICI Bank', accountNumber: '', balance: 5000000, status: 'Active', lastActivity: '2024-04-20', ifsc: 'ICIC0005678', branch: 'Delhi NCR', hasTransactions: true, openingBalance: 4800000, openingDate: '2024-04-01' },
    { id: 4, companyId: 2, companyName: 'Global Tech', code: 'GT-CASH', name: 'Main Cash', type: 'Cash', bankId: null, bankName: '-', accountNumber: '', balance: 12000, status: 'Active', lastActivity: '2024-04-18', ifsc: '', branch: '', hasTransactions: false, openingBalance: 12000, openingDate: '2024-04-10' },
    { id: 5, companyId: 1, companyName: 'Acme Corp', code: 'AC-SBI', name: 'SBI Current', type: 'Bank', bankId: 3, bankName: 'SBI Bank', accountNumber: '', balance: -5000, status: 'Inactive', lastActivity: '2024-03-15', ifsc: 'SBIN0009876', branch: 'Pune Central', hasTransactions: true, openingBalance: 10000, openingDate: '2024-03-01' }
  ]);

  const defaultSystemSettings = {
    general: {
      companyDefaults: {
        currency: 'INR (₹)',
        dateFormat: 'DD-MM-YYYY',
        timeZone: 'Asia/Kolkata'
      },
      financial: {
        allowNegativeBalance: false,
        enableCashAccounts: true,
        openingBalanceBehavior: 'Manual'
      },
      transactions: {
        autoSetCurrentDate: true,
        allowBackdatedEntries: false,
        requireReferenceNumber: false
      },
      security: {
        sessionTimeoutMins: 30,
        passwordMinLength: 8,
        strongPasswordPolicy: true
      },
      system: {
        enableAuditLogs: true,
        enableNotifications: true
      }
    },
    preferences: {
      ui: {
        theme: 'Light',
        compactView: false,
        tableDensity: 'Comfortable'
      },
      dashboard: {
        defaultView: 'Company-wise',
        showCharts: true
      },
      reports: {
        defaultExportFormat: 'PDF',
        includeReference: true,
        includePaymentMode: true
      }
    }
  };

  const [systemSettings, setSystemSettings] = useState(defaultSystemSettings);
  const [interns, setInterns] = useState([
    { id: 1, name: "Priya patil", dept: "Development", date: "Oct 24, 2024", status: "active" },
    { id: 2, name: "kunal patil", dept: "Design", date: "Oct 22, 2024", status: "active" },
    { id: 3, name: "Amit Patel", dept: "Marketing", date: "Oct 20, 2024", status: "pending" },
    { id: 4, name: "Sneha Reddy", dept: "Finance", date: "Oct 18, 2024", status: "inactive" },
    { id: 5, name: "Vikram Singh", dept: "Development", date: "Oct 15, 2024", status: "active" }
  ]);

  const toggleSidebar = () => {
    if (window.innerWidth >= 992) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      setIsSidebarShown(!isSidebarShown);
    }
  };

  const handlePageChange = (pageId) => {
    setActivePage(pageId);
    if (window.innerWidth < 992) {
      setIsSidebarShown(false);
    }
  };

  const addIntern = (newIntern) => {
    setInterns([{
      ...newIntern,
      id: interns.length + 1,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }, ...interns]);

    Swal.fire({
      icon: 'success',
      title: 'Saved!',
      text: 'New intern added successfully.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const deleteIntern = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Delete'
    }).then((result) => {
      if (result.isConfirmed) {
        setInterns(interns.filter(i => i.id !== id));
        Swal.fire('Deleted!', 'User has been removed.', 'success');
      }
    });
  };

  const editIntern = (id) => {
    const modal = new bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  };

  return (
    <div className="app-container d-flex">
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        isCollapsed={isSidebarCollapsed}
        isShown={isSidebarShown}
        setIsSidebarShown={setIsSidebarShown}
        userRole={userRole}
      />

      {/* Sidebar overlay for mobile - Always rendered for smooth CSS transition */}
      <div
        className={`sidebar-overlay ${isSidebarShown ? 'show' : ''}`}
        onClick={() => setIsSidebarShown(false)}
      ></div>

      <div className={`main-wrapper d-flex flex-column flex-grow-1 ${isSidebarCollapsed ? 'expanded' : ''}`} id="mainWrapper">
        <Header
          activePage={activePage}
          toggleSidebar={toggleSidebar}
        />

        <main className="content-area flex-grow-1">
          {activePage === 'dashboard' ? (
            <DashboardView
              interns={interns}
              onDelete={deleteIntern}
              onEdit={editIntern}
            />
          ) : ['all-transactions', 'add-income', 'add-expense', 'transfer-money'].includes(activePage) ? (
            <TransactionsPage activePage={activePage} userRole={userRole} />
          ) : ['all-accounts', 'add-account', 'account-statement'].includes(activePage) ? (
            <AccountsPage
              activePage={activePage}
              setActivePage={setActivePage}
              userRole={userRole}
              mastersData={mastersData}
              accounts={accounts}
              setAccounts={setAccounts}
            />
          ) : ['bank-statement', 'company-report', 'combined-report', 'date-wise-report'].includes(activePage) ? (
            <ReportsPage activePage={activePage} userRole={userRole} />
          ) : activePage === 'employee-master' ? (
            <UsersPage activePage={activePage} userRole={userRole} />
          ) : ['general-settings', 'preferences'].includes(activePage) ? (
            userRole === 'Super Admin' ? (
              <SettingsPage
                activePage={activePage}
                userRole={userRole}
                systemSettings={systemSettings}
                setSystemSettings={setSystemSettings}
                defaultSystemSettings={defaultSystemSettings}
              />
            ) : (
              <DashboardView interns={interns} />
            )
          ) : activePage.endsWith('-master') ? (
            userRole === 'Super Admin' ? (
              <MastersPage
                activePage={activePage}
                userRole={userRole}
                mastersData={mastersData}
                setMastersData={setMastersData}
                accounts={accounts}
              />
            ) : (
              <DashboardView interns={interns} />
            )
          ) : (
            <EmptyView pageId={activePage} />
          )}
        </main>

        <Footer />
      </div>

      <AddInternModal onSave={addIntern} />
      <ProfileModal />
      <SettingsModal />
      <NotificationsModal />
    </div>
  );
}

export default App;
