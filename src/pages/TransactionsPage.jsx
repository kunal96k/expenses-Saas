import React, { useState, useMemo, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Pagination from '../components/Pagination';
import { apiService } from '../services/api';
import './TransactionsPage.css';
import '../views/DashboardView.css';

const TransactionsPage = ({ activePage, setActivePage, userRole, mastersData, accounts: accountsFromProps }) => {
    // State for Tabs
    const [activeTab, setActiveTab] = useState('all');

    // State for Search & Debounce
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // State for Filters
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        companies: [], // IDs (empty = all)
        accounts: [],  // IDs (empty = all)
        type: 'all'
    });

    // Sorting State
    const [sortBy, setSortBy] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [totalElements, setTotalElements] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Data State
    const [transactions, setTransactions] = useState([]);
    const requestSeqRef = useRef(0);

    // Dropdown States & Refs
    const [isCompanyOpen, setIsCompanyOpen] = useState(false);
    const [isAccountsOpen, setIsAccountsOpen] = useState(false);
    const [companySearch, setCompanySearch] = useState('');
    const [accountSearch, setAccountSearch] = useState('');

    const companyDropdownRef = useRef(null);
    const accountDropdownRef = useRef(null);

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

    // Close dropdowns on outside click
    useEffect(() => {
        const handleOutside = (e) => {
            if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target)) {
                setIsCompanyOpen(false);
            }
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) {
                setIsAccountsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // Filtered accounts available based on selected companies
    const filteredActiveAccounts = useMemo(() => {
        if (filters.companies.length === 0 || filters.companies.length === activeCompanies.length) {
            return activeAccounts;
        }
        return activeAccounts.filter(a => filters.companies.includes(Number(a.companyId)));
    }, [activeAccounts, activeCompanies.length, filters.companies]);

    // Clean up selected accounts when selected companies change
    useEffect(() => {
        if (filters.companies.length === 0 || filters.companies.length === activeCompanies.length) return;
        const validIds = new Set(filteredActiveAccounts.map(a => Number(a.id)));
        setFilters(prev => {
            const filtered = prev.accounts.filter(id => validIds.has(Number(id)));
            if (filtered.length !== prev.accounts.length) {
                return { ...prev, accounts: filtered };
            }
            return prev;
        });
    }, [filters.companies, filteredActiveAccounts, activeCompanies.length]);

    // Company Checkbox Helpers
    const allCompanyIds = useMemo(() => activeCompanies.map(c => Number(c.id)), [activeCompanies]);
    const isAllCompaniesChecked = useMemo(() => {
        if (activeCompanies.length === 0) return false;
        return filters.companies.length === 0 || allCompanyIds.every(id => filters.companies.includes(id));
    }, [activeCompanies.length, allCompanyIds, filters.companies]);

    const toggleSelectAllCompanies = () => {
        if (isAllCompaniesChecked) {
            setFilters(prev => ({ ...prev, companies: [-1], accounts: [] }));
        } else {
            setFilters(prev => ({ ...prev, companies: [], accounts: [] }));
        }
    };

    const toggleCompany = (compId) => {
        const idNum = Number(compId);
        setFilters(prev => {
            let current = prev.companies.length === 0 ? [...allCompanyIds] : (prev.companies.includes(-1) ? [] : [...prev.companies]);
            if (current.includes(idNum)) {
                current = current.filter(id => id !== idNum);
            } else {
                current.push(idNum);
            }
            if (current.length === 0) current = [-1];
            else if (current.length === activeCompanies.length) current = [];
            return { ...prev, companies: current };
        });
    };

    const selectOnlyCompany = (compId, e) => {
        e.stopPropagation();
        setFilters(prev => ({ ...prev, companies: [Number(compId)] }));
    };

    // Account Checkbox Helpers
    const availableAccountIds = useMemo(() => filteredActiveAccounts.map(a => Number(a.id)), [filteredActiveAccounts]);
    const isAllAccountsChecked = useMemo(() => {
        if (availableAccountIds.length === 0) return false;
        return filters.accounts.length === 0 || availableAccountIds.every(id => filters.accounts.includes(id));
    }, [availableAccountIds, filters.accounts]);

    const toggleSelectAllAccounts = () => {
        if (isAllAccountsChecked) {
            setFilters(prev => ({ ...prev, accounts: [-1] }));
        } else {
            setFilters(prev => ({ ...prev, accounts: [] }));
        }
    };

    const toggleAccount = (accId) => {
        const idNum = Number(accId);
        setFilters(prev => {
            let current = prev.accounts.length === 0 ? [...availableAccountIds] : (prev.accounts.includes(-1) ? [] : [...prev.accounts]);
            if (current.includes(idNum)) {
                current = current.filter(id => id !== idNum);
            } else {
                current.push(idNum);
            }
            if (current.length === 0) current = [-1];
            else if (current.length === availableAccountIds.length) current = [];
            return { ...prev, accounts: current };
        });
    };

    const selectOnlyAccount = (accId, e) => {
        e.stopPropagation();
        setFilters(prev => ({ ...prev, accounts: [Number(accId)] }));
    };

    // Trigger button display labels
    const companyButtonSummary = useMemo(() => {
        if (activeCompanies.length === 0) return 'Loading companies...';
        if (isAllCompaniesChecked || filters.companies.length === 0) return 'All Companies';
        if (filters.companies.includes(-1)) return '0 Companies Selected';
        if (filters.companies.length === 1) {
            const found = activeCompanies.find(c => Number(c.id) === filters.companies[0]);
            return found ? found.name : '1 Company Selected';
        }
        return `${filters.companies.length} Companies Selected`;
    }, [activeCompanies, isAllCompaniesChecked, filters.companies]);

    const accountButtonSummary = useMemo(() => {
        if (availableAccountIds.length === 0) return 'No Accounts Available';
        if (isAllAccountsChecked || filters.accounts.length === 0) return 'All Accounts';
        if (filters.accounts.includes(-1)) return '0 Accounts Selected';
        if (filters.accounts.length === 1) {
            const found = activeAccounts.find(a => Number(a.id) === filters.accounts[0]);
            return found ? found.name : '1 Account Selected';
        }
        return `${filters.accounts.length} Accounts Selected`;
    }, [availableAccountIds.length, isAllAccountsChecked, filters.accounts, activeAccounts]);

    const displayedCompanies = useMemo(() => {
        if (!companySearch.trim()) return activeCompanies;
        return activeCompanies.filter(c => c.name?.toLowerCase().includes(companySearch.toLowerCase()));
    }, [activeCompanies, companySearch]);

    const displayedAccounts = useMemo(() => {
        if (!accountSearch.trim()) return filteredActiveAccounts;
        return filteredActiveAccounts.filter(a => 
            a.name?.toLowerCase().includes(accountSearch.toLowerCase()) ||
            a.companyName?.toLowerCase().includes(accountSearch.toLowerCase())
        );
    }, [filteredActiveAccounts, accountSearch]);

    // 350ms Debounce on search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Automatically reset to page 1 whenever filters, search, or active tab change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filters.dateFrom, filters.dateTo, filters.companies, filters.accounts, filters.type, activeTab]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('desc');
        }
        setCurrentPage(1);
    };

    const fetchTransactions = async () => {
        const seq = ++requestSeqRef.current;
        setIsLoading(true);
        setFetchError(null);
        try {
            const params = new URLSearchParams({
                page: Math.max(0, currentPage - 1),
                size: itemsPerPage,
                search: debouncedSearch,
                type: filters.type !== 'all' ? filters.type : tabToTxnType[activeTab],
                sortBy: sortBy,
                direction: sortDirection
            });

            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);

            const isAllCompanies = filters.companies.length === 0 || filters.companies.length === activeCompanies.length;
            const isAllAccounts = filters.accounts.length === 0 || filters.accounts.length === filteredActiveAccounts.length;

            if (!isAllAccounts) {
                if (filters.accounts.includes(-1) || filters.accounts.length === 0) {
                    params.append('accountIds', '-999999');
                } else {
                    filters.accounts.forEach(id => params.append('accountIds', id));
                }
            } else if (!isAllCompanies) {
                if (filters.companies.includes(-1) || filters.companies.length === 0) {
                    params.append('accountIds', '-999999');
                } else if (filters.companies.length === 1) {
                    params.append('companyId', String(filters.companies[0]));
                } else {
                    const compAccountIds = activeAccounts
                        .filter(a => filters.companies.includes(Number(a.companyId)))
                        .map(a => a.id);
                    if (compAccountIds.length > 0) {
                        compAccountIds.forEach(id => params.append('accountIds', id));
                    } else {
                        params.append('accountIds', '-999999');
                    }
                }
            }

            const response = await apiService.get(`/transactions?${params.toString()}`);
            if (seq === requestSeqRef.current) {
                const content = response?.content || (Array.isArray(response) ? response : []);
                const total = response?.page?.totalElements != null
                    ? Number(response.page.totalElements)
                    : (response?.totalElements != null
                        ? Number(response.totalElements)
                        : content.length);
                setTransactions(content);
                setTotalElements(total);
            }
        } catch (error) {
            if (seq === requestSeqRef.current) {
                console.error('Error fetching transactions:', error);
                setFetchError(error?.message || 'Failed to load transactions. Please check connection.');
                setTransactions([]);
                setTotalElements(0);
            }
        } finally {
            if (seq === requestSeqRef.current) {
                setIsLoading(false);
            }
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
    }, [currentPage, itemsPerPage, debouncedSearch, filters, activeTab, sortBy, sortDirection]);

    useEffect(() => {
        fetchAccountsFallback();
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
        setSearchInput('');
        setDebouncedSearch('');
        setFilters({
            dateFrom: '',
            dateTo: '',
            companies: [],
            accounts: [],
            type: 'all'
        });
        setActiveTab('all');
        setSortBy('date');
        setSortDirection('desc');
        setCurrentPage(1);
        setCompanySearch('');
        setAccountSearch('');
        setIsCompanyOpen(false);
        setIsAccountsOpen(false);
    };

    const [isExporting, setIsExporting] = useState(false);

    const buildFilterSummary = () => {
        const dateRange = (filters.dateFrom || filters.dateTo)
            ? `${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}`
            : 'All Dates';

        const isAllCompanies = filters.companies.length === 0 || filters.companies.length === activeCompanies.length;
        const compLabel = isAllCompanies
            ? 'All Companies'
            : (filters.companies.includes(-1)
                ? 'None'
                : (filters.companies.length === 1
                    ? (activeCompanies.find(c => Number(c.id) === filters.companies[0])?.name || '1 Company')
                    : `${filters.companies.length} Companies`));

        const isAllAccounts = filters.accounts.length === 0 || filters.accounts.length === filteredActiveAccounts.length;
        const accLabel = isAllAccounts
            ? 'All Accounts'
            : (filters.accounts.includes(-1)
                ? 'None'
                : (filters.accounts.length === 1
                    ? (activeAccounts.find(a => Number(a.id) === filters.accounts[0])?.name || '1 Account')
                    : `${filters.accounts.length} Accounts`));

        const activeTxnType = filters.type !== 'all' ? filters.type : (tabToTxnType[activeTab] !== 'all' ? tabToTxnType[activeTab] : 'All Types');

        return {
            dateRange,
            compLabel,
            accLabel,
            activeTxnType,
            searchQuery: debouncedSearch || 'None'
        };
    };

    const fetchAllFilteredTransactions = async () => {
        const pageSize = 500;
        let allRows = [];
        let total = 0;

        const buildParams = (p) => {
            const params = new URLSearchParams({
                page: p,
                size: pageSize,
                search: debouncedSearch,
                type: filters.type !== 'all' ? filters.type : tabToTxnType[activeTab],
                sortBy: sortBy,
                direction: sortDirection
            });

            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);

            const isAllCompanies = filters.companies.length === 0 || filters.companies.length === activeCompanies.length;
            const isAllAccounts = filters.accounts.length === 0 || filters.accounts.length === filteredActiveAccounts.length;

            if (!isAllAccounts) {
                if (filters.accounts.includes(-1) || filters.accounts.length === 0) {
                    params.append('accountIds', '-999999');
                } else {
                    filters.accounts.forEach(id => params.append('accountIds', id));
                }
            } else if (!isAllCompanies) {
                if (filters.companies.includes(-1) || filters.companies.length === 0) {
                    params.append('accountIds', '-999999');
                } else if (filters.companies.length === 1) {
                    params.append('companyId', String(filters.companies[0]));
                } else {
                    const compAccountIds = activeAccounts
                        .filter(a => filters.companies.includes(Number(a.companyId)))
                        .map(a => a.id);
                    if (compAccountIds.length > 0) {
                        compAccountIds.forEach(id => params.append('accountIds', id));
                    } else {
                        params.append('accountIds', '-999999');
                    }
                }
            }
            return params;
        };

        const firstRes = await apiService.get(`/transactions?${buildParams(0).toString()}`);
        const firstContent = firstRes?.content || (Array.isArray(firstRes) ? firstRes : []);
        total = Number(firstRes?.page?.totalElements ?? firstRes?.totalElements ?? firstContent.length);
        const totalPages = Math.max(Number(firstRes?.page?.totalPages ?? firstRes?.totalPages ?? 0), total > 0 ? Math.ceil(total / pageSize) : 0);
        allRows.push(...firstContent);

        if (totalPages > 1) {
            for (let p = 1; p < totalPages; p++) {
                const nextRes = await apiService.get(`/transactions?${buildParams(p).toString()}`);
                const nextContent = nextRes?.content || (Array.isArray(nextRes) ? nextRes : []);
                allRows.push(...nextContent);
            }
        }
        return { rows: allRows, total };
    };

    const exportTransactionsExcel = async () => {
        setIsExporting(true);
        try {
            const { rows, total } = await fetchAllFilteredTransactions();
            if (!rows.length) {
                Swal.fire('No data', 'No transactions found matching the applied filters.', 'info');
                return;
            }

            const filterMeta = buildFilterSummary();
            const totalReceived = rows.filter(r => r.type === 'Received').reduce((s, r) => s + Number(r.amount || 0), 0);
            const totalPaid = rows.filter(r => r.type === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);
            const totalMoved = rows.filter(r => r.type === 'Moved').reduce((s, r) => s + Number(r.amount || 0), 0);

            const summaryData = [
                ['Metric / Filter', 'Value'],
                ['Total Filtered Records', total],
                ['Total Received (In)', totalReceived],
                ['Total Paid (Out)', totalPaid],
                ['Total Moved (Transfer)', totalMoved],
                ['Net Cash Flow (In - Out)', totalReceived - totalPaid],
                ['Applied Date Range', filterMeta.dateRange],
                ['Applied Company Filter', filterMeta.compLabel],
                ['Applied Account Filter', filterMeta.accLabel],
                ['Applied Type Filter', filterMeta.activeTxnType],
                ['Applied Search Query', filterMeta.searchQuery]
            ];

            const columns = ['Sr No.', 'Date', 'ID', 'Type', 'Description', 'From Source', 'To Destination', 'Category', 'Mode', 'Reference', 'Amount'];
            const tableRows = rows.map((r, idx) => ({
                'Sr No.': idx + 1,
                Date: r.date || '-',
                ID: `TXT${String(r.id).padStart(6, '0')}`,
                Type: r.type || '-',
                Description: r.description || '-',
                'From Source': r.fromAccountName ? `${r.fromAccountName} (${r.fromCompanyName || ''})` : (r.fromExternal || '-'),
                'To Destination': r.toAccountName ? `${r.toAccountName} (${r.toCompanyName || ''})` : (r.toExternal || '-'),
                Category: r.categoryName || '-',
                Mode: r.paymentModeName || '-',
                Reference: r.reference || '-',
                Amount: Number(r.amount || 0)
            }));

            const wb = XLSX.utils.book_new();
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            const tableSheet = XLSX.utils.json_to_sheet(tableRows, { header: columns });
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary & Filters');
            XLSX.utils.book_append_sheet(wb, tableSheet, 'Filtered Transactions');

            const dateStr = (filters.dateFrom || filters.dateTo) ? `${filters.dateFrom || 'start'}-to-${filters.dateTo || 'end'}` : 'all-dates';
            XLSX.writeFile(wb, `transactions-${dateStr}-filtered.xlsx`);
        } catch (err) {
            console.error('Error exporting transactions Excel:', err);
            Swal.fire('Export Error', err?.message || 'Failed to export Excel', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const exportTransactionsPdf = async () => {
        setIsExporting(true);
        try {
            const { rows, total } = await fetchAllFilteredTransactions();
            if (!rows.length) {
                Swal.fire('No data', 'No transactions found matching the applied filters.', 'info');
                return;
            }

            const filterMeta = buildFilterSummary();
            const totalReceived = rows.filter(r => r.type === 'Received').reduce((s, r) => s + Number(r.amount || 0), 0);
            const totalPaid = rows.filter(r => r.type === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);

            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            // Header band
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageW, 72, 'F');

            // Logo block
            doc.setFillColor(92, 103, 242);
            doc.roundedRect(30, 16, 38, 38, 4, 4, 'F');
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('T', 42, 41);

            // Title
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Financial Transactions - Filtered Audit', 80, 32);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(`Period: ${filterMeta.dateRange} | Scope: ${filterMeta.compLabel} / ${filterMeta.accLabel}`, 80, 46);

            const filterSubtitle = `Type: ${filterMeta.activeTxnType} | Search: "${filterMeta.searchQuery}"`;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(165, 180, 252);
            doc.text(`Applied Filters: ${filterSubtitle}`, 80, 59);

            // Generated timestamp
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 30, 30, { align: 'right' });
            doc.setFillColor(92, 103, 242);
            doc.roundedRect(pageW - 110, 40, 80, 16, 3, 3, 'F');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('FILTERED', pageW - 70, 51, { align: 'center' });

            // Summary cards
            const summaryCards = [
                ['Total Filtered', String(total)],
                ['Total Received', `INR ${totalReceived.toLocaleString('en-IN')}`],
                ['Total Paid', `INR ${totalPaid.toLocaleString('en-IN')}`],
                ['Net Flow', `INR ${(totalReceived - totalPaid).toLocaleString('en-IN')}`]
            ];

            let cardY = 90;
            const cols = summaryCards.length;
            const cardW = Math.min(150, (pageW - 60) / cols);
            const totalCardW = cols * cardW + (cols - 1) * 10;
            let cardX = (pageW - totalCardW) / 2;

            summaryCards.forEach(([label, value]) => {
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(cardX, cardY, cardW, 44, 4, 4, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.5);
                doc.roundedRect(cardX, cardY, cardW, 44, 4, 4, 'S');

                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(label.toUpperCase(), cardX + cardW / 2, cardY + 13, { align: 'center' });

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(value, cardX + cardW / 2, cardY + 30, { align: 'center' });

                cardX += cardW + 10;
            });

            // Table
            const columns = ['Sr No.', 'Date', 'ID', 'Type', 'Description', 'From Source', 'To Destination', 'Category', 'Mode', 'Reference', 'Amount'];
            const tableRows = rows.map((r, idx) => [
                idx + 1,
                r.date || '-',
                `TXT${String(r.id).padStart(6, '0')}`,
                r.type || '-',
                r.description ? (r.description.length > 25 ? r.description.slice(0, 25) + '...' : r.description) : '-',
                r.fromAccountName ? `${r.fromAccountName}` : (r.fromExternal || '-'),
                r.toAccountName ? `${r.toAccountName}` : (r.toExternal || '-'),
                r.categoryName || '-',
                r.paymentModeName || '-',
                r.reference || '-',
                Number(r.amount || 0).toLocaleString('en-IN')
            ]);

            doc.autoTable({
                head: [columns],
                body: tableRows,
                startY: cardY + 60,
                theme: 'plain',
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 7.5,
                    cellPadding: { top: 7, bottom: 7, left: 5, right: 5 }
                },
                bodyStyles: {
                    fontSize: 7.5,
                    cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
                    lineColor: [241, 245, 249],
                    lineWidth: { bottom: 0.5 },
                    textColor: [51, 65, 85]
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    10: { halign: 'right' }
                },
                margin: { left: 20, right: 20, top: 72, bottom: 30 }
            });

            const dateStr = (filters.dateFrom || filters.dateTo) ? `${filters.dateFrom || 'start'}-to-${filters.dateTo || 'end'}` : 'all-dates';
            doc.save(`transactions-${dateStr}-filtered.pdf`);
        } catch (err) {
            console.error('Error exporting transactions PDF:', err);
            Swal.fire('Export Error', err?.message || 'Failed to export PDF', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="transactions-container">
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                <div>
                    <h4 className="page-title mb-1" style={{ fontSize: '1.5rem' }}>Financial Transactions</h4>
                    <p className="text-muted small mb-0">Track and manage money movement across your business</p>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-sm btn-light border px-3" 
                            onClick={exportTransactionsPdf} 
                            disabled={isExporting || totalElements === 0} 
                            title="Export Filtered Transactions to PDF"
                        >
                            {isExporting ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-file-earmark-pdf text-danger me-1"></i>}
                            Export PDF
                        </button>
                        <button 
                            className="btn btn-sm btn-light border px-3" 
                            onClick={exportTransactionsExcel} 
                            disabled={isExporting || totalElements === 0} 
                            title="Export Filtered Transactions to Excel"
                        >
                            {isExporting ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-file-earmark-excel text-success me-1"></i>}
                            Export Excel
                        </button>
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

                    {/* Company Multi-Select */}
                    <div className="filter-item" ref={companyDropdownRef}>
                        <label className="filter-label">Company</label>
                        <div className="dash-multi-select">
                            <div
                                className={`dash-select-trigger ${isCompanyOpen ? 'active' : ''}`}
                                onClick={() => {
                                    setIsCompanyOpen(!isCompanyOpen);
                                    setIsAccountsOpen(false);
                                }}
                                title={companyButtonSummary}
                            >
                                <div className="dash-select-summary">
                                    <span className="text-truncate">{companyButtonSummary}</span>
                                    {filters.companies.length > 1 && !isAllCompaniesChecked && !filters.companies.includes(-1) && (
                                        <span className="dash-select-badge">{filters.companies.length}</span>
                                    )}
                                </div>
                                <div className="dash-select-icons">
                                    <i className={`bi bi-chevron-${isCompanyOpen ? 'up' : 'down'}`}></i>
                                </div>
                            </div>

                            {isCompanyOpen && (
                                <div className="dash-select-menu">
                                    {activeCompanies.length > 5 && (
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

                                    <div
                                        className="dash-select-header-option"
                                        onClick={toggleSelectAllCompanies}
                                    >
                                        <div className="d-flex align-items-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={isAllCompaniesChecked}
                                                onChange={toggleSelectAllCompanies}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span>Select All Companies</span>
                                        </div>
                                        <span className="badge bg-light text-muted fw-normal">{activeCompanies.length}</span>
                                    </div>

                                    <div className="dash-select-options-list">
                                        {displayedCompanies.map(c => {
                                            const isChecked = isAllCompaniesChecked || filters.companies.includes(Number(c.id));
                                            return (
                                                <div
                                                    key={c.id}
                                                    className={`dash-select-option ${isChecked ? 'selected' : ''}`}
                                                    onClick={() => toggleCompany(c.id)}
                                                >
                                                    <div className="d-flex align-items-center overflow-hidden flex-grow-1">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isChecked}
                                                            onChange={() => toggleCompany(c.id)}
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
                                                        onClick={(e) => selectOnlyCompany(c.id, e)}
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
                                        <span>
                                            {isAllCompaniesChecked
                                                ? activeCompanies.length
                                                : (filters.companies.includes(-1) ? 0 : filters.companies.length)} of {activeCompanies.length} selected
                                        </span>
                                        {!isAllCompaniesChecked && (
                                            <button
                                                type="button"
                                                onClick={() => setFilters(prev => ({ ...prev, companies: [] }))}
                                            >
                                                Select All
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Accounts Multi-Select */}
                    <div className="filter-item" ref={accountDropdownRef}>
                        <label className="filter-label">Accounts</label>
                        <div className="dash-multi-select">
                            <div
                                className={`dash-select-trigger ${isAccountsOpen ? 'active' : ''}`}
                                onClick={() => {
                                    setIsAccountsOpen(!isAccountsOpen);
                                    setIsCompanyOpen(false);
                                }}
                                title={accountButtonSummary}
                            >
                                <div className="dash-select-summary">
                                    <span className="text-truncate">{accountButtonSummary}</span>
                                    {filters.accounts.length > 1 && !isAllAccountsChecked && !filters.accounts.includes(-1) && (
                                        <span className="dash-select-badge">{filters.accounts.length}</span>
                                    )}
                                </div>
                                <div className="dash-select-icons">
                                    <i className={`bi bi-chevron-${isAccountsOpen ? 'up' : 'down'}`}></i>
                                </div>
                            </div>

                            {isAccountsOpen && (
                                <div className="dash-select-menu">
                                    {filteredActiveAccounts.length > 5 && (
                                        <div className="dash-select-search-box">
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Search account..."
                                                value={accountSearch}
                                                onChange={(e) => setAccountSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}

                                    <div
                                        className="dash-select-header-option"
                                        onClick={toggleSelectAllAccounts}
                                    >
                                        <div className="d-flex align-items-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={isAllAccountsChecked}
                                                onChange={toggleSelectAllAccounts}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span>Select All Accounts</span>
                                        </div>
                                        <span className="badge bg-light text-muted fw-normal">{filteredActiveAccounts.length}</span>
                                    </div>

                                    <div className="dash-select-options-list">
                                        {displayedAccounts.map(acc => {
                                            const isChecked = isAllAccountsChecked || filters.accounts.includes(Number(acc.id));
                                            return (
                                                <div
                                                    key={acc.id}
                                                    className={`dash-select-option ${isChecked ? 'selected' : ''}`}
                                                    onClick={() => toggleAccount(acc.id)}
                                                >
                                                    <div className="d-flex align-items-center overflow-hidden flex-grow-1">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isChecked}
                                                            onChange={() => toggleAccount(acc.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <div className="dash-option-label">
                                                            <span className="dash-option-title text-truncate">
                                                                <i className={`bi ${acc.type === 'Bank' ? 'bi-bank text-primary' : 'bi-wallet text-warning'} me-1`}></i>
                                                                {acc.name}
                                                            </span>
                                                            {acc.companyName && (
                                                                <span className="dash-option-subtitle text-truncate">{acc.companyName}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="dash-only-btn ms-2"
                                                        title={`Select only ${acc.name}`}
                                                        onClick={(e) => selectOnlyAccount(acc.id, e)}
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
                                        <span>
                                            {isAllAccountsChecked
                                                ? filteredActiveAccounts.length
                                                : (filters.accounts.includes(-1) ? 0 : filters.accounts.length)} of {filteredActiveAccounts.length} selected
                                        </span>
                                        {!isAllAccountsChecked && (
                                            <button
                                                type="button"
                                                onClick={() => setFilters(prev => ({ ...prev, accounts: [] }))}
                                            >
                                                Select All
                                            </button>
                                        )}
                                    </div>
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
                        <div className="position-relative">
                            <input
                                type="text"
                                className="filter-input pe-4"
                                placeholder="Desc, Ref, Account, Amount, TXT..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    className="btn btn-sm text-muted position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent p-0 me-2"
                                    onClick={() => setSearchInput('')}
                                    title="Clear search"
                                    style={{ cursor: 'pointer', lineHeight: 1 }}
                                >
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            )}
                        </div>
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

            {fetchError && (
                <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 my-3" role="alert">
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                        <div>
                            <strong>Error loading transactions:</strong> {fetchError}
                        </div>
                    </div>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchTransactions}>
                        <i className="bi bi-arrow-clockwise me-1"></i> Retry
                    </button>
                </div>
            )}

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
                            {transactions.map((txn, index) => {
                                const isIncome = txn.type === 'Received';
                                const isExpense = txn.type === 'Paid';

                                return (
                                    <div key={txn.id} className="txn-mobile-card" onClick={() => openModal('viewTransaction', txn)}>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div className="pe-2">
                                                <div className="txn-desc fw-bold" title={txn.description}>{txn.description?.length > 15 ? txn.description.substring(0, 15) + '...' : (txn.description || 'No Description')}</div>
                                                <div className="text-muted small-text">
                                                    <span className="badge bg-light text-muted border me-1">#{(currentPage - 1) * itemsPerPage + index + 1}</span>
                                                    {txn.date} • <span className="opacity-75">TXT{String(txn.id).padStart(6, '0')}</span>
                                                </div>
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
                    <div className="transaction-table-container d-none d-md-block mb-3">
                        <table className="transaction-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '65px' }}>Sr No.</th>
                                    <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }} className="user-select-none" title="Click to sort by date">
                                        Date {sortBy === 'date' && <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'} text-primary ms-1`}></i>}
                                    </th>
                                    <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }} className="user-select-none" title="Click to sort by type">
                                        Type {sortBy === 'type' && <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'} text-primary ms-1`}></i>}
                                    </th>
                                    <th>From Source</th>
                                    <th>To Destination</th>
                                    <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }} className="user-select-none" title="Click to sort by amount">
                                        Amount {sortBy === 'amount' && <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'} text-primary ms-1`}></i>}
                                    </th>
                                    <th>Mode</th>
                                    <th>Reference</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn, index) => (
                                    <tr key={txn.id} className="transaction-row">
                                        <td data-label="Sr No." className="text-muted fw-semibold">{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                                        <td colSpan="9" className="text-center py-4 text-muted">No transactions found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Component */}
                    <div className="mb-5">
                        <Pagination
                            totalItems={totalElements || transactions.length}
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