import React, { useEffect, useMemo, useState, useRef } from 'react';
import StatCard from '../components/StatCard';
import { apiService } from '../services/api';
import './DashboardView.css';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  Filler 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const DashboardView = ({ setActivePage, userRole = 'Viewer', systemSettings }) => {
  const [activeRow, setActiveRow] = useState(null);
  const [txPageSize] = useState(10);
  const [txPage, setTxPage] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analyticsTransactions, setAnalyticsTransactions] = useState([]);

  // Draft filter form (user selections before clicking Apply Filters)
  const [filterForm, setFilterForm] = useState({
    dateFrom: '',
    dateTo: '',
    companyIds: [],
    accountIds: []
  });

  // Applied filters (drives data, stat cards, charts, and tables)
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    companyIds: [],
    accountIds: []
  });

  // Dropdown UI states
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');

  const companyDropdownRef = useRef(null);
  const accountDropdownRef = useRef(null);

  const [chartView, setChartView] = useState('monthly');
  const canShowQuickActions = ['Super Admin', 'Superior Super Admin'].includes(userRole);

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const txTypeToStatus = (type) => {
    if (type === 'Received') return 'credit';
    if (type === 'Paid') return 'debit';
    return 'transfer';
  };

  const getTxnFlow = (txn) => {
    const from = txn.fromAccountName || txn.fromExternal || '-';
    const to = txn.toAccountName || txn.toExternal || '-';
    return `${from} → ${to}`;
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target)) {
        setIsCompanyOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 1. Fetch masters: all companies and all accounts from the database
  useEffect(() => {
    let isMounted = true;
    const loadMasters = async () => {
      try {
        const [companyRes, accountRes] = await Promise.all([
          apiService.get('/companies/all').catch(() => apiService.getAllPages('/companies')),
          apiService.get('/accounts/all').catch(() => apiService.getAllPages('/accounts'))
        ]);
        if (!isMounted) return;
        const compList = Array.isArray(companyRes) ? companyRes : (companyRes?.content || []);
        const accList = Array.isArray(accountRes) ? accountRes : (accountRes?.content || []);
        setCompanies(compList);
        setAccounts(accList);

        const allCompIds = compList.map(c => Number(c.id));
        const allAccIds = accList.map(a => Number(a.id));

        setFilterForm(prev => ({
          ...prev,
          companyIds: allCompIds,
          accountIds: allAccIds
        }));
        setAppliedFilters(prev => ({
          ...prev,
          companyIds: allCompIds,
          accountIds: allAccIds
        }));
      } catch {
        if (!isMounted) return;
        setCompanies([]);
        setAccounts([]);
      }
    };
    loadMasters();
    return () => { isMounted = false; };
  }, []);

  // Accounts available in the filter dropdown based on selected companies in filterForm
  const availableAccountsInForm = useMemo(() => {
    if (companies.length === 0) return accounts;
    const allCompsSelected = filterForm.companyIds.length === 0 || filterForm.companyIds.length === companies.length;
    if (allCompsSelected) return accounts;
    return accounts.filter(a => filterForm.companyIds.includes(Number(a.companyId)));
  }, [accounts, companies.length, filterForm.companyIds]);

  // Clean up selected accounts in filterForm if parent company is deselected
  useEffect(() => {
    if (companies.length === 0 || accounts.length === 0) return;
    const allCompsSelected = filterForm.companyIds.length === 0 || filterForm.companyIds.length === companies.length;
    if (allCompsSelected) return;

    const validAccountIds = new Set(availableAccountsInForm.map(a => Number(a.id)));
    setFilterForm(prev => {
      const filtered = prev.accountIds.filter(id => validAccountIds.has(Number(id)));
      if (filtered.length !== prev.accountIds.length) {
        return { ...prev, accountIds: filtered };
      }
      return prev;
    });
  }, [filterForm.companyIds, availableAccountsInForm, companies.length, accounts.length]);

  // Checkbox helpers for Company multi-select
  const allCompanyIds = useMemo(() => companies.map(c => Number(c.id)), [companies]);
  const isAllCompaniesChecked = useMemo(() => {
    if (companies.length === 0) return false;
    return allCompanyIds.every(id => filterForm.companyIds.includes(id));
  }, [companies.length, allCompanyIds, filterForm.companyIds]);

  const handleToggleSelectAllCompanies = () => {
    if (isAllCompaniesChecked) {
      // Deselect all
      setFilterForm(prev => ({
        ...prev,
        companyIds: [],
        accountIds: []
      }));
    } else {
      // Select all companies & all accounts
      setFilterForm(prev => ({
        ...prev,
        companyIds: [...allCompanyIds],
        accountIds: accounts.map(a => Number(a.id))
      }));
    }
  };

  const handleToggleCompany = (compId) => {
    const idNum = Number(compId);
    setFilterForm(prev => {
      const exists = prev.companyIds.includes(idNum);
      const nextCompanyIds = exists
        ? prev.companyIds.filter(id => id !== idNum)
        : [...prev.companyIds, idNum];

      // Auto-add or remove related accounts
      const compAccountIds = accounts
        .filter(a => Number(a.companyId) === idNum)
        .map(a => Number(a.id));

      let nextAccountIds = [...prev.accountIds];
      if (exists) {
        nextAccountIds = nextAccountIds.filter(id => !compAccountIds.includes(id));
      } else {
        compAccountIds.forEach(id => {
          if (!nextAccountIds.includes(id)) nextAccountIds.push(id);
        });
      }

      return {
        ...prev,
        companyIds: nextCompanyIds,
        accountIds: nextAccountIds
      };
    });
  };

  const handleSelectOnlyCompany = (compId, e) => {
    e.stopPropagation();
    const idNum = Number(compId);
    const relatedAccounts = accounts
      .filter(a => Number(a.companyId) === idNum)
      .map(a => Number(a.id));

    setFilterForm(prev => ({
      ...prev,
      companyIds: [idNum],
      accountIds: relatedAccounts
    }));
  };

  // Checkbox helpers for Account multi-select
  const availableAccountIds = useMemo(() => availableAccountsInForm.map(a => Number(a.id)), [availableAccountsInForm]);
  const isAllAccountsChecked = useMemo(() => {
    if (availableAccountIds.length === 0) return false;
    return availableAccountIds.every(id => filterForm.accountIds.includes(id));
  }, [availableAccountIds, filterForm.accountIds]);

  const handleToggleSelectAllAccounts = () => {
    if (isAllAccountsChecked) {
      // Deselect all available accounts
      setFilterForm(prev => ({
        ...prev,
        accountIds: prev.accountIds.filter(id => !availableAccountIds.includes(id))
      }));
    } else {
      // Select all available accounts
      setFilterForm(prev => {
        const next = new Set([...prev.accountIds, ...availableAccountIds]);
        return { ...prev, accountIds: Array.from(next) };
      });
    }
  };

  const handleToggleAccount = (accId) => {
    const idNum = Number(accId);
    setFilterForm(prev => {
      const exists = prev.accountIds.includes(idNum);
      const nextAccountIds = exists
        ? prev.accountIds.filter(id => id !== idNum)
        : [...prev.accountIds, idNum];
      return { ...prev, accountIds: nextAccountIds };
    });
  };

  const handleSelectOnlyAccount = (accId, e) => {
    e.stopPropagation();
    setFilterForm(prev => ({
      ...prev,
      accountIds: [Number(accId)]
    }));
  };

  // Dynamic filter trigger button summaries
  const companyButtonSummary = useMemo(() => {
    if (companies.length === 0) return 'Loading companies...';
    if (isAllCompaniesChecked || filterForm.companyIds.length === 0) return 'All Companies';
    if (filterForm.companyIds.length === 1) {
      const found = companies.find(c => Number(c.id) === filterForm.companyIds[0]);
      return found ? found.name : '1 Company Selected';
    }
    return `${filterForm.companyIds.length} Companies Selected`;
  }, [companies, isAllCompaniesChecked, filterForm.companyIds]);

  const accountButtonSummary = useMemo(() => {
    if (availableAccountIds.length === 0) return 'No Accounts Available';
    if (isAllAccountsChecked || filterForm.accountIds.length === 0) return 'All Accounts';
    if (filterForm.accountIds.length === 1) {
      const found = accounts.find(a => Number(a.id) === filterForm.accountIds[0]);
      return found ? found.name : '1 Account Selected';
    }
    return `${filterForm.accountIds.length} Accounts Selected`;
  }, [availableAccountIds.length, isAllAccountsChecked, filterForm.accountIds, accounts]);

  // Apply & Reset Filters Handlers
  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterForm });
    setTxPage(1);
    setIsCompanyOpen(false);
    setIsAccountOpen(false);
  };

  const handleResetFilters = () => {
    const allCompIds = companies.map(c => Number(c.id));
    const allAccIds = accounts.map(a => Number(a.id));
    const resetState = {
      dateFrom: '',
      dateTo: '',
      companyIds: allCompIds,
      accountIds: allAccIds
    };
    setFilterForm(resetState);
    setAppliedFilters(resetState);
    setTxPage(1);
    setIsCompanyOpen(false);
    setIsAccountOpen(false);
    setCompanySearch('');
    setAccountSearch('');
  };

  // Filtered Accounts matching appliedFilters (used for Stat Cards & Table)
  const filteredAccounts = useMemo(() => {
    if (accounts.length === 0) return [];
    const allCompsSelected = appliedFilters.companyIds.length === 0 || appliedFilters.companyIds.length === companies.length;
    const allAccsSelected = appliedFilters.accountIds.length === 0 || appliedFilters.accountIds.length === accounts.length;

    return accounts.filter(a => {
      const matchesComp = allCompsSelected || appliedFilters.companyIds.includes(Number(a.companyId));
      const matchesAcc = allAccsSelected || appliedFilters.accountIds.includes(Number(a.id));
      return matchesComp && matchesAcc;
    });
  }, [accounts, companies.length, appliedFilters.companyIds, appliedFilters.accountIds]);

  // Load Transactions matching applied filters
  useEffect(() => {
    if (companies.length === 0 && accounts.length === 0) return;

    const params = new URLSearchParams();
    if (appliedFilters.dateFrom) params.set('dateFrom', appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set('dateTo', appliedFilters.dateTo);

    const allCompsSelected = appliedFilters.companyIds.length === 0 || appliedFilters.companyIds.length === companies.length;
    const allAccsSelected = appliedFilters.accountIds.length === 0 || appliedFilters.accountIds.length === accounts.length;

    if (!allAccsSelected) {
      if (appliedFilters.accountIds.length > 0) {
        appliedFilters.accountIds.forEach(id => params.append('accountIds', String(id)));
      } else {
        params.append('accountIds', '-999999');
      }
    } else if (!allCompsSelected) {
      if (appliedFilters.companyIds.length === 1) {
        params.set('companyId', String(appliedFilters.companyIds[0]));
      } else if (appliedFilters.companyIds.length > 1) {
        const compAccountIds = accounts
          .filter(a => appliedFilters.companyIds.includes(Number(a.companyId)))
          .map(a => a.id);
        if (compAccountIds.length > 0) {
          compAccountIds.forEach(id => params.append('accountIds', String(id)));
        } else {
          params.append('accountIds', '-999999');
        }
      } else {
        params.append('accountIds', '-999999');
      }
    }

    params.set('page', String(Math.max(txPage - 1, 0)));
    params.set('size', String(txPageSize));
    params.set('sortBy', 'date');
    params.set('direction', 'desc');

    const analyticsParams = new URLSearchParams();
    if (appliedFilters.dateFrom) analyticsParams.set('dateFrom', appliedFilters.dateFrom);
    if (appliedFilters.dateTo) analyticsParams.set('dateTo', appliedFilters.dateTo);

    if (!allAccsSelected) {
      if (appliedFilters.accountIds.length > 0) {
        appliedFilters.accountIds.forEach(id => analyticsParams.append('accountIds', String(id)));
      } else {
        analyticsParams.append('accountIds', '-999999');
      }
    } else if (!allCompsSelected) {
      if (appliedFilters.companyIds.length === 1) {
        analyticsParams.set('companyId', String(appliedFilters.companyIds[0]));
      } else if (appliedFilters.companyIds.length > 1) {
        const compAccountIds = accounts
          .filter(a => appliedFilters.companyIds.includes(Number(a.companyId)))
          .map(a => a.id);
        if (compAccountIds.length > 0) {
          compAccountIds.forEach(id => analyticsParams.append('accountIds', String(id)));
        } else {
          analyticsParams.append('accountIds', '-999999');
        }
      } else {
        analyticsParams.append('accountIds', '-999999');
      }
    }

    analyticsParams.set('page', '0');
    analyticsParams.set('size', '1000');
    analyticsParams.set('sortBy', 'date');
    analyticsParams.set('direction', 'desc');

    const loadTransactions = async () => {
      try {
        const [paged, analytics] = await Promise.all([
          apiService.get(`/transactions?${params.toString()}`),
          apiService.get(`/transactions?${analyticsParams.toString()}`)
        ]);
        setTransactions(paged?.content || []);
        setAnalyticsTransactions(analytics?.content || []);
      } catch {
        setTransactions([]);
        setAnalyticsTransactions([]);
      }
    };
    loadTransactions();
  }, [appliedFilters, txPage, txPageSize, accounts, companies]);

  // Stat Cards KPI dynamically calculated based on applied filters
  const kpi = useMemo(() => {
    const totalBalance = filteredAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const totals = analyticsTransactions.reduce((acc, txn) => {
      const amt = Number(txn.amount || 0);
      if (txn.type === 'Received') acc.credit += amt;
      else if (txn.type === 'Paid') acc.debit += amt;
      return acc;
    }, { credit: 0, debit: 0 });
    const net = totals.credit - totals.debit;
    return { totalBalance, totalCredit: totals.credit, totalDebit: totals.debit, net };
  }, [filteredAccounts, analyticsTransactions]);

  const trend = useMemo(() => {
    const base = kpi.totalCredit + kpi.totalDebit;
    const pct = base > 0 ? ((kpi.net / base) * 100).toFixed(1) : '0.0';
    return `${pct}%`;
  }, [kpi]);

  // Company summary dynamically calculated from filteredAccounts
  const companySummary = useMemo(() => {
    const map = new Map();
    filteredAccounts.forEach((a) => {
      const key = a.companyName || 'Unassigned';
      map.set(key, (map.get(key) || 0) + Number(a.balance || 0));
    });
    return [...map.entries()]
      .map(([name, balance], idx) => ({ id: idx + 1, name, balance }))
      .sort((a, b) => b.balance - a.balance);
  }, [filteredAccounts]);

  // Monthly Chart data derived from analyticsTransactions
  const monthlyMap = useMemo(() => {
    const map = new Map();
    analyticsTransactions.forEach((txn) => {
      if (!txn.date) return;
      const d = new Date(txn.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, { credit: 0, debit: 0, label: d.toLocaleDateString('en-US', { month: 'short' }) });
      }
      const row = map.get(key);
      const amt = Number(txn.amount || 0);
      if (txn.type === 'Received') row.credit += amt;
      if (txn.type === 'Paid') row.debit += amt;
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([, v]) => v);
  }, [analyticsTransactions]);

  // Weekly Chart data derived from analyticsTransactions
  const weeklyMap = useMemo(() => {
    const map = new Map();
    const getWeekStart = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      return d;
    };

    analyticsTransactions.forEach((txn) => {
      if (!txn.date) return;
      const parsed = new Date(txn.date);
      if (Number.isNaN(parsed.getTime())) return;
      const weekStart = getWeekStart(parsed);
      const key = weekStart.toISOString().slice(0, 10);
      if (!map.has(key)) {
        map.set(key, {
          credit: 0,
          debit: 0,
          label: `Wk ${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
        });
      }
      const row = map.get(key);
      const amt = Number(txn.amount || 0);
      if (txn.type === 'Received') row.credit += amt;
      if (txn.type === 'Paid') row.debit += amt;
    });

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([, v]) => v);
  }, [analyticsTransactions]);

  const chartSeries = chartView === 'weekly' ? weeklyMap : monthlyMap;

  const chartData = {
    labels: chartSeries.map((m) => m.label),
    datasets: [
      {
        label: 'Credit',
        data: chartSeries.map((m) => m.credit),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Debit',
        data: chartSeries.map((m) => m.debit),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f1f5f9', borderDash: [5, 5] } }
    }
  };

  // Filtered dropdown lists for search
  const displayedCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    return companies.filter(c => c.name?.toLowerCase().includes(companySearch.toLowerCase()));
  }, [companies, companySearch]);

  const displayedAccounts = useMemo(() => {
    if (!accountSearch.trim()) return availableAccountsInForm;
    return availableAccountsInForm.filter(a => 
      a.name?.toLowerCase().includes(accountSearch.toLowerCase()) ||
      a.companyName?.toLowerCase().includes(accountSearch.toLowerCase())
    );
  }, [availableAccountsInForm, accountSearch]);

  return (
    <div className="dashboard-view">
      {/* A. Global Filter Bar with Multi-Select Checkbox Dropdowns */}
      <div className="card dash-filter-card mb-4 shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            
            {/* 1. Date Range Filter */}
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small fw-semibold text-muted mb-1">Date Range</label>
              <div className="input-group input-group-sm">
                <input
                  type="date"
                  className="form-control"
                  value={filterForm.dateFrom}
                  onChange={(e) => setFilterForm((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
                <span className="input-group-text bg-light text-muted">to</span>
                <input
                  type="date"
                  className="form-control"
                  value={filterForm.dateTo}
                  onChange={(e) => setFilterForm((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>

            {/* 2. Company Multi-Select with Checkboxes & Select All */}
            <div className="col-12 col-md-6 col-lg-3" ref={companyDropdownRef}>
              <label className="form-label small fw-semibold text-muted mb-1">Company</label>
              <div className="dash-multi-select">
                <div 
                  className={`dash-select-trigger ${isCompanyOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsCompanyOpen(!isCompanyOpen);
                    setIsAccountOpen(false);
                  }}
                  title={companyButtonSummary}
                >
                  <div className="dash-select-summary">
                    <span className="text-truncate">{companyButtonSummary}</span>
                    {filterForm.companyIds.length > 1 && !isAllCompaniesChecked && (
                      <span className="dash-select-badge">{filterForm.companyIds.length}</span>
                    )}
                  </div>
                  <div className="dash-select-icons">
                    <i className={`bi bi-chevron-${isCompanyOpen ? 'up' : 'down'}`}></i>
                  </div>
                </div>

                {isCompanyOpen && (
                  <div className="dash-select-menu">
                    {companies.length > 5 && (
                      <div className="dash-select-search-box">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search company..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Select All Checkbox */}
                    <div 
                      className="dash-select-header-option"
                      onClick={handleToggleSelectAllCompanies}
                    >
                      <div className="d-flex align-items-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isAllCompaniesChecked}
                          onChange={handleToggleSelectAllCompanies}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>Select All Companies</span>
                      </div>
                      <span className="badge bg-light text-muted fw-normal">{companies.length}</span>
                    </div>

                    {/* Company Checkboxes List */}
                    <div className="dash-select-options-list">
                      {displayedCompanies.map(c => {
                        const isChecked = filterForm.companyIds.includes(Number(c.id));
                        return (
                          <div 
                            key={c.id} 
                            className={`dash-select-option ${isChecked ? 'selected' : ''}`}
                            onClick={() => handleToggleCompany(c.id)}
                          >
                            <div className="d-flex align-items-center overflow-hidden flex-grow-1">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isChecked}
                                onChange={() => handleToggleCompany(c.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="dash-option-label">
                                <span className="dash-option-title text-truncate">{c.name}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="dash-only-btn ms-2"
                              title={`Select only ${c.name}`}
                              onClick={(e) => handleSelectOnlyCompany(c.id, e)}
                            >
                              Only
                            </button>
                          </div>
                        );
                      })}
                      {displayedCompanies.length === 0 && (
                        <div className="text-center py-3 text-muted small">No companies found</div>
                      )}
                    </div>

                    <div className="dash-select-footer">
                      <span>{filterForm.companyIds.length} of {companies.length} selected</span>
                      {filterForm.companyIds.length > 0 && !isAllCompaniesChecked && (
                        <button 
                          type="button" 
                          onClick={() => setFilterForm(prev => ({ ...prev, companyIds: allCompanyIds }))}
                        >
                          Select All
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Account / Bank Multi-Select with Checkboxes & Select All */}
            <div className="col-12 col-md-6 col-lg-3" ref={accountDropdownRef}>
              <label className="form-label small fw-semibold text-muted mb-1">Account / Bank</label>
              <div className="dash-multi-select">
                <div 
                  className={`dash-select-trigger ${isAccountOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsAccountOpen(!isAccountOpen);
                    setIsCompanyOpen(false);
                  }}
                  title={accountButtonSummary}
                >
                  <div className="dash-select-summary">
                    <span className="text-truncate">{accountButtonSummary}</span>
                    {filterForm.accountIds.length > 1 && !isAllAccountsChecked && (
                      <span className="dash-select-badge">{filterForm.accountIds.length}</span>
                    )}
                  </div>
                  <div className="dash-select-icons">
                    <i className={`bi bi-chevron-${isAccountOpen ? 'up' : 'down'}`}></i>
                  </div>
                </div>

                {isAccountOpen && (
                  <div className="dash-select-menu">
                    {availableAccountsInForm.length > 5 && (
                      <div className="dash-select-search-box">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search account or company..."
                          value={accountSearch}
                          onChange={(e) => setAccountSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Select All Checkbox */}
                    <div 
                      className="dash-select-header-option"
                      onClick={handleToggleSelectAllAccounts}
                    >
                      <div className="d-flex align-items-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isAllAccountsChecked}
                          onChange={handleToggleSelectAllAccounts}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>Select All Accounts</span>
                      </div>
                      <span className="badge bg-light text-muted fw-normal">{availableAccountsInForm.length}</span>
                    </div>

                    {/* Accounts Checkbox List */}
                    <div className="dash-select-options-list">
                      {displayedAccounts.map(a => {
                        const isChecked = filterForm.accountIds.includes(Number(a.id));
                        return (
                          <div 
                            key={a.id} 
                            className={`dash-select-option ${isChecked ? 'selected' : ''}`}
                            onClick={() => handleToggleAccount(a.id)}
                          >
                            <div className="d-flex align-items-center overflow-hidden flex-grow-1">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isChecked}
                                onChange={() => handleToggleAccount(a.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="dash-option-label">
                                <span className="dash-option-title text-truncate">
                                  <i className={`bi ${a.type === 'Bank' ? 'bi-bank text-primary' : 'bi-wallet text-warning'} me-1`}></i>
                                  {a.name}
                                </span>
                                {a.companyName && (
                                  <span className="dash-option-subtitle text-truncate">{a.companyName}</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="dash-only-btn ms-2"
                              title={`Select only ${a.name}`}
                              onClick={(e) => handleSelectOnlyAccount(a.id, e)}
                            >
                              Only
                            </button>
                          </div>
                        );
                      })}
                      {displayedAccounts.length === 0 && (
                        <div className="text-center py-3 text-muted small">No accounts found</div>
                      )}
                    </div>

                    <div className="dash-select-footer">
                      <span>{filterForm.accountIds.length} of {availableAccountsInForm.length} selected</span>
                      {filterForm.accountIds.length > 0 && !isAllAccountsChecked && (
                        <button 
                          type="button" 
                          onClick={() => setFilterForm(prev => ({ ...prev, accountIds: availableAccountIds }))}
                        >
                          Select All
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Action Buttons (Apply Filters & Reset) */}
            <div className="col-12 col-md-6 col-lg-3 d-flex gap-2">
              <button 
                type="button"
                className="btn btn-primary-custom btn-sm flex-grow-1 py-2 fw-semibold shadow-sm" 
                onClick={handleApplyFilters}
              >
                <i className="bi bi-funnel-fill me-1"></i>Apply Filters
              </button>
              <button 
                type="button"
                className="btn btn-secondary-custom btn-sm py-2 px-3 fw-semibold" 
                onClick={handleResetFilters}
                title="Reset all filters to default"
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* B. KPI Stat Cards (Dynamically computed from applied filters) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard 
            icon="bi-wallet2" 
            label="Total Balance" 
            value={formatCurrency(kpi.totalBalance)} 
            trend={kpi.net >= 0 ? 'up' : 'down'} 
            trendValue={trend} 
            iconColorClass="bg-blue-soft text-blue"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard 
            icon="bi-arrow-down-left-circle" 
            label="Total Credit" 
            value={formatCurrency(kpi.totalCredit)} 
            trend="up" 
            trendValue={`${analyticsTransactions.filter((t) => t.type === 'Received').length} txns`} 
            iconColorClass="bg-green-soft text-green"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard 
            icon="bi-arrow-up-right-circle" 
            label="Total Debit" 
            value={formatCurrency(kpi.totalDebit)} 
            trend={kpi.totalDebit > kpi.totalCredit ? 'up' : 'down'} 
            trendValue={`${analyticsTransactions.filter((t) => t.type === 'Paid').length} txns`} 
            iconColorClass="bg-orange-soft text-orange"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard 
            icon="bi-graph-up-arrow" 
            label="Net Flow" 
            value={formatCurrency(kpi.net)} 
            trend={kpi.net >= 0 ? 'up' : 'down'} 
            trendValue={trend} 
            iconColorClass="bg-purple-soft text-purple"
          />
        </div>
      </div>

      {/* Quick Actions (Admin Only) */}
      {canShowQuickActions && (
        <div className="dash-quick-actions">
          <div className="dash-qa-left">
            <span className="dash-qa-label">Quick Actions</span>
            <button
              className="dash-qa-btn qa-income"
              onClick={() => setActivePage && setActivePage('add-income')}
              title="Add Income transaction"
            >
              <span className="qa-icon"><i className="bi bi-arrow-down-left-circle-fill"></i></span>
              <span className="qa-text"><strong>Add Income</strong><small>Record received funds</small></span>
            </button>
            <button
              className="dash-qa-btn qa-expense"
              onClick={() => setActivePage && setActivePage('add-expense')}
              title="Add Expense transaction"
            >
              <span className="qa-icon"><i className="bi bi-arrow-up-right-circle-fill"></i></span>
              <span className="qa-text"><strong>Add Expense</strong><small>Record paid funds</small></span>
            </button>
            <button
              className="dash-qa-btn qa-transfer"
              onClick={() => setActivePage && setActivePage('transfer-money')}
              title="Transfer between accounts"
            >
              <span className="qa-icon"><i className="bi bi-arrow-left-right"></i></span>
              <span className="qa-text"><strong>Transfer</strong><small>Move between accounts</small></span>
            </button>
          </div>
          <div className="dash-qa-right">
            <a href="#" className="dash-shortcut" onClick={e => { e.preventDefault(); setActivePage && setActivePage('all-accounts'); }}>
              <i className="bi bi-bank"></i> Accounts
            </a>
            <a href="#" className="dash-shortcut" onClick={e => { e.preventDefault(); setActivePage && setActivePage('company-report'); }}>
              <i className="bi bi-file-bar-graph"></i> Reports
            </a>
            <a href="#" className="dash-shortcut" onClick={e => { e.preventDefault(); setActivePage && setActivePage('company-master'); }}>
              <i className="bi bi-buildings"></i> Masters
            </a>
          </div>
        </div>
      )}

      {/* C. Company Summary & Bank Accounts Tables (Top 10) */}
      <div className="row g-3 mb-4">
        {/* Company-wise Summary */}
        <div className="col-lg-6">
          <div className="card h-100 table-card">
            <div className="card-header-custom">
              <h5>Company Summary (Top 10)</h5>
              <button
                className="btn btn-outline-custom"
                onClick={() => setActivePage && setActivePage('company-master')}
              >
                View All
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table custom-table mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '65px' }}>Sr No.</th>
                      <th>Company Name</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companySummary.slice(0, 10).map((company, index) => (
                      <tr 
                        key={company.id} 
                        className={activeRow === `company-${company.id}` ? 'active-row' : ''}
                        onClick={() => setActiveRow(`company-${company.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td data-label="Sr No." className="text-muted fw-semibold">{index + 1}</td>
                        <td data-label="Company Name" className="fw-medium">{company.name}</td>
                        <td data-label="Balance" className="text-end fw-bold text-primary">{formatCurrency(company.balance)}</td>
                      </tr>
                    ))}
                    {companySummary.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-3 text-muted">No companies found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Bank & Cash Accounts */}
        <div className="col-lg-6">
          <div className="card h-100 table-card">
            <div className="card-header-custom">
              <h5>Bank & Cash Accounts (Top 10)</h5>
              <button
                className="btn btn-outline-custom"
                onClick={() => setActivePage && setActivePage('account-statement')}
              >
                Statements
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table custom-table mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '65px' }}>Sr No.</th>
                      <th>Account</th>
                      <th>Company</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.slice(0, 10).map((account, index) => (
                      <tr 
                        key={account.id} 
                        className={activeRow === `account-${account.id}` ? 'active-row' : ''}
                        onClick={() => setActiveRow(`account-${account.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td data-label="Sr No." className="text-muted fw-semibold">{index + 1}</td>
                        <td data-label="Account">
                          <div className="d-flex align-items-center gap-2">
                            <i className={`bi ${account.type === 'Bank' ? 'bi-bank text-primary' : 'bi-wallet text-warning'}`}></i>
                            {account.name}
                          </div>
                        </td>
                        <td data-label="Company" className="small text-muted">{account.companyName}</td>
                        <td data-label="Balance" className="text-end fw-bold">{formatCurrency(account.balance)}</td>
                      </tr>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-3 text-muted">No accounts found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* D. Cash Flow Chart (Credit vs Debit) */}
      {systemSettings?.preferences?.dashboard?.showCharts !== false && (
        <div className="row g-3 mb-4">
          <div className="col-lg-12">
            <div className="card chart-card">
              <div className="card-header-custom">
                <h5>Cash Flow Analysis (Credit vs Debit)</h5>
                <div className="btn-group btn-group-sm">
                  <button
                    className={`btn btn-secondary-custom ${chartView === 'monthly' ? 'active' : ''}`}
                    onClick={() => setChartView('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    className={`btn btn-secondary-custom ${chartView === 'weekly' ? 'active' : ''}`}
                    onClick={() => setChartView('weekly')}
                  >
                    Weekly
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E. Recent Transactions (Top 10) */}
      <div className="card table-card mb-4">
        <div className="card-header-custom" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <h5 style={{ margin: 0 }}>Recent Transactions (Top 10)</h5>
          <button
            className="btn btn-primary-custom btn-sm"
            onClick={() => setActivePage && setActivePage('all-transactions')}
          >
            <i className="bi bi-list-ul me-1"></i>Full History
          </button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table custom-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: '65px' }}>Sr No.</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description (From → To)</th>
                  <th>Company</th>
                  <th>Account</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((t, index) => (
                  <tr 
                    key={t.id} 
                    className={activeRow === `tx-${t.id}` ? 'active-row' : ''}
                    onClick={() => setActiveRow(`tx-${t.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td data-label="Sr No." className="text-muted fw-semibold">{index + 1}</td>
                    <td data-label="Date">{t.date}</td>
                    <td data-label="Type">
                      <span className={`status-badge status-${txTypeToStatus(t.type)}`}>
                        {t.type === 'Received' ? 'Income' : t.type === 'Paid' ? 'Expense' : 'Transfer'}
                      </span>
                    </td>
                    <td data-label="Description" className="small">{getTxnFlow(t)}</td>
                    <td data-label="Company">{t.fromCompanyName || t.toCompanyName || '-'}</td>
                    <td data-label="Account">{t.fromAccountName || t.toAccountName || '-'}</td>
                    <td data-label="Amount" className={`text-end fw-bold ${txTypeToStatus(t.type) === 'credit' ? 'text-success' : txTypeToStatus(t.type) === 'debit' ? 'text-danger' : 'text-primary'}`}>
                      {txTypeToStatus(t.type) === 'debit' ? '-' : txTypeToStatus(t.type) === 'credit' ? '+' : ''}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-3 text-muted">No recent transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
