import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import DashboardView from './views/DashboardView';
import EmptyView from './views/EmptyView';
import LoginView from './views/LoginView';
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
  const SETTINGS_STORAGE_KEY = 'expenses_system_settings';
  const mapRoleLabel = (rawRole) => {
    const role = String(rawRole || 'VIEWER').toUpperCase();
    if (role === 'SUPERADMIN') return 'Super Admin';
    if (role === 'SUPERIOR_SUPERADMIN' || role === 'SUPERIOR SUPERADMIN') return 'Superior Super Admin';
    return 'Viewer';
  };
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Boolean(localStorage.getItem('expenses_basic_auth'));
    } catch {
      return false;
    }
  });
  const [userRole, setUserRole] = useState('Viewer');
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
  const [userProfile, setUserProfile] = useState(null);

  const fetchAllMasters = async () => {
    try {
      const [companies, banks, categories, modes] = await Promise.all([
        apiService.getAllPages('/companies').catch(() => []),
        apiService.getAllPages('/banks').catch(() => []),
        apiService.getAllPages('/categories').catch(() => []),
        apiService.getAllPages('/payment-modes').catch(() => [])
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
    if (!isAuthenticated) return;
    fetchAllMasters();
  }, [isAuthenticated]);

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

  const [systemSettings, setSystemSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultSystemSettings;
    } catch {
      return defaultSystemSettings;
    }
  });
  const [interns, setInterns] = useState([]);

  const persistSettings = async (nextSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      if (nextSettings.preferences) {
        await apiService.patch('/auth/me/preferences', nextSettings.preferences);
      }
    } catch (err) {
      console.error("Failed to save preferences to backend", err);
    }
  };

  const toggleSidebar = () => {
    if (window.innerWidth >= 992) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      setIsSidebarShown(!isSidebarShown);
    }
  };

  const handlePageChange = (pageId) => {
    const viewerRestrictedPages = new Set([
      'add-income',
      'add-expense',
      'transfer-money',
      'add-account',
      'employee-master',
      'general-settings',
      'company-master',
      'bank-master',
      'payment-mode-master',
      'category-master'
    ]);
    if (userRole === 'Viewer' && viewerRestrictedPages.has(pageId)) {
      Swal.fire('Not allowed', 'Viewer has view-only access.', 'warning');
      return;
    }
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

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const token = localStorage.getItem('expenses_basic_auth');
        if (!token) return;
        const me = await apiService.get('/auth/me');
        setUserRole(mapRoleLabel(me?.role));
        setUserProfile(me || null);
        if (me?.employeeId) {
          localStorage.setItem('actingUserId', String(me.employeeId));
        }
        if (me?.preferences) {
          setSystemSettings(prev => ({
            ...prev,
            preferences: { ...prev.preferences, ...me.preferences }
          }));
        }
        setIsAuthenticated(true);
      } catch {
        apiService.clearBasicAuth();
        localStorage.removeItem('actingUserId');
        setIsAuthenticated(false);
      }
    };
    bootstrapAuth();
  }, []);

  const handleLogin = async ({ username, password }) => {
    try {
      const validation = await apiService.postPublic('/auth/public/login', { username, password });
      apiService.setBasicAuth(username, password);
      const me = await apiService.get('/auth/me');
      setUserRole(mapRoleLabel(me?.role));
      setUserProfile(me || null);
      if (me?.employeeId) {
        localStorage.setItem('actingUserId', String(me.employeeId));
      }
      if (me?.preferences) {
        setSystemSettings(prev => ({
          ...prev,
          preferences: { ...prev.preferences, ...me.preferences }
        }));
      }
      setIsAuthenticated(true);
      Swal.fire({
        icon: 'success',
        title: `Welcome ${me?.name || validation?.name || username}`,
        text: 'Login successful',
        timer: 1300,
        showConfirmButton: false
      });
    } catch (err) {
      apiService.clearBasicAuth();
      localStorage.removeItem('actingUserId');
      setIsAuthenticated(false);
      Swal.fire({
        icon: 'error',
        title: 'Login failed',
        text: err?.message || 'Invalid credentials'
      });
    }
  };

  const handleLogout = () => {
    apiService.clearBasicAuth();
    localStorage.removeItem('actingUserId');
    setIsAuthenticated(false);
    setUserProfile(null);
    setActivePage('dashboard');
  };

  useEffect(() => {
    const onSessionExpired = () => {
      handleLogout();
      Swal.fire({
        icon: 'warning',
        title: 'Session expired',
        text: 'Session expired, please re-login your account.'
      });
    };

    window.addEventListener('expenses:session-expired', onSessionExpired);
    return () => window.removeEventListener('expenses:session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    let timeoutId;
    const timeoutMins = systemSettings?.general?.security?.sessionTimeoutMins || 30;
    const timeoutMs = timeoutMins * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        import('sweetalert2').then(({ default: Swal }) => {
          Swal.fire({
            icon: 'warning',
            title: 'Session Timeout',
            text: `You have been logged out due to ${timeoutMins} minutes of inactivity.`
          });
        });
      }, timeoutMs);
    };

    if (isAuthenticated) {
      resetTimer();
      const events = ['mousemove', 'keydown', 'click', 'scroll'];
      events.forEach(event => window.addEventListener(event, resetTimer));

      return () => {
        clearTimeout(timeoutId);
        events.forEach(event => window.removeEventListener(event, resetTimer));
      };
    }
  }, [isAuthenticated, systemSettings?.general?.security?.sessionTimeoutMins]);

  useEffect(() => {
    const theme = String(systemSettings?.preferences?.ui?.theme || 'Light').toLowerCase();
    document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }, [systemSettings?.preferences?.ui?.theme]);

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="app-container d-flex">
      <Sidebar 
        activePage={activePage} 
        onPageChange={handlePageChange} 
        isCollapsed={isSidebarCollapsed}
        isShown={isSidebarShown}
        setIsSidebarShown={setIsSidebarShown}
        userRole={userRole}
        userProfile={userProfile}
        onLogout={handleLogout}
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
          onLogout={handleLogout}
          userRole={userRole}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          systemSettings={systemSettings}
        />

        <main className="content-area flex-grow-1">
          {activePage === 'dashboard' ? (
            <DashboardView 
              interns={interns} 
              onDelete={deleteIntern} 
              onEdit={editIntern} 
              setActivePage={setActivePage}
              userRole={userRole}
              systemSettings={systemSettings}
            />
          ) : ['all-transactions', 'add-income', 'add-expense', 'transfer-money'].includes(activePage) ? (
            <TransactionsPage
              activePage={activePage}
              setActivePage={setActivePage}
              userRole={userRole}
              mastersData={mastersData}
              accounts={accounts}
              refreshGlobalMasters={fetchAllMasters}
            />
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
              <DashboardView interns={interns} setActivePage={setActivePage} userRole={userRole} systemSettings={systemSettings} />
            )
          ) : ['general-settings', 'preferences'].includes(activePage) ? (
            (userRole === 'Super Admin' || activePage === 'preferences') ? (
              <SettingsPage 
                activePage={activePage} 
                userRole={userRole} 
                systemSettings={systemSettings}
                setSystemSettings={setSystemSettings}
                defaultSystemSettings={defaultSystemSettings}
                onSaveSettings={persistSettings}
                onResetSettings={persistSettings}
              />
            ) : (
              <DashboardView interns={interns} setActivePage={setActivePage} userRole={userRole} systemSettings={systemSettings} />
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
              <DashboardView interns={interns} setActivePage={setActivePage} userRole={userRole} systemSettings={systemSettings} />
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
