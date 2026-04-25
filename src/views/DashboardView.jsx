import React, { useState } from 'react';
import StatCard from '../components/StatCard';
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

const PAGE_SIZES = [25, 50, 100, 500, 1000];

const DashboardView = ({ setActivePage }) => {
  const [activeRow, setActiveRow]       = useState(null);
  const [txPageSize, setTxPageSize]     = useState(25);
  const [txPage, setTxPage]             = useState(1);

  // Mock Data
  const companies = [
    { id: 1, name: "TechnoKraft Services", balance: "₹12,45,000" },
    { id: 2, name: "TK Training & Solutions", balance: "₹4,20,500" },
    { id: 3, name: "TK Digital Hub", balance: "₹8,15,000" }
  ];

  const accounts = [
    { id: 1, name: "HDFC Bank (9876)", company: "TechnoKraft Services", balance: "₹8,45,000", type: "Bank" },
    { id: 2, name: "ICICI Bank (4321)", company: "TK Training & Solutions", balance: "₹3,20,500", type: "Bank" },
    { id: 3, name: "Main Cash", company: "TechnoKraft Services", balance: "₹4,00,000", type: "Cash" },
    { id: 4, name: "SBI Bank (5566)", company: "TK Digital Hub", balance: "₹8,15,000", type: "Bank" }
  ];

  const transactions = [
    { id: 101, date: "2024-10-24", type: "Income", flow: "Client Payment → HDFC", company: "TechnoKraft Services", account: "HDFC Bank", amount: "₹50,000", status: "credit" },
    { id: 102, date: "2024-10-23", type: "Expense", flow: "Office Rent → HDFC", company: "TechnoKraft Services", account: "HDFC Bank", amount: "₹25,000", status: "debit" },
    { id: 103, date: "2024-10-23", type: "Transfer", flow: "HDFC → Main Cash", company: "TechnoKraft Services", account: "Internal", amount: "₹10,000", status: "transfer" },
    { id: 104, date: "2024-10-22", type: "Income", flow: "Course Fee → ICICI", company: "TK Training & Solutions", account: "ICICI Bank", amount: "₹15,000", status: "credit" },
    { id: 105, date: "2024-10-21", type: "Expense", flow: "Salary → ICICI", company: "TK Training & Solutions", account: "ICICI Bank", amount: "₹80,000", status: "debit" }
  ];

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    datasets: [
      {
        label: 'Credit',
        data: [120000, 150000, 110000, 190000, 210000, 180000, 230000, 250000],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Debit',
        data: [80000, 100000, 95000, 140000, 130000, 120000, 160000, 180000],
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
                <input type="date" className="form-control" />
                <span className="input-group-text">to</span>
                <input type="date" className="form-control" />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Company</label>
              <select className="form-select form-select-sm">
                <option>All Companies</option>
                {companies.map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Account / Bank</label>
              <select className="form-select form-select-sm">
                <option>All Accounts</option>
                {accounts.map(a => <option key={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-primary-custom btn-sm flex-grow-1">Apply Filters</button>
              <button className="btn btn-secondary-custom btn-sm">Reset</button>
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
            value="₹24,80,500" 
            trend="up" 
            trendValue="4.2%" 
            iconColorClass="bg-blue-soft text-blue"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard 
            icon="bi-arrow-down-left-circle" 
            label="Total Credit" 
            value="₹5,40,000" 
            trend="up" 
            trendValue="12.5%" 
            iconColorClass="bg-green-soft text-green"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard 
            icon="bi-arrow-up-right-circle" 
            label="Total Debit" 
            value="₹3,20,000" 
            trend="down" 
            trendValue="8.2%" 
            iconColorClass="bg-orange-soft text-orange"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard 
            icon="bi-graph-up-arrow" 
            label="Net Flow" 
            value="₹2,20,000" 
            trend="up" 
            trendValue="15%" 
            iconColorClass="bg-purple-soft text-purple"
          />
        </div>
      </div>

      {/* ── Quick Actions ── */}
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

      <div className="row g-3 mb-4">
        {/* C. Company-wise Summary */}
        <div className="col-lg-6">
          <div className="card h-100 table-card">
            <div className="card-header-custom">
              <h5>Company Summary</h5>
              <button className="btn btn-outline-custom">View All</button>
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
                    {companies.map(company => (
                      <tr 
                        key={company.id} 
                        className={activeRow === `company-${company.id}` ? 'active-row' : ''}
                        onClick={() => setActiveRow(`company-${company.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td data-label="Company Name" className="fw-medium">{company.name}</td>
                        <td data-label="Balance" className="text-end fw-bold text-primary">{company.balance}</td>
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
              <button className="btn btn-outline-custom">Statements</button>
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
                    {accounts.map(account => (
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
                        <td data-label="Company" className="small text-muted">{account.company}</td>
                        <td data-label="Balance" className="text-end fw-bold">{account.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {/* E. Cash Flow Chart */}
        <div className="col-lg-12">
          <div className="card chart-card">
            <div className="card-header-custom">
              <h5>Cash Flow Analysis (Credit vs Debit)</h5>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-secondary-custom active">Monthly</button>
                <button className="btn btn-secondary-custom">Weekly</button>
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
                      <span className={`status-badge status-${t.status}`}>
                        {t.type}
                      </span>
                    </td>
                    <td data-label="Description" className="small">{t.flow}</td>
                    <td data-label="Company">{t.company}</td>
                    <td data-label="Account">{t.account}</td>
                    <td data-label="Amount" className={`text-end fw-bold ${t.status === 'credit' ? 'text-success' : t.status === 'debit' ? 'text-danger' : 'text-primary'}`}>
                      {t.status === 'debit' ? '-' : t.status === 'credit' ? '+' : ''}{t.amount}
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
