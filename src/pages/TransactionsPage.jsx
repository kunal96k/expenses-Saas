import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination';
import { apiService } from '../services/api';
import './TransactionsPage.css';

const TransactionsPage = ({ activePage, setActivePage, userRole, mastersData, accounts: accountsFromProps }) => {
    // State for Tabs
    const [activeTab, setActiveTab] = useState('all');

    // State for Filters
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        company: 'all',
        accounts: [], // IDs
        type: 'all',
        search: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [totalElements, setTotalElements] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Data State
    const [transactions, setTransactions] = useState([]);

    // Dropdown State
    const [isAccountsOpen, setIsAccountsOpen] = useState(false);

    const allCompanies = useMemo(() => mastersData?.company || [], [mastersData]);
    const activeCompanies = useMemo(() => allCompanies.filter(c => c.status === 'Active'), [allCompanies]);
    
    const [fallbackAccounts, setFallbackAccounts] = useState([]);
    const allAccounts = useMemo(() => {
        const merged = [...(fallbackAccounts || []), ...(accountsFromProps || [])];
        const byId = new Map();
        merged.forEach(acc => {
            if (acc?.id != null) byId.set(acc.id, acc);
        });
        return Array.from(byId.values());
    }, [accountsFromProps, fallbackAccounts]);
    const activeAccounts = useMemo(() => allAccounts.filter(a => a.status === 'Active'), [allAccounts]);
    
    const allCategories = useMemo(() => mastersData?.category || [], [mastersData]);
    const activeCategories = useMemo(() => allCategories.filter(c => c.status === 'Active'), [allCategories]);
    
    const allModes = useMemo(() => mastersData?.paymentMode || [], [mastersData]);
    const activeModes = useMemo(() => allModes.filter(m => m.status === 'Active'), [allModes]);
    const tabToTxnType = { all: 'all', received: 'Received', paid: 'Paid', moved: 'Moved' };

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage - 1,
                size: itemsPerPage,
                search: filters.search,
                type: filters.type !== 'all' ? filters.type : tabToTxnType[activeTab],
                sortBy: 'date',
                direction: 'desc'
            });

            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.company !== 'all') params.append('companyId', filters.company);
            if (filters.accounts.length > 0) {
                filters.accounts.forEach(id => params.append('accountIds', id));
            }

            const response = await apiService.get(`/transactions?${params.toString()}`);
            setTransactions(response.content || []);
            setTotalElements(response.totalElements || 0);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            // Swal.fire('Error', 'Failed to load transactions.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAccountsFallback = async () => {
        try {
            const response = await apiService.getAllPages('/accounts');
            setFallbackAccounts(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error('Error fetching accounts fallback:', error);
            setFallbackAccounts([]);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [currentPage, itemsPerPage, filters, activeTab]);

    useEffect(() => {
        fetchAccountsFallback();
    }, []);

    const toggleAccount = (accId) => {
        setFilters(prev => {
            const current = [...prev.accounts];
            if (current.includes(accId)) {
                return { ...prev, accounts: current.filter(a => a !== accId) };
            } else {
                return { ...prev, accounts: [...current, accId] };
            }
        });
    };

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

    // State for Modals
    const [activeModal, setActiveModal] = useState(null);
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [formValues, setFormValues] = useState(null);
    const [persistedFields, setPersistedFields] = useState({
        paymentModeId: '',
        reference: '',
        description: '',
        categoryId: '',
        status: 'Completed'
    });

    useEffect(() => {
        if (activePage === 'add-income') openModal('addReceived');
        else if (activePage === 'add-expense') openModal('addPaid');
        else if (activePage === 'transfer-money') openModal('transferMoney');
        else setActiveModal(null);
    }, [activePage]);

    const openModal = (modalName, txn = null) => {
        setSelectedTxn(txn);
        if (txn) {
            setFormValues({
                id: txn.id,
                date: txn.date,
                type: txn.type,
                fromAccountId: txn.fromAccountId || '',
                fromExternal: txn.fromExternal || '',
                toAccountId: txn.toAccountId || '',
                toExternal: txn.toExternal || '',
                amount: txn.amount,
                paymentModeId: txn.paymentModeId || '',
                reference: txn.reference || '',
                description: txn.description || '',
                categoryId: txn.categoryId || '',
                status: txn.status || 'Completed'
            });
        } else {
            setFormValues({
                date: new Date().toISOString().split('T')[0],
                type: modalName === 'addReceived' ? 'Received' : (modalName === 'addPaid' ? 'Paid' : 'Moved'),
                fromAccountId: '',
                fromExternal: '',
                toAccountId: '',
                toExternal: '',
                amount: '',
                paymentModeId: persistedFields.paymentModeId,
                reference: persistedFields.reference,
                description: persistedFields.description,
                categoryId: persistedFields.categoryId,
                status: persistedFields.status
            });
        }
        setActiveModal(modalName);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedTxn(null);
        setFormValues(null);
    };

    const handleSaveTransaction = async () => {
        if (!formValues.amount || !formValues.date) {
            Swal.fire('Validation Error', 'Amount and Date are required.', 'error');
            return;
        }
        const amountValue = Number(formValues.amount || 0);
        if (amountValue <= 0) {
            Swal.fire('Validation Error', 'Amount must be greater than zero.', 'error');
            return;
        }

        if (!formValues.paymentModeId) {
            Swal.fire('Validation Error', 'Payment Mode is required.', 'error');
            return;
        }

        if (formValues.type === 'Received') {
            if (!formValues.fromExternal && !formValues.fromAccountId) {
                Swal.fire('Validation Error', 'Source (Account or External Party) is required.', 'error');
                return;
            }
            if (!formValues.toAccountId) {
                Swal.fire('Validation Error', 'Destination Account is required.', 'error');
                return;
            }
        } else if (formValues.type === 'Paid') {
            if (!formValues.fromAccountId) {
                Swal.fire('Validation Error', 'Source Account is required.', 'error');
                return;
            }
            if (!formValues.toExternal && !formValues.toAccountId) {
                Swal.fire('Validation Error', 'Destination (Account or External Party) is required.', 'error');
                return;
            }
        } else if (formValues.type === 'Moved') {
            if (!formValues.fromAccountId || !formValues.toAccountId) {
                Swal.fire('Validation Error', 'Both Source and Destination accounts are required for a transfer.', 'error');
                return;
            }
            if (String(formValues.fromAccountId) === String(formValues.toAccountId)) {
                Swal.fire('Validation Error', 'Source and Destination accounts cannot be the same.', 'error');
                return;
            }
        }

        if ((formValues.type === 'Paid' || formValues.type === 'Moved') && formValues.fromAccountId) {
            const sourceAccount = allAccounts.find(a => String(a.id) === String(formValues.fromAccountId));
            const sourceBalance = Number(sourceAccount?.balance || 0);
            if (sourceBalance < amountValue) {
                Swal.fire(
                    'Insufficient Balance',
                    `Not enough money in "${sourceAccount?.name || 'selected account'}". Available: ₹${sourceBalance.toLocaleString('en-IN')}, Required: ₹${amountValue.toLocaleString('en-IN')}.`,
                    'warning'
                );
                return;
            }
        }

        const payload = {
            ...formValues,
            amount: amountValue,
            fromAccountId: formValues.fromAccountId ? Number(formValues.fromAccountId) : null,
            toAccountId: formValues.toAccountId ? Number(formValues.toAccountId) : null,
            paymentModeId: formValues.paymentModeId ? Number(formValues.paymentModeId) : null,
            categoryId: formValues.categoryId ? Number(formValues.categoryId) : null
        };

        setIsActionLoading(true);
        try {
            if (formValues.id) {
                await apiService.put(`/transactions/${formValues.id}`, payload);
                Swal.fire({ icon: 'success', title: 'Updated!', text: 'Transaction updated successfully.', timer: 1500, showConfirmButton: false });
            } else {
                await apiService.post('/transactions', payload);
                setPersistedFields({
                    paymentModeId: formValues.paymentModeId || '',
                    reference: formValues.reference || '',
                    description: formValues.description || '',
                    categoryId: formValues.categoryId || '',
                    status: formValues.status || 'Completed'
                });
                Swal.fire({ icon: 'success', title: 'Saved!', text: 'Transaction saved successfully.', timer: 1500, showConfirmButton: false });
            }
            fetchTransactions();
            if (typeof refreshGlobalMasters === 'function') refreshGlobalMasters();
            closeModal();
        } catch (error) {
            console.error('Error saving transaction:', error);
            const isValidation = !!error.errors;
            const errorMsg = error.errors 
                ? Object.values(error.errors).map(msg => `• ${msg}`).join('<br/>') 
                : (error.message || 'Failed to save transaction.');

            Swal.fire({
                title: isValidation ? 'Validation Error' : 'Transaction Error',
                html: `<div class="text-start">${errorMsg}</div>`,
                icon: 'error'
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Transaction?',
            html: '<div class="text-start">This will <strong>reverse the balance</strong> changes made by this transaction.<br/><br/>This action cannot be undone!</div>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiService.delete(`/transactions/${id}`);
                    fetchTransactions();
                    if (typeof refreshGlobalMasters === 'function') refreshGlobalMasters();
                    Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Transaction removed and balances restored.', timer: 1500, showConfirmButton: false });
                } catch (error) {
                    console.error('Error deleting transaction:', error);
                    const errorMsg = error.status === 409 
                        ? 'This transaction is linked to other records and cannot be deleted.'
                        : (error.message || 'Failed to delete transaction.');
                    Swal.fire('Error', errorMsg, 'error');
                }
            }
        });
    };

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
                            {activeCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                    {activeAccounts.map(acc => (
                                        <div key={acc.id} className="dropdown-option" onClick={() => toggleAccount(acc.id)}>
                                            <div className="form-check d-flex align-items-center m-0 w-100 custom-check">
                                                <input className="form-check-input me-2 shadow-none border-secondary" type="checkbox" checked={filters.accounts.includes(acc.id)} readOnly style={{ cursor: 'pointer' }} />
                                                <label className="form-check-label w-100 text-dark" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>{acc.name} ({acc.companyName})</label>
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

            {isLoading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Transactions List — Card Format for Mobile */}
                    <div className="d-block d-md-none">
                        <div className="transaction-cards-wrap">
                            {transactions.map(txn => {
                                const isIncome = txn.type === 'Received';
                                const isExpense = txn.type === 'Paid';

                                return (
                                    <div key={txn.id} className="txn-mobile-card" onClick={() => openModal('viewTransaction', txn)}>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div className="pe-2">
                                                <div className="txn-desc fw-bold" title={txn.description}>{txn.description?.length > 15 ? txn.description.substring(0, 15) + '...' : (txn.description || 'No Description')}</div>
                                                <div className="text-muted small-text">{txn.date} • <span className="opacity-75">TXT{String(txn.id).padStart(6, '0')}</span></div>
                                            </div>
                                            <div className={`txn-amount text-end fw-bold ${isIncome ? 'text-success' : isExpense ? 'text-danger' : 'text-primary'}`}>
                                                {isExpense ? '-' : '+'}₹{(txn.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>

                                        <div className="txn-movement mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="movement-point">
                                                    <span className="company-tag">{txn.fromCompanyName || 'External'}</span>
                                                    <span className="account-tag">{txn.fromAccountName || txn.fromExternal}</span>
                                                </div>
                                                <i className="bi bi-arrow-right text-muted px-1"></i>
                                                <div className="movement-point">
                                                    <span className="company-tag">{txn.toCompanyName || 'External'}</span>
                                                    <span className="account-tag">{txn.toAccountName || txn.toExternal}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex flex-wrap gap-2">
                                            <span className={`txn-pill pill-${txn.type.toLowerCase()}`}>{txn.type}</span>
                                            <span className="txn-pill pill-light">{txn.paymentModeName}</span>
                                            {txn.reference && <span className="txn-pill pill-light">Ref: {txn.reference}</span>}
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
                                {transactions.map(txn => (
                                    <tr key={txn.id} className="transaction-row">
                                        <td data-label="Date">{txn.date}</td>
                                        <td data-label="Type">
                                            <span className={`badge-type badge-${txn.type === 'Received' ? 'income' : txn.type === 'Paid' ? 'expense' : 'transfer'}`}>
                                                {txn.type}
                                            </span>
                                        </td>
                                        <td data-label="From Source">
                                            <div className="account-info">
                                                <span className={`company-name ${!txn.fromCompanyName ? 'text-external' : ''}`}>{txn.fromCompanyName || 'External'}</span>
                                                <span className="account-name">{txn.fromAccountName || txn.fromExternal}</span>
                                            </div>
                                        </td>
                                        <td data-label="To Destination" className="position-relative">
                                            <i className="bi bi-arrow-right text-light position-absolute start-0 top-50 translate-middle-y" style={{ left: '-12px', opacity: 0.5, fontSize: '0.8rem' }}></i>
                                            <div className="account-info">
                                                <span className={`company-name ${!txn.toCompanyName ? 'text-external' : ''}`}>{txn.toCompanyName || 'External'}</span>
                                                <span className="account-name">{txn.toAccountName || txn.toExternal}</span>
                                            </div>
                                        </td>
                                        <td data-label="Amount">
                                            <span className={`amount-cell amount-${txn.type === 'Received' ? 'income' : txn.type === 'Paid' ? 'expense' : 'transfer'}`}>
                                                {txn.type === 'Paid' ? '-' : '+'}₹{(txn.amount || 0).toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                        <td data-label="Mode">{txn.paymentModeName}</td>
                                        <td data-label="Reference">
                                            <code className="text-muted small d-block mb-1">{txn.reference || '-'}</code>
                                            <code className="x-small text-primary opacity-75">TXT{String(txn.id).padStart(6, '0')}</code>
                                        </td>
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
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4 text-muted">No transactions found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Component */}
                    <div className="mb-5">
                        <Pagination
                            totalItems={totalElements}
                            itemsPerPage={itemsPerPage}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(val) => {
                                setItemsPerPage(val);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </>
            )}

            {/* Modals */}
            {activeModal && (
                <TransactionModals 
                    activeModal={activeModal} 
                    selectedTxn={selectedTxn} 
                    closeModal={closeModal} 
                    loading={isActionLoading}
                    onGoToAddAccount={() => {
                        closeModal();
                        if (setActivePage) setActivePage('add-account');
                    }}
                    formValues={formValues}
                    setFormValues={setFormValues}
                    handleSave={handleSaveTransaction}
                    allCompanies={allCompanies}
                    allAccounts={allAccounts}
                    allCategories={allCategories}
                    allModes={allModes}
                    activeCompanies={activeCompanies}
                    activeAccounts={activeAccounts}
                    activeCategories={activeCategories}
                    activeModes={activeModes}
                />
            )}
        </div>
    );
};

// Sub-component for Modals
const TransactionModals = ({ 
    activeModal, 
    closeModal, 
    onGoToAddAccount,
    formValues, 
    setFormValues, 
    handleSave,
    activeCompanies,
    activeAccounts,
    activeCategories,
    activeModes,
    allCompanies,
    allAccounts,
    allCategories,
    allModes,
    loading: isActionLoading
}) => {
    if (!activeModal) return null;

    const handleChange = (field, value) => {
        setFormValues(prev => ({ ...prev, [field]: value }));
    };

    return (
        <>
            <div className="modal-backdrop fade show"></div>

            {/* View Transaction Modal */}
            {activeModal === 'viewTransaction' && (
                <div className="modal fade show d-block transaction-modal" tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-light border-0">
                                <h5 className="modal-title fw-bold">Transaction Details</h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="d-flex justify-content-between mb-4">
                                    <div>
                                        <p className="text-muted small mb-0">Status</p>
                                        <span className={`badge ${formValues.status === 'Completed' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} px-3 py-2 rounded-pill`}>
                                            {formValues.status}
                                        </span>
                                    </div>
                                    <div className="text-end">
                                        <p className="text-muted small mb-0">Amount</p>
                                        <h4 className="fw-bold mb-0">₹{(formValues.amount || 0).toLocaleString('en-IN')}</h4>
                                    </div>
                                </div>
                                <div className="row g-4">
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">Date</p>
                                        <p className="fw-semibold mb-0">{formValues.date}</p>
                                    </div>
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">Type</p>
                                        <p className={`fw-semibold mb-0 ${formValues.type === 'Received' ? 'text-success' : formValues.type === 'Paid' ? 'text-danger' : 'text-primary'}`}>
                                            {formValues.type}
                                        </p>
                                    </div>
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">From Source</p>
                                        <p className="fw-semibold mb-0">{activeAccounts.find(a => a.id === Number(formValues.fromAccountId))?.companyName || 'External'}</p>
                                        <p className="text-muted small">{activeAccounts.find(a => a.id === Number(formValues.fromAccountId))?.name || formValues.fromExternal || '-'}</p>
                                    </div>
                                    <div className="col-6">
                                        <p className="text-muted small mb-1">To Destination</p>
                                        <p className="fw-semibold mb-0">{activeAccounts.find(a => a.id === Number(formValues.toAccountId))?.companyName || 'External'}</p>
                                        <p className="text-muted small">{activeAccounts.find(a => a.id === Number(formValues.toAccountId))?.name || formValues.toExternal || '-'}</p>
                                    </div>
                                    <div className="col-12 border-top pt-3">
                                        <p className="text-muted small mb-1">Description</p>
                                        <p className="mb-0">{formValues.description || 'No description provided.'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Transaction Modal */}
            {['addReceived', 'addPaid', 'transferMoney', 'editTransaction'].includes(activeModal) && (
                <div className="modal fade show d-block transaction-modal" tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold">
                                    <span className={`icon-circle ${formValues.type === 'Received' ? 'bg-success-soft text-success' : formValues.type === 'Paid' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'} me-2`}>
                                        <i className={`bi ${formValues.type === 'Received' ? 'bi-plus-lg' : formValues.type === 'Paid' ? 'bi-dash-lg' : 'bi-arrow-left-right'}`}></i>
                                    </span>
                                    {formValues.id ? 'Edit' : 'New'} {formValues.type}
                                </h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body p-4 pt-3">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Date <span className="text-danger">*</span></label>
                                        <input type="date" className="filter-input" value={formValues.date} onChange={e => handleChange('date', e.target.value)} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Amount <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">₹</span>
                                            <input type="number" className="filter-input border-start-0" value={formValues.amount} onChange={e => handleChange('amount', e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>

                                    {/* Source Section */}
                                    <div className="col-md-12">
                                        <div className="transfer-card from-card p-3">
                                            <span className="card-badge from">SOURCE / FROM</span>
                                            <div className="row g-3">
                                                {formValues.type === 'Received' ? (
                                                    <div className="col-12">
                                                        <label className="form-label-custom">Received From (External Party) <span className="text-danger">*</span></label>
                                                        <input type="text" className="filter-input" value={formValues.fromExternal} onChange={e => handleChange('fromExternal', e.target.value)} placeholder="e.g. Client Name, Party Name" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="col-md-6">
                                                            <label className="form-label-custom">Source Account <span className="text-danger">*</span></label>
                                                            <select className="filter-input" value={formValues.fromAccountId} onChange={e => handleChange('fromAccountId', e.target.value)}>
                                                                <option value="">
                                                                    {activeAccounts.length === 0 ? 'No active accounts found. Create an account first.' : 'Select Account'}
                                                                </option>
                                                                {allAccounts.map(a => (
                                                                    <option key={a.id} value={a.id}>
                                                                        {a.name} ({a.companyName}) {a.status === 'Inactive' ? '(Inactive)' : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {activeAccounts.length === 0 && (
                                                                <div className="small text-danger mt-1">
                                                                    No active accounts found. Create an account first.
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link btn-sm p-0 ms-2 align-baseline"
                                                                        onClick={onGoToAddAccount}
                                                                    >
                                                                        Go to Add Account
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-md-6 d-flex align-items-end">
                                                            <div className="text-muted small mb-2">
                                                                Balance: <strong className="text-primary">₹{(allAccounts.find(a => String(a.id) === String(formValues.fromAccountId))?.balance || 0).toLocaleString('en-IN')}</strong>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Destination Section */}
                                    <div className="col-md-12">
                                        <div className="transfer-card to-card p-3">
                                            <span className="card-badge to">DESTINATION / TO</span>
                                            <div className="row g-3">
                                                {formValues.type === 'Paid' ? (
                                                    <div className="col-12">
                                                        <label className="form-label-custom">Paid To (Vendor/Expense) <span className="text-danger">*</span></label>
                                                        <input type="text" className="filter-input" value={formValues.toExternal} onChange={e => handleChange('toExternal', e.target.value)} placeholder="e.g. Vendor Name, Employee Name" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="col-md-6">
                                                            <label className="form-label-custom">Destination Account <span className="text-danger">*</span></label>
                                                            <select className="filter-input" value={formValues.toAccountId} onChange={e => handleChange('toAccountId', e.target.value)}>
                                                                <option value="">
                                                                    {activeAccounts.length === 0 ? 'No active accounts found. Create an account first.' : 'Select Account'}
                                                                </option>
                                                                {allAccounts.map(a => (
                                                                    <option key={a.id} value={a.id}>
                                                                        {a.name} ({a.companyName}) {a.status === 'Inactive' ? '(Inactive)' : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {activeAccounts.length === 0 && (
                                                                <div className="small text-danger mt-1">
                                                                    No active accounts found. Create an account first.
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link btn-sm p-0 ms-2 align-baseline"
                                                                        onClick={onGoToAddAccount}
                                                                    >
                                                                        Go to Add Account
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-md-6 d-flex align-items-end">
                                                            <div className="text-muted small mb-2">
                                                                Balance: <strong className="text-success">₹{(allAccounts.find(a => String(a.id) === String(formValues.toAccountId))?.balance || 0).toLocaleString('en-IN')}</strong>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label-custom">Payment Mode</label>
                                        <select className="filter-input" value={formValues.paymentModeId} onChange={e => handleChange('paymentModeId', e.target.value)}>
                                            <option value="">Select Mode</option>
                                            {allModes.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} {m.status === 'Inactive' ? '(Inactive)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Category / Purpose</label>
                                        <select className="filter-input" value={formValues.categoryId} onChange={e => handleChange('categoryId', e.target.value)}>
                                            <option value="">Select Category</option>
                                            {allCategories.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} {c.status === 'Inactive' ? '(Inactive)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Reference No.</label>
                                        <input type="text" className="filter-input" value={formValues.reference} onChange={e => handleChange('reference', e.target.value)} placeholder="e.g. Cheque No, Transaction ID" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-custom">Status</label>
                                        <select className="filter-input" value={formValues.status} onChange={e => handleChange('status', e.target.value)}>
                                            <option value="Completed">Completed</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label-custom">Description</label>
                                        <textarea className="filter-input" rows="2" value={formValues.description} onChange={e => handleChange('description', e.target.value)} placeholder="Transaction details..."></textarea>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button className="btn btn-primary-custom w-100 py-3 rounded-3" onClick={handleSave} disabled={isActionLoading}>
                                        {isActionLoading ? (
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        ) : null}
                                        {formValues.id ? 'Update' : 'Confirm'} {formValues.type}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TransactionsPage;