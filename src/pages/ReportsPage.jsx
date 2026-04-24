import React, { useState, useMemo, useEffect } from 'react';
import './ReportsPage.css';
import Pagination from '../components/Pagination';
import Swal from 'sweetalert2';
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
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ReportsPage = ({ activePage, userRole }) => {
    // Report types mapping
    const reportTypeMap = {
        'bank-statement': 'Bank Statement',
        'company-report': 'Company Report',
        'combined-report': 'Combined Report',
        'date-wise-report': 'Date-wise Report'
    };

    const [filters, setFilters] = useState({
        dateFrom: '2024-04-01',
        dateTo: '2024-04-30',
        companies: [],
        accounts: [],
        paymentMode: 'all',
        txnType: 'all',
        search: ''
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [savedPresets, setSavedPresets] = useState([]);
    const [drillDownData, setDrillDownData] = useState(null);

    // Mock Data for filters
    const mockCompanies = ['Acme Corp', 'Global Tech', 'Star Inc', 'PVT Ltd', 'LLP Services'];
    const mockAccounts = ['HDFC Main', 'ICICI Bank', 'SBI Primary', 'Main Cash', 'Petty Cash'];
    const mockModes = ['Online', 'Cash', 'Cheque', 'NEFT/RTGS'];

    // Mock Transaction Data
    const initialTransactions = [
        { id: 'TXN-1001', date: '2024-04-05', desc: 'Consulting Fee Q1', from: 'External', to: 'HDFC Main', company: 'Acme Corp', account: 'HDFC Main', type: 'Received', mode: 'Online', ref: 'TXN8892', debit: 0, credit: 45000, category: 'Consulting' },
        { id: 'TXN-1002', date: '2024-04-08', desc: 'Office Rent - April', from: 'HDFC Main', to: 'External', company: 'Acme Corp', account: 'HDFC Main', type: 'Paid', mode: 'Online', ref: 'TXN9012', debit: 35000, credit: 0, category: 'Rent' },
        { id: 'TXN-1003', date: '2024-04-10', desc: 'Cash Withdrawal', from: 'HDFC Main', to: 'Petty Cash', company: 'Acme Corp', account: 'HDFC Main', type: 'Moved', mode: 'Cash', ref: 'WDL-001', debit: 10000, credit: 0, category: 'Internal' },
        { id: 'TXN-1004', date: '2024-04-15', desc: 'Server Hosting', from: 'HDFC Main', to: 'External', company: 'Acme Corp', account: 'HDFC Main', type: 'Paid', mode: 'Online', ref: 'AWS-445', debit: 12000, credit: 0, category: 'Software' },
        { id: 'TXN-1005', date: '2024-04-20', desc: 'Project Alpha Milestone', from: 'External', to: 'HDFC Main', company: 'Acme Corp', account: 'HDFC Main', type: 'Received', mode: 'Cheque', ref: 'CHQ-778', debit: 0, credit: 125000, category: 'Development' },
        { id: 'TXN-1006', date: '2024-04-22', desc: 'Marketing Expenses', from: 'HDFC Main', to: 'External', company: 'Acme Corp', account: 'HDFC Main', type: 'Paid', mode: 'Online', ref: 'FB-ADS-12', debit: 25000, credit: 0, category: 'Marketing' },
        { id: 'TXN-1007', date: '2024-04-25', desc: 'Client Refund', from: 'ICICI Bank', to: 'External', company: 'Global Tech', account: 'ICICI Bank', type: 'Paid', mode: 'Online', ref: 'REF-99', debit: 5000, credit: 0, category: 'Refund' },
    ];

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 800);
    };

    const resetFilters = () => {
        setFilters({
            dateFrom: '2024-04-01',
            dateTo: '2024-04-30',
            companies: [],
            accounts: [],
            paymentMode: 'all',
            txnType: 'all',
            search: ''
        });
    };

    const savePreset = () => {
        Swal.fire({
            title: 'Save Filter Preset',
            input: 'text',
            inputPlaceholder: 'Enter preset name...',
            showCancelButton: true,
            confirmButtonText: 'Save',
            confirmButtonColor: '#5c67f2'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                setSavedPresets([...savedPresets, { name: result.value, filters }]);
                Swal.fire('Saved!', `Preset "${result.value}" has been saved.`, 'success');
            }
        });
    };

    const loadPreset = () => {
        if (savedPresets.length === 0) {
            Swal.fire('No Presets', 'You haven\'t saved any filter presets yet.', 'info');
            return;
        }

        const presetOptions = savedPresets.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
        
        Swal.fire({
            title: 'Load Filter Preset',
            html: `<select id="presetSelect" class="form-select">${presetOptions}</select>`,
            showCancelButton: true,
            confirmButtonText: 'Load',
            confirmButtonColor: '#5c67f2',
            preConfirm: () => {
                return document.getElementById('presetSelect').value;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                setFilters(savedPresets[result.value].filters);
                Swal.fire('Loaded!', 'Filters have been updated.', 'success');
            }
        });
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleItem = (type, value) => {
        setFilters(prev => {
            const list = [...prev[type]];
            const index = list.indexOf(value);
            if (index > -1) list.splice(index, 1);
            else list.push(value);
            return { ...prev, [type]: list };
        });
    };

    const removeTag = (type, value) => {
        setFilters(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item !== value)
        }));
    };

    return (
        <div className="reports-container">
            <div className="audit-indicator">
                <i className="bi bi-check-circle-fill"></i> Data synced with transactions
            </div>

            {/* Filter Panel */}
            <div className="report-filter-card">
                <div className="report-filter-grid">
                    <div className="report-filter-item">
                        <label className="report-filter-label">Report Type</label>
                        <input type="text" className="report-filter-input" value={reportTypeMap[activePage] || 'Report'} readOnly style={{ background: '#f1f5f9', fontWeight: '600' }} />
                    </div>
                    
                    <div className="report-filter-item">
                        <label className="report-filter-label">Date Range</label>
                        <div className="d-flex gap-2">
                            <input 
                                type="date" 
                                className="report-filter-input w-50" 
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                            />
                            <input 
                                type="date" 
                                className="report-filter-input w-50" 
                                value={filters.dateTo}
                                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="report-filter-item">
                        <label className="report-filter-label">Company</label>
                        <div className="custom-multiselect">
                            <select 
                                className="report-filter-input"
                                onChange={(e) => {
                                    if (e.target.value) toggleItem('companies', e.target.value);
                                    e.target.value = '';
                                }}
                            >
                                <option value="">Add Company...</option>
                                {mockCompanies.map(c => (
                                    <option key={c} value={c} disabled={filters.companies.includes(c)}>{c}</option>
                                ))}
                            </select>
                            <div className="selected-tags mt-2">
                                {filters.companies.length === 0 ? (
                                    <span className="tag-all">All Companies Selected</span>
                                ) : (
                                    filters.companies.map(c => (
                                        <span key={c} className="filter-tag">
                                            {c} <i className="bi bi-x" onClick={() => removeTag('companies', c)}></i>
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="report-filter-item">
                        <label className="report-filter-label">Account / Bank</label>
                        <div className="custom-multiselect">
                            <select 
                                className="report-filter-input"
                                onChange={(e) => {
                                    if (e.target.value) toggleItem('accounts', e.target.value);
                                    e.target.value = '';
                                }}
                            >
                                <option value="">Add Account...</option>
                                {mockAccounts.map(a => (
                                    <option key={a} value={a} disabled={filters.accounts.includes(a)}>{a}</option>
                                ))}
                            </select>
                            <div className="selected-tags mt-2">
                                {filters.accounts.length === 0 ? (
                                    <span className="tag-all">All Accounts Selected</span>
                                ) : (
                                    filters.accounts.map(a => (
                                        <span key={a} className="filter-tag">
                                            {a} <i className="bi bi-x" onClick={() => removeTag('accounts', a)}></i>
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="report-filter-item">
                        <label className="report-filter-label">Payment Mode</label>
                        <select 
                            className="report-filter-input"
                            value={filters.paymentMode}
                            onChange={(e) => setFilters({...filters, paymentMode: e.target.value})}
                        >
                            <option value="all">All Modes</option>
                            {mockModes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="report-filter-item">
                        <label className="report-filter-label">Transaction Type</label>
                        <select 
                            className="report-filter-input"
                            value={filters.txnType}
                            onChange={(e) => setFilters({...filters, txnType: e.target.value})}
                        >
                            <option value="all">All Transactions</option>
                            <option value="Received">Received (In)</option>
                            <option value="Paid">Paid (Out)</option>
                            <option value="Moved">Moved (Transfer)</option>
                        </select>
                    </div>

                    <div className="report-filter-item full-width mt-2">
                        <div className="action-row-content">
                            <div>
                                <label className="report-filter-label">Search Keywords</label>
                                <div className="position-relative">
                                    <input 
                                        type="text" 
                                        className="report-filter-input w-100 ps-5" 
                                        placeholder="Desc, Ref, ID..."
                                        value={filters.search}
                                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                                    />
                                    <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                                </div>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn-generate px-4" onClick={handleGenerate} disabled={isGenerating}>
                                    {isGenerating ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-file-earmark-text me-2"></i>}
                                    Generate Report
                                </button>
                                <button className="btn-reset" onClick={resetFilters} title="Reset Filters">
                                    <i className="bi bi-arrow-counterclockwise"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {userRole === 'Super Admin' && (
                    <div className="d-flex gap-2 mt-3 pt-3 border-top">
                        <button className="btn-filter-action" onClick={savePreset}>
                            <i className="bi bi-bookmark-plus"></i> Save Filter Preset
                        </button>
                        <button className="btn-filter-action" onClick={loadPreset}>
                            <i className="bi bi-folder2-open"></i> Load Saved Filter
                        </button>
                    </div>
                )}
            </div>

            {/* Report Content */}
            <div className="report-content-card">
                {isGenerating ? (
                    <div className="empty-state">
                        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
                        <p className="empty-state-text">Calculating financial data and generating audit report...</p>
                    </div>
                ) : (
                    <>
                        {activePage === 'bank-statement' && (
                            <BankStatementView 
                                transactions={initialTransactions} 
                                filters={filters} 
                                onSort={handleSort} 
                                sortConfig={sortConfig} 
                                currentPage={currentPage}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={(val) => {
                                    setItemsPerPage(val);
                                    setCurrentPage(1);
                                }}
                            />
                        )}
                        {activePage === 'company-report' && (
                            <CompanyReportView 
                                transactions={initialTransactions} 
                                filters={filters} 
                                onSort={handleSort} 
                                sortConfig={sortConfig}
                                currentPage={currentPage}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={(val) => {
                                    setItemsPerPage(val);
                                    setCurrentPage(1);
                                }}
                            />
                        )}
                        {activePage === 'combined-report' && (
                            <CombinedReportView 
                                transactions={initialTransactions} 
                                filters={filters} 
                                onSort={handleSort} 
                                sortConfig={sortConfig}
                                currentPage={currentPage}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={(val) => {
                                    setItemsPerPage(val);
                                    setCurrentPage(1);
                                }}
                            />
                        )}
                        {activePage === 'date-wise-report' && <DateWiseReportView transactions={initialTransactions} filters={filters} setDrillDown={setDrillDownData} />}
                    </>
                )}
            </div>

            {/* Export Actions */}
            {!isGenerating && (
                <div className="export-actions mt-4 mb-5">
                    <button className="btn-export pdf"><i className="bi bi-file-earmark-pdf"></i> Export PDF</button>
                    <button className="btn-export excel"><i className="bi bi-file-earmark-excel"></i> Export Excel</button>
                    <button className="btn-export print"><i className="bi bi-printer"></i> Print Report</button>
                </div>
            )}

            {/* Drill-down Modal */}
            {drillDownData && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1" role="dialog">
                        <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                            <div className="modal-content">
                                <div className="modal-header border-bottom-0 pb-0">
                                    <h5 className="modal-title fw-bold">
                                        <span className="text-primary">{drillDownData.period}</span> Transaction Details
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setDrillDownData(null)}></button>
                                </div>
                                <div className="modal-body p-0 mt-3">
                                    <div className="statement-table-wrapper" style={{ maxHeight: '400px' }}>
                                        <table className="statement-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Description</th>
                                                    <th>Type</th>
                                                    <th className="text-end">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {initialTransactions.slice(0, 4).map(t => (
                                                    <tr key={t.id}>
                                                        <td>{t.date}</td>
                                                        <td>{t.desc}</td>
                                                        <td>{t.type}</td>
                                                        <td className={`text-end fw-bold ${t.credit > 0 ? 'text-success' : 'text-danger'}`}>
                                                            ₹{(t.credit || t.debit).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button className="btn btn-secondary px-4" onClick={() => setDrillDownData(null)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/* --- Sub-Views --- */

const BankStatementView = ({ transactions, filters, onSort, sortConfig, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    // Opening balance calculation (sum of everything before 01-04-2024 - simplified)
    const openingBalance = 250000;
    
    // Calculate running balance
    let currentBal = openingBalance;
    const tableData = transactions.map(txn => {
        if (txn.type === 'Received') currentBal += txn.credit;
        else if (txn.type === 'Paid') currentBal -= txn.debit;
        else if (txn.type === 'Moved') currentBal -= txn.debit; // Simplified: source view
        return { ...txn, runningBal: currentBal };
    });

    const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const closingBalance = openingBalance + totalCredit - totalDebit;

    if (transactions.length === 0) return (
        <div className="empty-state">
            <i className="bi bi-inbox empty-state-icon"></i>
            <p className="empty-state-text">No data available for selected filters</p>
        </div>
    );

    return (
        <>
            <div className="report-header">
                <div className="report-title-row">
                    <div className="report-title-main">
                        <h2>Bank Statement</h2>
                        <div className="report-subtitle">
                            <i className="bi bi-bank me-2"></i>
                            <strong>HDFC Main</strong> (Acme Corp)
                        </div>
                    </div>
                    <div className="report-meta">
                        <div>Generated: {new Date().toLocaleString()}</div>
                        <div>Range: {filters.dateFrom} to {filters.dateTo}</div>
                    </div>
                </div>
            </div>

            <div className="report-summary-stats">
                <div className="stat-item">
                    <div className="stat-label">
                        Opening Balance
                        <i className="bi bi-question-circle opening-balance-tooltip" title="Sum of all transactions before selected date"></i>
                    </div>
                    <span className="stat-value">₹{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Current Balance</span>
                    <span className="stat-value" style={{ color: '#5c67f2' }}>₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            <div className="statement-table-wrapper">
                <table className="statement-table">
                    <thead>
                        <tr>
                            <th className="sortable-header" onClick={() => onSort('date')}>Date <i className={`bi bi-caret-${sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'up'}`}></i></th>
                            <th>ID</th>
                            <th>Description</th>
                            <th>From → To</th>
                            <th>Type</th>
                            <th>Mode</th>
                            <th>Ref</th>
                            <th className="text-end sortable-header" onClick={() => onSort('debit')}>Debit <i className={`bi bi-caret-${sortConfig.key === 'debit' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'up'}`}></i></th>
                            <th className="text-end sortable-header" onClick={() => onSort('credit')}>Credit <i className={`bi bi-caret-${sortConfig.key === 'credit' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'up'}`}></i></th>
                            <th className="text-end">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(txn => (
                            <tr key={txn.id} className="statement-row">
                                <td>{txn.date}</td>
                                <td><code className="small text-primary">{txn.id}</code></td>
                                <td>{txn.desc}</td>
                                <td>
                                    <div className="movement-cell">
                                        <span>{txn.from}</span>
                                        <i className="bi bi-arrow-right movement-arrow"></i>
                                        <span className="movement-to">{txn.to}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge rounded-pill ${txn.type === 'Received' ? 'bg-success-subtle text-success' : txn.type === 'Paid' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`}>
                                        {txn.type}
                                    </span>
                                </td>
                                <td>{txn.mode}</td>
                                <td><code className="text-muted small">{txn.ref}</code></td>
                                <td className="text-end amount-out">{txn.debit > 0 ? `₹${txn.debit.toLocaleString()}` : '-'}</td>
                                <td className="text-end amount-in">{txn.credit > 0 ? `₹${txn.credit.toLocaleString()}` : '-'}</td>
                                <td className="text-end running-balance">₹{txn.runningBal.toLocaleString()}</td>
                            </tr>
                        ))}
                        <tr className="closing-row">
                            <td colSpan="8" className="text-end border-0">Closing Balance on {filters.dateTo}</td>
                            <td colSpan="2" className="text-end">₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Pagination 
                totalItems={tableData.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={onPageChange}
                onItemsPerPageChange={(val) => {
                    onItemsPerPageChange(val);
                }}
            />
        </>
    );
};

const CompanyReportView = ({ transactions, filters, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    
    return (
        <div className="p-4">
            <div className="report-header px-0 border-0 mb-4">
                <h2>Company Financial Summary</h2>
                <p className="report-subtitle">Analysis for <strong>Acme Corp</strong> | Period: {filters.dateFrom} - {filters.dateTo}</p>
            </div>

            <div className="company-summary-grid">
                <div className="summary-card credit">
                    <span className="stat-label">Total Credit (Income)</span>
                    <div className="stat-value text-success">₹{totalCredit.toLocaleString()}</div>
                </div>
                <div className="summary-card debit">
                    <span className="stat-label">Total Debit (Expense)</span>
                    <div className="stat-value text-danger">₹{totalDebit.toLocaleString()}</div>
                </div>
                <div className="summary-card net">
                    <span className="stat-label">Net Balance (P&L)</span>
                    <div className="stat-value text-primary">₹{(totalCredit - totalDebit).toLocaleString()}</div>
                </div>
            </div>

            <div className="breakdown-grid">
                {/* Account Breakdown */}
                <div className="breakdown-card">
                    <div className="card-header-small">Account Breakdown</div>
                    <ul className="breakdown-list">
                        <li className="breakdown-list-item">
                            <span>HDFC Main</span>
                            <span className="fw-bold">₹1,45,000</span>
                        </li>
                        <li className="breakdown-list-item">
                            <span>ICICI Bank</span>
                            <span className="fw-bold">₹85,000</span>
                        </li>
                        <li className="breakdown-list-item">
                            <span>Main Cash</span>
                            <span className="fw-bold">₹10,000</span>
                        </li>
                    </ul>
                </div>

                {/* Insights */}
                <div className="breakdown-card">
                    <div className="card-header-small">Financial Insights</div>
                    <ul className="breakdown-list">
                        <li className="breakdown-list-item">
                            <span className="text-muted small">Top Expense Category</span>
                            <span className="insight-chip top-expense">Rent (₹35k)</span>
                        </li>
                        <li className="breakdown-list-item">
                            <span className="text-muted small">Top Income Source</span>
                            <span className="insight-chip top-income">Consulting (₹125k)</span>
                        </li>
                        <li className="breakdown-list-item">
                            <span className="text-muted small">Efficiency Ratio</span>
                            <span className="fw-bold text-primary">2.1x</span>
                        </li>
                    </ul>
                </div>
            </div>

            <h5 className="mb-3 fw-bold">Recent Company Transactions</h5>
            <div className="statement-table-wrapper border rounded">
                <table className="statement-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Account</th>
                            <th>Description</th>
                            <th className="text-end">Amount</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(txn => (
                            <tr key={txn.id}>
                                <td>{txn.date}</td>
                                <td>{txn.account}</td>
                                <td>{txn.desc}</td>
                                <td className={`text-end fw-bold ${txn.credit > 0 ? 'text-success' : 'text-danger'}`}>
                                    {txn.credit > 0 ? `+₹${txn.credit.toLocaleString()}` : `-₹${txn.debit.toLocaleString()}`}
                                </td>
                                <td>{txn.type}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination 
                totalItems={transactions.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={onPageChange}
                onItemsPerPageChange={onItemsPerPageChange}
            />
        </div>
    );
};

const CombinedReportView = ({ transactions, filters, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    let combinedRunningBal = 0;
    const tableData = transactions.map(txn => {
        combinedRunningBal += (txn.credit || 0) - (txn.debit || 0);
        return { ...txn, runningBal: combinedRunningBal };
    });

    return (
        <>
            <div className="report-header">
                <h2>Consolidated Combined Report</h2>
                <p className="report-subtitle">Multi-company consolidated view | Transfers excluded from totals</p>
            </div>
            
            <div className="p-3 bg-light d-flex gap-3 border-bottom">
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="groupCompany" />
                    <label className="form-check-label small fw-bold" htmlFor="groupCompany">Group by Company</label>
                </div>
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="groupAccount" />
                    <label className="form-check-label small fw-bold" htmlFor="groupAccount">Group by Account</label>
                </div>
            </div>

            <div className="statement-table-wrapper">
                <table className="statement-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Company</th>
                            <th>Account</th>
                            <th>From → To</th>
                            <th>Type</th>
                            <th className="text-end">Debit</th>
                            <th className="text-end">Credit</th>
                            <th className="text-end">Net Effect</th>
                            <th className="text-end">Running Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(txn => (
                            <tr key={txn.id}>
                                <td>{txn.date}</td>
                                <td className="fw-semibold">{txn.company}</td>
                                <td>{txn.account}</td>
                                <td>{txn.from} → {txn.to}</td>
                                <td>{txn.type}</td>
                                <td className="text-end text-danger">{txn.debit > 0 ? `₹${txn.debit.toLocaleString()}` : '-'}</td>
                                <td className="text-end text-success">{txn.credit > 0 ? `₹${txn.credit.toLocaleString()}` : '-'}</td>
                                <td className="text-end fw-bold">₹{(txn.credit - txn.debit).toLocaleString()}</td>
                                <td className="text-end running-balance">₹{txn.runningBal.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination 
                totalItems={tableData.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={onPageChange}
                onItemsPerPageChange={onItemsPerPageChange}
            />
        </>
    );
};

const DateWiseReportView = ({ transactions, filters, setDrillDown }) => {
    const barData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [
            {
                label: 'Credit',
                data: [120000, 190000, 210000, 170000],
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: '#10b981',
                borderWidth: 1,
            },
            {
                label: 'Debit',
                data: [90000, 150000, 145000, 82000],
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: '#ef4444',
                borderWidth: 1,
            },
        ],
    };

    const lineData = {
        labels: ['01 Apr', '05 Apr', '10 Apr', '15 Apr', '20 Apr', '25 Apr', '30 Apr'],
        datasets: [
            {
                label: 'Running Balance',
                data: [250000, 295000, 250000, 238000, 363000, 350000, 338000],
                borderColor: '#5c67f2',
                backgroundColor: 'rgba(92, 103, 242, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const label = barData.labels[index];
                setDrillDown({ period: label });
            }
        },
        plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6 } },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
        }
    };

    return (
        <>
            <div className="report-header">
                <h2>Date-wise Performance Analysis</h2>
                <p className="report-subtitle">Monthly and Quarterly trends | Click chart bars to drill-down</p>
            </div>
            <div className="charts-grid">
                <div className="chart-container">
                    <h6 className="fw-bold mb-4">Credit vs Debit (Monthly)</h6>
                    <div style={{ height: '250px', width: '100%', cursor: 'pointer' }}>
                        <Bar data={barData} options={options} />
                    </div>
                </div>
                <div className="chart-container">
                    <h6 className="fw-bold mb-4">Balance Trend</h6>
                    <div style={{ height: '250px', width: '100%' }}>
                        <Line data={lineData} options={options} />
                    </div>
                </div>
            </div>
            
            <div className="p-4 pt-0">
                <h5 className="mb-3 fw-bold">Periodic Performance Table</h5>
                <div className="statement-table-wrapper border rounded">
                    <table className="statement-table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th className="text-end">Total Credit</th>
                                <th className="text-end">Total Debit</th>
                                <th className="text-end">Net Flow</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {['April 2024', 'March 2024'].map(p => (
                                <tr key={p}>
                                    <td>{p}</td>
                                    <td className="text-end text-success">₹1,70,000</td>
                                    <td className="text-end text-danger">₹82,000</td>
                                    <td className="text-end fw-bold">₹88,000</td>
                                    <td>
                                        <button className="btn btn-sm btn-light border text-primary" onClick={() => setDrillDown({ period: p })}>
                                            <i className="bi bi-eye"></i> View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default ReportsPage;
