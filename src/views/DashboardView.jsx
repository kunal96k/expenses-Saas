import React, { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard';
import { apiService } from '../services/api';
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

const PAGE_SIZES = [10, 25, 50, 100, 500, 1000];

const DashboardView = ({ setActivePage, userRole = 'Viewer', systemSettings }) => {
  const [activeRow, setActiveRow]       = useState(null);
  const [txPageSize, setTxPageSize]     = useState(10);
  const [txPage, setTxPage]             = useState(1);
  const [companies, setCompanies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analyticsTransactions, setAnalyticsTransactions] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    companyId: '',
    accountId: ''
  });
  const [chartView, setChartView] = useState('monthly');

  const selectedCompanyId = filters.companyId ? Number(filters.companyId) : null;
  const selectedAccountId = filters.accountId ? Number(filters.accountId) : null;
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

  const filteredAccounts = useMemo(() => {
    if (!selectedCompanyId) return accounts;
    return accounts.filter((a) => Number(a.companyId) === selectedCompanyId);
  }, [accounts, selectedCompanyId]);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [companyRes, accountRes] = await Promise.all([
          apiService.getAllPages('/companies'),
          apiService.getAllPages('/accounts')
        ]);
        setCompanies(companyRes || []);
        setAccounts(accountRes || []);
      } catch {
        setCompanies([]);
        setAccounts([]);
      }
    };
    loadMasters();
  }, []);

  useEffect(() => {
    if (selectedCompanyId && selectedAccountId) {
      const accountExists = accounts.some((a) => Number(a.id) === selectedAccountId && Number(a.companyId) === selectedCompanyId);
      if (!accountExists) {
        setFilters((prev) => ({ ...prev, accountId: '' }));
      }
    }
  }, [selectedCompanyId, selectedAccountId, accounts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (selectedCompanyId) params.set('companyId', String(selectedCompanyId));
    if (selectedAccountId) params.append('accountIds', String(selectedAccountId));
    params.set('page', String(Math.max(txPage - 1, 0)));
    params.set('size', String(txPageSize));
    params.set('sortBy', 'date');
    params.set('direction', 'desc');

    const analyticsParams = new URLSearchParams();
    if (filters.dateFrom) analyticsParams.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) analyticsParams.set('dateTo', filters.dateTo);
    if (selectedCompanyId) analyticsParams.set('companyId', String(selectedCompanyId));
    if (selectedAccountId) analyticsParams.append('accountIds', String(selectedAccountId));
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
  }, [filters.dateFrom, filters.dateTo, selectedCompanyId, selectedAccountId, txPage, txPageSize]);

  const kpi = useMemo(() => {
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const totals = analyticsTransactions.reduce((acc, txn) => {
      const amt = Number(txn.amount || 0);
      if (txn.type === 'Received') acc.credit += amt;
      else if (txn.type === 'Paid') acc.debit += amt;
      return acc;
    }, { credit: 0, debit: 0 });
    const net = totals.credit - totals.debit;
    return { totalBalance, totalCredit: totals.credit, totalDebit: totals.debit, net };
  }, [accounts, analyticsTransactions]);

  const trend = useMemo(() => {
    const base = kpi.totalCredit + kpi.totalDebit;
    const pct = base > 0 ? ((kpi.net / base) * 100).toFixed(1) : '0.0';
    return `${pct}%`;
  }, [kpi]);

  const companySummary = useMemo(() => {
    const map = new Map();
    accounts.forEach((a) => {
      const key = a.companyName || 'Unassigned';
      map.set(key, (map.get(key) || 0) + Number(a.balance || 0));
    });
    return [...map.entries()]
      .map(([name, balance], idx) => ({ id: idx + 1, name, balance }))
      .sort((a, b) => b.balance - a.balance);
  }, [accounts]);

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

  return (
    <div className="dashboard-view">
      {/* A. Global Filter Bar */}
      <div className="card mb-4 shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Date Range</label>
              <div className="input-group input-group-sm">
                <input
                  type="date"
                  className="form-control"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
                <span className="input-group-text">to</span>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Company</label>
              <select
                className="form-select form-select-sm"
                value={filters.companyId}
                onChange={(e) => {
                  const nextCompanyId = e.target.value;
                  setFilters((prev) => ({ ...prev, companyId: nextCompanyId, accountId: '' }));
                }}
              >
                <option value="">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Account / Bank</label>
              <select className="form-select form-select-sm" value={filters.accountId} onChange={(e) => setFilters((prev) => ({ ...prev, accountId: e.target.value }))}>
                <option value="">All Accounts</option>
                {filteredAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-primary-custom btn-sm flex-grow-1" onClick={() => setTxPage(1)}>Apply Filters</button>
              <button className="btn btn-secondary-custom btn-sm" onClick={() => {
                setFilters({ dateFrom: '', dateTo: '', companyId: '', accountId: '' });
                setTxPage(1);
              }}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* B. KPI Cards */}
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

      {/* ── Quick Actions ── */}
      {canShowQuickActions && (<div className="dash-quick-actions">
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
      </div>)}

      <div className="row g-3 mb-4">
        {/* C. Company-wise Summary */}
        <div className="col-lg-6">
          <div className="card h-100 table-card">
            <div className="card-header-custom">
              <h5>Company Summary</h5>
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
                      <th>Company Name</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companySummary.map(company => (
                      <tr 
                        key={company.id} 
                        className={activeRow === `company-${company.id}` ? 'active-row' : ''}
                        onClick={() => setActiveRow(`company-${company.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td data-label="Company Name" className="fw-medium">{company.name}</td>
                        <td data-label="Balance" className="text-end fw-bold text-primary">{formatCurrency(company.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* D. Account / Bank Summary */}
        <div className="col-lg-6">
          <div className="card h-100 table-card">
            <div className="card-header-custom">
              <h5>Bank & Cash Accounts</h5>
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
                      <th>Account</th>
                      <th>Company</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map(account => (
                      <tr 
                        key={account.id} 
                        className={activeRow === `account-${account.id}` ? 'active-row' : ''}
                        onClick={() => setActiveRow(`account-${account.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
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
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {systemSettings?.preferences?.dashboard?.showCharts !== false && (
        <div className="row g-3 mb-4">
          {/* E. Cash Flow Chart */}
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

      {/* F. Recent Transactions */}
      <div className="card table-card mb-4">
        <div className="card-header-custom" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <h5 style={{ margin: 0 }}>Recent Transactions</h5>
          <div className="dash-pagesize-bar">
            <span className="dash-pagesize-label">Show</span>
            {PAGE_SIZES.map(size => (
              <button
                key={size}
                className={`dash-pagesize-btn${txPageSize === size ? ' active' : ''}`}
                onClick={() => { setTxPageSize(size); setTxPage(1); }}
              >
                {size}
              </button>
            ))}
            <span className="dash-pagesize-label">entries</span>
          </div>
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
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description (From → To)</th>
                  <th>Company</th>
                  <th>Account</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr 
                    key={t.id} 
                    className={activeRow === `tx-${t.id}` ? 'active-row' : ''}
                    onClick={() => setActiveRow(`tx-${t.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
