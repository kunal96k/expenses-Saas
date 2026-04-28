import React, { useState, useEffect } from 'react';
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
import { apiService } from './services/api';

function App() {
  const [userRole, setUserRole] = useState('Super Admin'); // Simulating 'Super Admin' or 'Viewer'
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarShown, setIsSidebarShown] = useState(false);
  const [mastersData, setMastersData] = useState({
    company: [],
    bank: [],
    paymentMode: [],
    category: [],
    employee: []
  });

  const [accounts, setAccounts] = useState([]);

  const fetchAllMasters = async () => {
    try {
      const [companies, banks, categories, modes] = await Promise.all([
        apiService.get('/companies/all').catch(() => []),
        apiService.get('/banks/all').catch(() => []),
        apiService.get('/categories/all').catch(() => []),
        apiService.get('/payment-modes/all').catch(() => [])
      ]);
      setMastersData({
        company: companies,
        bank: banks,
        category: categories,
        paymentMode: modes,
        employee: [] // Employees usually fetched on demand in MastersPage
      });
    } catch (err) {
      console.error("Error fetching masters:", err);
    }
  };

  useEffect(() => {
    fetchAllMasters();
  }, []);

  const defaultSystemSettings = {
    general: {
      companyDefaults: {
        currency: 'INR (₹)',
        dateFormat: 'DD-MM-YYYY',
        timeZone: 'Asia/Kolkata'
      },

      security: {
        sessionTimeoutMins: 30,
        passwordMinLength: 8,
        strongPasswordPolicy: true
      },
      system: {
        enableNotifications: true
      }
    },
    preferences: {
      ui: {
        theme: 'Light',
        compactView: false
      },
      dashboard: {
        showCharts: true
      },
      reports: {
        defaultExportFormat: 'PDF',
        autoEmailReports: true,
        scheduleFrequency: 'Monthly',
        scheduledDay: '1',
        scheduledTime: '10:00'
      }
    }
  };

  const [systemSettings, setSystemSettings] = useState(defaultSystemSettings);
  const [interns, setInterns] = useState([]);


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
          onPageChange={handlePageChange} 
        />

        <main className="content-area flex-grow-1">
          {activePage === 'dashboard' ? (
            <DashboardView 
              interns={interns} 
              onDelete={deleteIntern} 
              onEdit={editIntern} 
              setActivePage={setActivePage}
            />
          ) : ['all-transactions', 'add-income', 'add-expense', 'transfer-money'].includes(activePage) ? (
            <TransactionsPage activePage={activePage} userRole={userRole} mastersData={mastersData} accounts={accounts} refreshGlobalMasters={fetchAllMasters} />
          ) : ['all-accounts', 'add-account', 'account-statement'].includes(activePage) ? (
            <AccountsPage 
              activePage={activePage} 
              setActivePage={setActivePage} 
              userRole={userRole} 
              mastersData={mastersData}
              accounts={accounts}
              setAccounts={setAccounts}
              refreshGlobalMasters={fetchAllMasters}
            />
          ) : ['bank-statement', 'company-report', 'combined-report', 'date-wise-report'].includes(activePage) ? (
            <ReportsPage activePage={activePage} userRole={userRole} />
          ) : activePage === 'employee-master' ? (
            <MastersPage 
              activePage={activePage} 
              userRole={userRole} 
              mastersData={mastersData}
              setMastersData={setMastersData}
              accounts={accounts}
              refreshGlobalMasters={fetchAllMasters}
            />
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
              <DashboardView interns={interns} setActivePage={setActivePage} />
            )
          ) : activePage.endsWith('-master') ? (
            userRole === 'Super Admin' ? (
              <MastersPage 
                activePage={activePage} 
                userRole={userRole} 
                mastersData={mastersData}
                setMastersData={setMastersData}
                accounts={accounts}
                refreshGlobalMasters={fetchAllMasters}
              />
            ) : (
              <DashboardView interns={interns} setActivePage={setActivePage} />
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
