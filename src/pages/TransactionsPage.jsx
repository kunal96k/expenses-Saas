import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination';
import './TransactionsPage.css';

const TransactionsPage = ({ activePage, userRole }) => {
    // State for Tabs
    const [activeTab, setActiveTab] = useState('all');

    // State for Filters
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        company: 'all',
        accounts: [], // Changed to array for multi-select
        type: 'all',
        search: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Multi-Select Dropdown State
    const [isAccountsOpen, setIsAccountsOpen] = useState(false);
    const accountOptions = ['HDFC Bank', 'ICICI Bank', 'SBI Bank', 'Main Cash', 'Petty Cash'];

    const toggleAccount = (acc) => {
        setFilters(prev => {
            const current = [...prev.accounts];
            if (current.includes(acc)) {
                return { ...prev, accounts: current.filter(a => a !== acc) };
            } else {
                return { ...prev, accounts: [...current, acc] };
            }
        });
    };

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, activeTab]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.custom-multi-select')) {
                setIsAccountsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mock Data
    const initialTransactions = [
        { id: 1, date: '2024-04-24', type: 'Received', from: { company: 'External', account: 'Client A' }, to: { company: 'Acme Corp', account: 'HDFC Bank' }, amount: 50000, mode: 'Online', ref: 'TXN10023', desc: 'Consulting Fee Q1', status: 'completed' },
        { id: 2, date: '2024-04-23', type: 'Paid', from: { company: 'Acme Corp', account: 'ICICI Bank' }, to: { company: 'External', account: 'Google Cloud' }, amount: 12500, mode: 'Online', ref: 'INV-445', desc: 'Server Hosting Monthly', status: 'completed' },
        { id: 3, date: '2024-04-22', type: 'Moved', from: { company: 'Global Tech', account: 'Petty Cash' }, to: { company: 'Global Tech', account: 'HDFC Bank' }, amount: 10000, mode: 'Cash', ref: 'TRF-001', desc: 'Cash Deposit', status: 'completed' },
        { id: 4, date: '2024-04-22', type: 'Received', from: { company: 'External', account: 'Star Inc' }, to: { company: 'Acme Corp', account: 'Main Cash' }, amount: 75000, mode: 'Cheque', ref: 'CHQ-998', desc: 'Product Sale', status: 'completed' },
        { id: 5, date: '2024-04-21', type: 'Paid', from: { company: 'Acme Corp', account: 'Main Cash' }, to: { company: 'External', account: 'Office Supplies Co' }, amount: 2400, mode: 'Cash', ref: '', desc: 'Stationery Items', status: 'completed' },
        { id: 6, date: '2024-04-20', type: 'Moved', from: { company: 'Acme Corp', account: 'HDFC Bank' }, to: { company: 'Global Tech', account: 'ICICI Bank' }, amount: 200000, mode: 'Online', ref: 'TRF-002', desc: 'Inter-company Fund Transfer', status: 'completed' },
    ];

    const [transactions, setTransactions] = useState(initialTransactions);

    // State for Modals to prevent Bootstrap JS conflict
    const [activeModal, setActiveModal] = useState(null);
    const [selectedTxn, setSelectedTxn] = useState(null);

    useEffect(() => {
        if (activePage === 'add-income') setActiveModal('addReceived');
        else if (activePage === 'add-expense') setActiveModal('addPaid');
        else if (activePage === 'transfer-money') setActiveModal('transferMoney');
        else setActiveModal(null);
    }, [activePage]);

    const openModal = (modalName, txn = null) => {
        setSelectedTxn(txn);
        setActiveModal(modalName);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedTxn(null);
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Transaction?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-light)',
            confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                setTransactions(transactions.filter(t => t.id !== id));
                Swal.fire('Deleted!', 'Transaction has been removed.', 'success');
            }
        });
    };

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const typeMatch = activeTab === 'all' ||
                (activeTab === 'moved' && t.type === 'Moved') ||
                (activeTab === 'received' && t.type === 'Received') ||
                (activeTab === 'paid' && t.type === 'Paid');

            const matchesSearch = t.desc.toLowerCase().includes(filters.search.toLowerCase()) ||
                t.ref.toLowerCase().includes(filters.search.toLowerCase()) ||
                t.from.account.toLowerCase().includes(filters.search.toLowerCase()) ||
                t.to.account.toLowerCase().includes(filters.search.toLowerCase());

            const matchesTypeFilter = filters.type === 'all' || t.type === filters.type;
            const matchesCompany = filters.company === 'all' || t.from.company === filters.company || t.to.company === filters.company;
            const matchesAccounts = filters.accounts.length === 0 || filters.accounts.includes(t.from.account) || filters.accounts.includes(t.to.account);

            return typeMatch && matchesSearch && matchesTypeFilter && matchesCompany && matchesAccounts;
        });
    }, [transactions, activeTab, filters]);

    // Pagination Logic
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const resetFilters = () => {
        setFilters({
            dateFrom: '',
            dateTo: '',
            company: 'all',
            accounts: [],
            type: 'all',
            search: ''
        });
    };

    return (
        <div className="transactions-container">
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                <div>
                    <h4 className="page-title mb-1" style={{ fontSize: '1.5rem' }}>Financial Transactions</h4>
                    <p className="text-muted small mb-0">Track and manage money movement across your business</p>
                </div>
                {userRole === 'Super Admin' && (
                    <div className="action-buttons-group">
                        <button className="btn-transaction btn-income" onClick={() => openModal('addReceived')}>
                            <i className="bi bi-plus-circle"></i> Add Received
                        </button>
                        <button className="btn-transaction btn-expense" onClick={() => openModal('addPaid')}>
                            <i className="bi bi-dash-circle"></i> Add Paid
                        </button>
                        <button className="btn-transaction btn-transfer" onClick={() => openModal('transferMoney')}>
                            <i className="bi bi-arrow-left-right"></i> Transfer Money
                        </button>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="filter-card">
                <div className="filter-grid">
                    <div className="filter-item date-range">
                        <label className="filter-label">Date Range</label>
                        <div className="d-flex flex-column flex-sm-row gap-2">
                            <input
                                type="date"
                                className="filter-input"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            />
                            <input
                                type="date"
                                className="filter-input"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="filter-item">
                        <label className="filter-label">Company</label>
                        <select
                            className="filter-input"
                            value={filters.company}
                            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                        >
                            <option value="all">All Companies</option>
                            <option value="Acme Corp">Acme Corp</option>
                            <option value="Global Tech">Global Tech</option>
                            <option value="Star Inc">Star Inc</option>
                        </select>
                    </div>
                    <div className="filter-item">
                        <label className="filter-label">Accounts</label>
                        <div className="custom-multi-select position-relative">
                            <div
                                className="filter-input d-flex justify-content-between align-items-center"
                                style={{ height: '42px', cursor: 'pointer' }}
                                onClick={() => setIsAccountsOpen(!isAccountsOpen)}
                            >
                                <span className={filters.accounts.length === 0 ? "text-muted" : "text-dark"}>
                                    {filters.accounts.length === 0 ? 'All Accounts' : `${filters.accounts.length} Selected`}
                                </span>
                                <i className={`bi bi-chevron-${isAccountsOpen ? 'up' : 'down'} text-muted`}></i>
                            </div>

                            {isAccountsOpen && (
                                <div className="position-absolute w-100 bg-white border border-light rounded-3 shadow-lg mt-1 z-3 dropdown-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                    <div className="dropdown-option border-bottom" onClick={() => setFilters({ ...filters, accounts: [] })}>
                                        <div className="form-check d-flex align-items-center m-0 w-100 custom-check">
                                            <input className="form-check-input me-2 shadow-none border-secondary" type="checkbox" checked={filters.accounts.length === 0} readOnly style={{ cursor: 'pointer' }} />
                                            <label className="form-check-label w-100 text-dark" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>All Accounts</label>
                                        </div>
                                    </div>
                                    {accountOptions.map(acc => (
                                        <div key={acc} className="dropdown-option" onClick={() => toggleAccount(acc)}>
                                            <div className="form-check d-flex align-items-center m-0 w-100 custom-check">
                                                <input className="form-check-input me-2 shadow-none border-secondary" type="checkbox" checked={filters.accounts.includes(acc)} readOnly style={{ cursor: 'pointer' }} />
                                                <label className="form-check-label w-100 text-dark" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>{acc}</label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="filter-item">
                        <label className="filter-label">Type</label>
                        <select
                            className="filter-input"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="all">All Types</option>
                            <option value="Received">Received</option>
                            <option value="Paid">Paid</option>
                            <option value="Moved">Moved</option>
                        </select>
                    </div>
                    <div className="filter-item search">
                        <label className="filter-label">Search</label>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Desc, Ref, or Account..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div className="filter-item reset">
                        <button className="btn btn-outline-secondary rounded-pill px-3" onClick={resetFilters} title="Reset Filters">
                            <i className="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs Section */}
            <div className="transaction-tabs">
                <div className={`tab-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</div>
                <div className={`tab-item ${activeTab === 'received' ? 'active' : ''}`} onClick={() => setActiveTab('received')}>Received</div>
                <div className={`tab-item ${activeTab === 'paid' ? 'active' : ''}`} onClick={() => setActiveTab('paid')}>Paid</div>
                <div className={`tab-item ${activeTab === 'moved' ? 'active' : ''}`} onClick={() => setActiveTab('moved')}>Moved</div>
            </div>

            {/* Transactions List — Card Format for Mobile */}
            <div className="d-block d-md-none">
                <div className="transaction-cards-wrap">
                    {paginatedTransactions.map(txn => {
                        const isIncome = txn.type === 'Received';
                        const isExpense = txn.type === 'Paid';

                        return (
                            <div key={txn.id} className="txn-mobile-card" onClick={() => openModal('viewTransaction', txn)}>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="pe-2">
                                        <div className="txn-desc fw-bold">{txn.desc}</div>
                                        <div className="text-muted small-text">{txn.date} • <span className="opacity-75">#{txn.id}</span></div>
                                    </div>
                                    <div className={`txn-amount text-end fw-bold ${isIncome ? 'text-success' : isExpense ? 'text-danger' : 'text-primary'}`}>
                                        {isExpense ? '-' : '+'}₹{txn.amount.toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div className="txn-movement mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="movement-point">
                                            <span className="company-tag">{txn.from.company}</span>
                                            <span className="account-tag">{txn.from.account}</span>
                                        </div>
                                        <i className="bi bi-arrow-right text-muted px-1"></i>
                                        <div className="movement-point">
                                            <span className="company-tag">{txn.to.company}</span>
                                            <span className="account-tag">{txn.to.account}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex flex-wrap gap-2">
                                    <span className={`txn-pill pill-${txn.type.toLowerCase()}`}>{txn.type}</span>
                                    <span className="txn-pill pill-light">{txn.mode}</span>
                                    {txn.ref && <span className="txn-pill pill-light">Ref: {txn.ref}</span>}
                                </div>

                                {userRole === 'Super Admin' && (
                                    <div className="txn-card-actions mt-3 pt-2 border-top d-flex gap-2">
                                        <button className="btn btn-sm btn-light border flex-grow-1" onClick={(e) => { e.stopPropagation(); openModal('editTransaction', txn); }}>
                                            <i className="bi bi-pencil me-1"></i> Edit
                                        </button>
                                        <button className="btn btn-sm btn-light border text-danger flex-grow-1" onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }}>
                                            <i className="bi bi-trash me-1"></i> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table Section — Desktop Only */}
            <div className="transaction-table-container d-none d-md-block mb-5">
                <table className="transaction-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>From Source</th>
                            <th>To Destination</th>
                            <th>Amount</th>
                            <th>Mode</th>
                            <th>Reference</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map(txn => (
                            <tr key={txn.id} className="transaction-row">
                                <td data-label="Date">{txn.date}</td>
                                <td data-label="Type">
                                    <span className={`badge-type badge-${txn.type === 'Received' ? 'income' : txn.type === 'Paid' ? 'expense' : 'transfer'}`}>
                                        {txn.type}
                                    </span>
                                </td>
                                <td data-label="From Source">
                                    <div className="account-info">
                                        <span className={`company-name ${txn.from.company === 'External' ? 'text-external' : ''}`}>{txn.from.company}</span>
                                        <span className="account-name">{txn.from.account}</span>
                                    </div>
                                </td>
                                <td data-label="To Destination" className="position-relative">
                                    <i className="bi bi-arrow-right text-light position-absolute start-0 top-50 translate-middle-y" style={{ left: '-12px', opacity: 0.5, fontSize: '0.8rem' }}></i>
                                    <div className="account-info">
                                        <span className={`company-name ${txn.to.company === 'External' ? 'text-external' : ''}`}>{txn.to.company}</span>
                                        <span className="account-name">{txn.to.account}</span>
                                    </div>
                                </td>
                                <td data-label="Amount">
                                    <span className={`amount-cell amount-${txn.type === 'Received' ? 'income' : txn.type === 'Paid' ? 'expense' : 'transfer'}`}>
                                        {txn.type === 'Paid' ? '-' : '+'}₹{txn.amount.toLocaleString('en-IN')}
                                    </span>
                                </td>
                                <td data-label="Mode">{txn.mode}</td>
                                <td data-label="Reference"><code className="text-muted small">{txn.ref || '-'}</code></td>
                                <td data-label="Actions">
                                    <div className="d-flex gap-2">
                                        {userRole === 'Super Admin' && (
                                            <>
                                                <button className="btn btn-sm btn-light border" title="Edit" onClick={() => openModal('editTransaction', txn)}><i className="bi bi-pencil"></i></button>
                                                <button className="btn btn-sm btn-light border text-danger" title="Delete" onClick={() => handleDelete(txn.id)}><i className="bi bi-trash"></i></button>
                                            </>
                                        )}
                                        <button className="btn btn-sm btn-light border text-primary" title="View" onClick={() => openModal('viewTransaction', txn)}><i className="bi bi-eye"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Component */}
            <div className="mb-5">
                <Pagination
                    totalItems={filteredTransactions.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(val) => {
                        setItemsPerPage(val);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {/* Modals */}
            <TransactionModals activeModal={activeModal} selectedTxn={selectedTxn} closeModal={closeModal} />
        </div>
    );
};

// Sub-component for Modals to keep main component clean
const TransactionModals = React.memo(({ activeModal, selectedTxn, closeModal }) => {
    const today = new Date().toISOString().split('T')[0];

    if (!activeModal) return null;

    return (
        <>
            <div className="modal-backdrop fade show"></div>

            {/* View Transaction Modal */}
            {activeModal === 'viewTransaction' && (
                <div className="modal fade show d-block transaction-modal" tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title">Transaction Details</h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="d-flex justify-content-between mb-4">
                                    <div>
                                        <p className="text-muted small mb-0">Status</p>
                                        <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill">Completed</span>
                                    </div>
                                    <div className="text-end">
                                        <p className="text-muted small mb-0">Amount</p>
                                        <h4 className="fw-bold mb-0">Rs. 50,000</h4>
                                    </div>
                                </div>
                                <div className="row g-3">
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">Date</p>
                                        <p className="fw-semibold mb-0">24-04-2024</p>
                                    </div>
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">Type</p>
                                        <p className="fw-semibold mb-0 text-success">Received</p>
                                    </div>
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">From Source</p>
                                        <p className="fw-semibold mb-0 text-muted">External</p>
                                        <p className="text-muted small">Client A</p>
                                    </div>
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">To Destination</p>
                                        <p className="fw-semibold mb-0">Acme Corp</p>
                                        <p className="text-muted small">HDFC Bank</p>
                                    </div>
                                    <div className="col-12 border-top pt-3">
                                        <p className="text-muted small mb-1">Description</p>
                                        <p className="mb-0">Consulting Fee Q1 for Project Alpha</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal */}
            {activeModal === 'editTransaction' && (
                <div className="modal fade show d-block transaction-modal" tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Transaction</h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body pt-3">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Transaction Type</label>
                                        <input type="text" className="filter-input bg-light" value={selectedTxn?.type || ''} readOnly />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Date</label>
                                        <input type="date" className="filter-input" defaultValue={selectedTxn?.date || today} />
                                    </div>

                                    {selectedTxn?.type !== 'Moved' && (
                                        <>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Company <span className="text-danger">*</span></label>
                                                <select className="filter-input" defaultValue={selectedTxn?.type === 'Received' ? selectedTxn?.to?.company : selectedTxn?.from?.company}>
                                                    <option value="Acme Corp">Acme Corp</option>
                                                    <option value="Global Tech">Global Tech</option>
                                                    <option value="PVT">PVT</option>
                                                    <option value="LLP">LLP</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Account <span className="text-danger">*</span></label>
                                                <select className="filter-input" defaultValue={selectedTxn?.type === 'Received' ? selectedTxn?.to?.account : selectedTxn?.from?.account}>
                                                    <option value="HDFC Bank">HDFC Bank</option>
                                                    <option value="ICICI Bank">ICICI Bank</option>
                                                    <option value="SBI Bank">SBI Bank</option>
                                                    <option value="Main Cash">Main Cash</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">{selectedTxn?.type === 'Received' ? 'Received From' : 'Paid To'} <span className="text-danger">*</span></label>
                                                <input type="text" className="filter-input" defaultValue={selectedTxn?.type === 'Received' ? selectedTxn?.from?.account : selectedTxn?.to?.account} list="externalParties" />
                                            </div>
                                        </>
                                    )}

                                    {selectedTxn?.type === 'Moved' && (
                                        <div className="col-12">
                                            <div className="transfer-card from-card mb-2 p-3">
                                                <span className="card-badge from">SOURCE</span>
                                                <div className="row g-2">
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom mb-1">Company</label>
                                                        <select className="filter-input py-1" defaultValue={selectedTxn?.from?.company}>
                                                            <option value="Global Tech">Global Tech</option>
                                                            <option value="Acme Corp">Acme Corp</option>
                                                            <option value="PVT">PVT</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom mb-1">Account</label>
                                                        <select className="filter-input py-1" defaultValue={selectedTxn?.from?.account}>
                                                            <option value="Petty Cash">Petty Cash</option>
                                                            <option value="HDFC Bank">HDFC Bank</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="transfer-card to-card p-3">
                                                <span className="card-badge to">DESTINATION</span>
                                                <div className="row g-2">
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom mb-1">Company</label>
                                                        <select className="filter-input py-1" defaultValue={selectedTxn?.to?.company}>
                                                            <option value="Global Tech">Global Tech</option>
                                                            <option value="Acme Corp">Acme Corp</option>
                                                            <option value="LLP">LLP</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom mb-1">Account</label>
                                                        <select className="filter-input py-1" defaultValue={selectedTxn?.to?.account}>
                                                            <option value="HDFC Bank">HDFC Bank</option>
                                                            <option value="ICICI Bank">ICICI Bank</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-md-6 form-group-custom mb-0">
                                        <label className="form-label-custom">Amount <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">₹</span>
                                            <input type="number" className="filter-input border-start-0" defaultValue={selectedTxn?.amount || ''} />
                                        </div>
                                    </div>
                                    <div className="col-md-6 form-group-custom mb-0">
                                        <label className="form-label-custom">Payment Mode</label>
                                        <select className="filter-input" defaultValue={selectedTxn?.mode || 'Online'}>
                                            <option value="Online">Online</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6 form-group-custom mb-0">
                                        <label className="form-label-custom">Reference</label>
                                        <input type="text" className="filter-input" defaultValue={selectedTxn?.ref || ''} />
                                    </div>
                                    <div className="col-md-6 form-group-custom mb-0">
                                        {selectedTxn?.type === 'Paid' && (
                                            <>
                                                <label className="form-label-custom">Category</label>
                                                <select className="filter-input">
                                                    <option>Office Supplies</option>
                                                    <option>Software</option>
                                                    <option>Rent</option>
                                                </select>
                                            </>
                                        )}
                                    </div>
                                    <div className="col-12 form-group-custom mb-0">
                                        <label className="form-label-custom">Description</label>
                                        <textarea className="filter-input" rows="2" defaultValue={selectedTxn?.desc || ''} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button className="btn btn-primary-custom w-100 py-3 rounded-3" onClick={closeModal}>Update Transaction</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Received Modal */}
            {activeModal === 'addReceived' && (
                <div className="modal fade show d-block transaction-modal" tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title">
                                    <span className="icon-circle bg-success-soft text-success me-2">
                                        <i className="bi bi-plus-lg"></i>
                                    </span>
                                    Receive Money (Income)
                                </h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body pt-3">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Select Company <span className="text-danger">*</span></label>
                                        <select className="filter-input">
                                            <option value="">Select Company</option>
                                            <option value="PVT">PVT</option>
                                            <option value="LLP">LLP</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Select Account <span className="text-danger">*</span></label>
                                        <select className="filter-input">
                                            <option value="">Select Account</option>
                                            <option value="HDFC">HDFC Bank</option>
                                            <option value="SBI">SBI Bank</option>
                                        </select>
                                        <div className="text-muted small mt-1">Available Balance: <strong className="text-success">₹1,50,000</strong></div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label-custom">Received From <span className="text-danger">*</span></label>
                                        <input type="text" className="filter-input" placeholder="Client Name or External Party" list="externalParties" />
                                        <datalist id="externalParties">
                                            <option value="Client A" />
                                            <option value="Google Cloud" />
                                            <option value="Office Supplies Co" />
                                        </datalist>
                                    </div>
                                    <div className="col-md-6 form-group-custom">
                                        <label className="form-label-custom">Amount <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">₹</span>
                                            <input type="number" className="filter-input border-start-0" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Date</label>
                                        <input type="date" className="filter-input" defaultValue={today} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Payment Mode</label>
                                        <select className="filter-input"><option>Online</option><option>Cash</option><option>Cheque</option><option>DD</option></select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Reference</label>
                                        <input type="text" className="filter-input" placeholder="Ref No." />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label-custom">Description</label>
                                        <textarea className="filter-input" rows="2" placeholder="Optional details..."></textarea>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button className="btn btn-transaction btn-income w-100 py-3 rounded-3" onClick={closeModal}>Save Transaction</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Paid Modal */}
            {activeModal === 'addPaid' && (
                <div className="modal fade show d-block transaction-modal" tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title">
                                    <span className="icon-circle bg-danger-soft text-danger me-2">
                                        <i className="bi bi-dash-lg"></i>
                                    </span>
                                    Pay Money (Expense)
                                </h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body pt-3">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Company</label>
                                        <select className="filter-input"><option>Acme Corp</option><option>Global Tech</option></select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">From Account</label>
                                        <select className="filter-input"><option>ICICI Bank</option><option>Main Cash</option></select>
                                    </div>
                                    <div className="col-md-12">
                                        <label className="form-label-custom">Paid To <span className="text-danger">*</span></label>
                                        <input type="text" className="filter-input" placeholder="Vendor or Person name" required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Amount</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">Rs.</span>
                                            <input type="number" className="filter-input border-start-0" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Category / Purpose</label>
                                        <select className="filter-input"><option>Salary</option><option>Rent</option><option>Utilities</option><option>Marketing</option></select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Date</label>
                                        <input type="date" className="filter-input" defaultValue={today} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Payment Mode</label>
                                        <select className="filter-input"><option>Online</option><option>Cash</option><option>Cheque</option><option>DD</option></select>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label-custom">Description</label>
                                        <textarea className="filter-input" rows="2" placeholder="Expense details..."></textarea>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button className="btn btn-transaction btn-expense w-100 py-3 rounded-3" onClick={closeModal}>Confirm Payment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Money Modal (Moved) */}
            {activeModal === 'transferMoney' && (
                <div className="modal fade show d-block transaction-modal" tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content overflow-hidden">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title fw-bold">
                                    <span className="icon-circle bg-primary-soft text-primary me-2">
                                        <i className="bi bi-arrow-left-right"></i>
                                    </span>
                                    Move Money (Transfer)
                                </h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="transfer-flow-container position-relative mb-4">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-md-12">
                                            <div className="transfer-card from-card mb-3">
                                                <span className="card-badge from">SOURCE</span>
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom">Company <span className="text-danger">*</span></label>
                                                        <select className="filter-input">
                                                            <option value="">Select</option>
                                                            <option value="PVT">PVT</option>
                                                            <option value="LLP">LLP</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom">Account <span className="text-danger">*</span></label>
                                                        <select className="filter-input">
                                                            <option value="">Select</option>
                                                            <option value="HDFC">HDFC Bank</option>
                                                        </select>
                                                        <div className="text-muted small mt-1">Available Balance: <strong className="text-primary">₹5,00,000</strong></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="transfer-arrow-icon text-center">
                                                <i className="bi bi-arrow-down-circle-fill text-primary" style={{ fontSize: '1.5rem' }}></i>
                                            </div>

                                            <div className="transfer-card to-card mt-3">
                                                <span className="card-badge to">DESTINATION</span>
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom">Company <span className="text-danger">*</span></label>
                                                        <select className="filter-input">
                                                            <option value="">Select</option>
                                                            <option value="LLP">LLP</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label-custom">Account <span className="text-danger">*</span></label>
                                                        <select className="filter-input">
                                                            <option value="">Select</option>
                                                            <option value="SBI">SBI Bank</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="text-danger small mt-2" style={{ display: 'none' }}><i className="bi bi-exclamation-triangle"></i> ⚠ Source and destination cannot be the same</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6 form-group-custom">
                                        <label className="form-label-custom">Amount <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">₹</span>
                                            <input type="number" className="filter-input border-start-0" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Transfer Date</label>
                                        <input type="date" className="filter-input" defaultValue={today} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label-custom">Reason / Description</label>
                                        <textarea className="filter-input" rows="2" placeholder="Why are you moving this money?"></textarea>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <button className="btn btn-transaction btn-transfer w-100 py-3 rounded-3" onClick={closeModal}>Confirm Transfer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

export default TransactionsPage;