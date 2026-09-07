import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination';
import { apiService } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './AccountsPage.css';

const AccountsPage = ({ activePage, setActivePage, userRole, mastersData, accounts, setAccounts }) => {
    // Shared State for Modals
    const [activeModal, setActiveModal] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [formValues, setFormValues] = useState(null);
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [showTxnModal, setShowTxnModal] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        company: 'all',
        type: 'all',
        search: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    // Pagination State restored for server-side pagination
    const [activeAccountStatement, setActiveAccountStatement] = useState(null);
    const [statementData, setStatementData] = useState([]);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    const [statementFilters, setStatementFilters] = useState({
        dateFrom: '',
        dateTo: '',
        type: 'all',
        mode: 'all',
        search: ''
    });
    const [appliedStatementFilters, setAppliedStatementFilters] = useState({
        dateFrom: '',
        dateTo: '',
        type: 'all',
        mode: 'all',
        search: ''
    });
    const [isFiltering, setIsFiltering] = useState(false);
    const [statementSort, setStatementSort] = useState({ key: 'date', direction: 'desc' });
    const [statementPage, setStatementPage] = useState(1);
    const [statementItemsPerPage, setStatementItemsPerPage] = useState(25);

    useEffect(() => {
        if (activePage === 'add-account') setActiveModal('addAccount');
        else setActiveModal(null);
    }, [activePage]);

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage - 1,
                size: itemsPerPage,
                search: filters.search,
                sortBy: sortConfig.key === 'company' ? 'company.name' : sortConfig.key,
                direction: sortConfig.direction
            });

            if (filters.company !== 'all') params.append('companyId', filters.company);
            if (filters.type !== 'all') params.append('type', filters.type);

            const response = await apiService.get(`/accounts?${params.toString()}`);
            setAccounts(response.content);
            setTotalElements(response.totalElements);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            // Swal.fire('Error', 'Failed to load accounts. ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activePage === 'all-accounts') {
            fetchAccounts();
        }
    }, [currentPage, itemsPerPage, filters, sortConfig, activePage]);

    useEffect(() => {
        const fetchStatement = async () => {
            if (activePage === 'account-statement' && activeAccountStatement?.id) {
                setIsFiltering(true);
                try {
                    const [stmtResponse, accResponse] = await Promise.all([
                        apiService.get(`/accounts/${activeAccountStatement.id}/statement`),
                        apiService.get(`/accounts/${activeAccountStatement.id}`)
                    ]);
                    setStatementData(stmtResponse || []);
                    setActiveAccountStatement(accResponse);
                } catch (error) {
                    console.error('Error fetching statement:', error);
                } finally {
                    setIsFiltering(false);
                }
            }
        };
        fetchStatement();
    }, [activePage, activeAccountStatement?.id]);



    const openModal = (modalName, account = null) => {
        setSelectedAccount(account);
        if (modalName === 'addAccount') {
            setFormValues({
                companyId: '',
                code: '',
                name: '',
                type: 'Bank',
                bankId: '',
                accountNumber: '',
                ifsc: '',
                branch: '',
                openingBalance: 0,
                openingDate: '',
                status: 'Active'
            });
        }
        if (modalName === 'editAccount' && account) {
            setFormValues({
                companyId: String(account.companyId || ''),
                code: account.code,
                name: account.name,
                type: account.type,
                bankId: account.bankId ? String(account.bankId) : '',
                accountNumber: account.accountNumber || '',
                ifsc: account.ifsc || '',
                branch: account.branch || '',
                openingBalance: account.openingBalance ?? 0,
                openingDate: account.openingDate || '',
                status: account.status || 'Active'
            });
        }
        setActiveModal(modalName);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedAccount(null);
    };

    const handleCompanyChange = async (e) => {
        const companyId = e.target.value;
        setFormValues(v => ({ ...(v || {}), companyId }));
        if (!selectedAccount && companyId) {
            try {
                const res = await apiService.get(`/accounts/next-code?companyId=${companyId}`);
                if (res && res.code) {
                    setFormValues(v => ({ ...(v || {}), code: res.code }));
                }
            } catch(err) {
                console.error("Could not fetch next code", err);
            }
        } else if (!selectedAccount) {
            setFormValues(v => ({ ...(v || {}), code: '' }));
        }
    };

    const allCompanies = useMemo(() => mastersData?.company || [], [mastersData]);
    const activeCompanies = useMemo(() => allCompanies.filter(c => c.status === 'Active'), [allCompanies]);
    const allBanks = useMemo(() => mastersData?.bank || [], [mastersData]);
    const activeBanks = useMemo(() => allBanks.filter(b => b.status === 'Active'), [allBanks]);

    const handleSaveAccount = async () => {
        if (!formValues) return;

        const companyIdNum = Number(formValues.companyId);
        const company = (mastersData?.company || []).find(c => String(c.id) === String(formValues.companyId));
        const bankIdNum = formValues.type === 'Bank' ? Number(formValues.bankId) : null;
        const bank = formValues.type === 'Bank' ? (mastersData?.bank || []).find(b => String(b.id) === String(formValues.bankId)) : null;

        const next = {
            companyId: companyIdNum,
            code: (formValues.code || '').trim().toUpperCase(),
            name: (formValues.name || '').trim(),
            type: formValues.type || 'Bank',
            bankId: formValues.type === 'Bank' ? bankIdNum : null,
            accountNumber: (formValues.accountNumber || '').trim(),
            ifsc: (formValues.ifsc || '').trim().toUpperCase(),
            branch: (formValues.branch || '').trim(),
            openingBalance: Number(formValues.openingBalance || 0),
            openingDate: (formValues.openingDate || '').trim(),
            status: formValues.status || 'Active'
        };

        if (!next.companyId || !company) {
            Swal.fire('Validation Error', 'Company is required.', 'error');
            return;
        }

        if (!next.name) {
            Swal.fire('Validation Error', 'Account Name is required.', 'error');
            return;
        }
        if (!next.openingDate) {
            Swal.fire('Validation Error', 'Opening Date is required.', 'error');
            return;
        }

        if (next.type === 'Bank') {
            if (!next.bankId || !bank) {
                Swal.fire('Validation Error', 'Bank Name is required for Bank accounts.', 'error');
                return;
            }
        }

        try {
            if (selectedAccount) {
                await apiService.put(`/accounts/${selectedAccount.id}`, next);
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Account updated successfully.', timer: 1500, showConfirmButton: false });
            } else {
                await apiService.post('/accounts', next);
                Swal.fire({ icon: 'success', title: 'Saved', text: 'Account added successfully.', timer: 1500, showConfirmButton: false });
            }
            fetchAccounts();
            if (typeof refreshGlobalMasters === 'function') refreshGlobalMasters();
            closeModal();
            if (setActivePage) setActivePage('all-accounts');
        } catch (error) {
            console.error('Error saving account:', error);
            const errorMsg = error.errors 
                ? Object.values(error.errors).map(msg => `• ${msg}`).join('<br/>') 
                : error.message;
            
            Swal.fire({
                title: 'Validation Error',
                html: `<div class="text-start">${errorMsg}</div>`,
                icon: 'error'
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Account?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Delete'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiService.delete(`/accounts/${id}`);
                    fetchAccounts();
                    if (typeof refreshGlobalMasters === 'function') refreshGlobalMasters();
                    Swal.fire('Deleted!', 'Account has been removed.', 'success');
                } catch (error) {
                    console.error('Error deleting account:', error);
                    Swal.fire('Error', 'Failed to delete account. ' + error.message, 'error');
                }
            }
        });
    };

    const viewStatement = (account) => {
        setActiveAccountStatement(account);
        setActivePage('account-statement');
    };

    const openTxnModal = (txn) => {
        setSelectedTxn(txn);
        setShowTxnModal(true);
    };

    const closeTxnModal = () => {
        setSelectedTxn(null);
        setShowTxnModal(false);
    };

    useEffect(() => {
        if (activePage === 'account-statement') {
            setStatementPage(1);
        }
    }, [activePage, appliedStatementFilters, statementSort]);

    const formatStatementDate = (isoDate) => {
        if (!isoDate) return '-';
        const d = new Date(isoDate);
        if (Number.isNaN(d.getTime())) return isoDate;
        
        // Date part: 28-Apr-2026
        const datePart = d.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        }).replace(/ /g, '-');
        
        // Time part: 18:45
        const timePart = d.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
        
        return `${datePart} ${timePart}`;
    };

    const statementModes = useMemo(() => {
        const modes = new Set((statementData || []).map(r => r.mode).filter(Boolean));
        return Array.from(modes);
    }, [statementData]);

    const filteredStatementRows = useMemo(() => {
        const f = appliedStatementFilters;
        const from = f.dateFrom ? new Date(f.dateFrom) : null;
        const to = f.dateTo ? new Date(f.dateTo) : null;

        let rows = (statementData || []).filter(r => {
            const dt = r.date ? new Date(r.date) : null;
            const inFrom = !from || (dt && dt >= from);
            const inTo = !to || (dt && dt <= to);
            const typeOk = f.type === 'all' || r.type === f.type;
            const modeOk = f.mode === 'all' || r.mode === f.mode;
            const q = (f.search || '').trim().toLowerCase();
            const searchOk = !q ||
                (r.description || '').toLowerCase().includes(q) ||
                (r.ref || '').toLowerCase().includes(q) ||
                (r.fromTo || '').toLowerCase().includes(q);
            return inFrom && inTo && typeOk && modeOk && searchOk;
        });

        rows.sort((a, b) => {
            const dir = statementSort.direction === 'asc' ? 1 : -1;
            if (statementSort.key === 'date') {
                const aD = new Date(a.date);
                const bD = new Date(b.date);
                return (aD - bD) * dir;
            }
            if (statementSort.key === 'amount') {
                const aAmt = Number(a.debit || 0) + Number(a.credit || 0);
                const bAmt = Number(b.debit || 0) + Number(b.credit || 0);
                return (aAmt - bAmt) * dir;
            }
            return 0;
        });

        return rows;
    }, [appliedStatementFilters, statementData, statementSort]);

    const paginatedStatementRows = useMemo(() => {
        const startIndex = (statementPage - 1) * statementItemsPerPage;
        return filteredStatementRows.slice(startIndex, startIndex + statementItemsPerPage);
    }, [filteredStatementRows, statementPage, statementItemsPerPage]);

    const statementTotals = useMemo(() => {
        const opening = Number(activeAccountStatement?.openingBalance || 0);
        const totalCredit = filteredStatementRows.reduce((sum, r) => sum + Number(r.credit || 0), 0);
        const totalDebit = filteredStatementRows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
        const closing = opening + totalCredit - totalDebit;
        return { opening, totalCredit, totalDebit, closing };
    }, [activeAccountStatement, filteredStatementRows]);

    const sanitizePdfText = (val) => String(val ?? '').replace(/[^\x00-\x7F]/g, ' ').trim();

    const exportStatementExcel = () => {
        try {
            if (!filteredStatementRows.length) {
                Swal.fire('No data', 'No rows available for export.', 'info');
                return;
            }
            const wb = XLSX.utils.book_new();
            const summaryData = [
                ['Account Name', activeAccountStatement?.name || 'N/A'],
                ['Company', activeAccountStatement?.companyName || 'N/A'],
                ['Account Code', activeAccountStatement?.code || 'N/A'],
                ['Type', activeAccountStatement?.type || 'N/A'],
                ['Opening Balance', activeAccountStatement?.openingBalance ?? 0],
                ['Total Received', statementTotals.totalCredit],
                ['Total Paid', statementTotals.totalDebit],
                ['Closing Balance', statementTotals.closing],
                ['Total Transactions', filteredStatementRows.length]
            ];
            const summarySheet = XLSX.utils.aoa_to_sheet([['Field', 'Value'], ...summaryData]);
            const columns = ['Date', 'ID', 'Description', 'From / To', 'Type', 'Mode', 'Reference', 'Debit', 'Credit', 'Balance'];
            const tableRows = filteredStatementRows.map((r) => ({
                Date: r.date || '-',
                ID: `TXT${String(r.id).padStart(6, '0')}`,
                Description: r.description || '-',
                'From / To': r.fromTo || '-',
                Type: r.type || '-',
                Mode: r.mode || '-',
                Reference: r.ref || '-',
                Debit: Number(r.debit || 0),
                Credit: Number(r.credit || 0),
                Balance: Number(r.balance || 0)
            }));
            const tableSheet = XLSX.utils.json_to_sheet(tableRows, { header: columns });
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
            XLSX.utils.book_append_sheet(wb, tableSheet, 'Statement');
            XLSX.writeFile(wb, `${activeAccountStatement?.name || 'account'}-statement.xlsx`);
        } catch (err) {
            Swal.fire('Export failed', err?.message || 'Unable to export Excel statement', 'error');
        }
    };

    const exportStatementPdf = () => {
        try {
            if (!filteredStatementRows.length) {
                Swal.fire('No data', 'No rows available for export.', 'info');
                return;
            }
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
            doc.text(`${sanitizePdfText(activeAccountStatement?.name || 'Account')} - Statement`, 80, 33);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(`Company: ${sanitizePdfText(activeAccountStatement?.companyName || 'N/A')} | Code: ${sanitizePdfText(activeAccountStatement?.code || 'N/A')}`, 80, 48);

            // Generated date
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 30, 30, { align: 'right' });
            doc.setFillColor(92, 103, 242);
            doc.roundedRect(pageW - 110, 40, 80, 16, 3, 3, 'F');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('STATEMENT', pageW - 70, 51, { align: 'center' });

            // Summary cards
            const summaryCards = [
                ['Opening Balance', `INR ${(activeAccountStatement?.openingBalance || 0).toLocaleString('en-IN')}`],
                ['Total Received', `INR ${statementTotals.totalCredit.toLocaleString('en-IN')}`],
                ['Total Paid', `INR ${statementTotals.totalDebit.toLocaleString('en-IN')}`],
                ['Closing Balance', `INR ${statementTotals.closing.toLocaleString('en-IN')}`],
                ['Transactions', String(filteredStatementRows.length)]
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

                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(value, cardX + cardW / 2, cardY + 30, { align: 'center' });

                cardX += cardW + 10;
            });

            // Table
            const columns = ['Date', 'ID', 'Description', 'From / To', 'Type', 'Mode', 'Reference', 'Debit', 'Credit', 'Balance'];
            const tableRows = filteredStatementRows.map((r) => [
                sanitizePdfText(r.date || '-'),
                `TXT${String(r.id).padStart(6, '0')}`,
                sanitizePdfText(r.description || '-'),
                sanitizePdfText(r.fromTo || '-'),
                sanitizePdfText(r.type || '-'),
                sanitizePdfText(r.mode || '-'),
                sanitizePdfText(r.ref || '-'),
                Number(r.debit || 0) > 0 ? Number(r.debit).toLocaleString('en-IN') : '-',
                Number(r.credit || 0) > 0 ? Number(r.credit).toLocaleString('en-IN') : '-',
                Number(r.balance || 0).toLocaleString('en-IN')
            ]);

            autoTable(doc, {
                startY: cardY + 60,
                head: [columns],
                body: tableRows,
                theme: 'plain',
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 7.5,
                    cellPadding: { top: 8, bottom: 8, left: 6, right: 6 }
                },
                bodyStyles: {
                    fontSize: 7.5,
                    cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
                    lineColor: [241, 245, 249],
                    lineWidth: { bottom: 0.5 },
                    textColor: [51, 65, 85]
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    7: { halign: 'right' },
                    8: { halign: 'right' },
                    9: { halign: 'right' }
                },
                margin: { left: 20, right: 20, top: 72, bottom: 30 }
            });

            doc.save(`${activeAccountStatement?.name || 'account'}-statement.pdf`);
        } catch (err) {
            Swal.fire('Export failed', err?.message || 'Unable to export PDF statement', 'error');
        }
    };

    const printStatement = () => {
        try {
            if (!filteredStatementRows.length) {
                Swal.fire('No data', 'No rows available for print.', 'info');
                return;
            }
            window.print();
        } catch (err) {
            Swal.fire('Print failed', err?.message || 'Unable to print', 'error');
        }
    };

    const paginatedAccounts = accounts || [];

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="accounts-container">
            {activePage === 'account-statement' && activeAccountStatement ? (
                // -----------------------
                // STATEMENT SCREEN
                // -----------------------
                <div className="statement-view fade-in">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                        <button className="btn btn-secondary-custom" onClick={() => setActivePage('all-accounts')}>
                            <i className="bi bi-arrow-left"></i> Back to Accounts
                        </button>
                        <div className="d-flex flex-wrap gap-2">
                            <button className="btn btn-sm btn-light border" onClick={exportStatementPdf} disabled={filteredStatementRows.length === 0} title="Export Statement as PDF"><i className="bi bi-file-pdf text-danger"></i> Export PDF</button>
                            <button className="btn btn-sm btn-light border" onClick={exportStatementExcel} disabled={filteredStatementRows.length === 0} title="Export Statement as Excel"><i className="bi bi-file-excel text-success"></i> Export Excel</button>
                            <button className="btn btn-sm btn-primary-custom" onClick={printStatement} disabled={filteredStatementRows.length === 0} title="Print Statement"><i className="bi bi-printer"></i> Print</button>
                        </div>
                    </div>

                    <div className="statement-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-end gap-3">
                        <div>
                            <span className="badge bg-white text-primary mb-2 px-3 py-2 border">{activeAccountStatement?.companyName || 'Account'}</span>
                            <h3 className="mb-0 fw-bold text-white">{activeAccountStatement?.name || 'N/A'}</h3>
                            <p className="mb-0 text-white-50">
                                {activeAccountStatement?.type === 'Bank' ? <><i className="bi bi-bank me-1"></i> {activeAccountStatement?.bankName || 'Bank'}</> : <><i className="bi bi-cash-stack me-1"></i> Cash Account</>}
                            </p>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                                <span className="badge bg-white text-dark border"><i className="bi bi-upc-scan me-1"></i> {activeAccountStatement?.code || 'N/A'}</span>
                                <span className="badge bg-white text-dark border"><i className="bi bi-clock-history me-1"></i> Last Updated: {formatStatementDate(activeAccountStatement?.lastActivity)}</span>
                            </div>
                            <p className="mb-0 mt-2 small text-white-50"><i className="bi bi-info-circle me-1"></i> Balance is auto-calculated from transactions</p>
                        </div>
                        <div className="text-md-end w-100 w-md-auto">
                            <div className="d-flex flex-column flex-sm-row justify-content-between justify-content-md-end gap-4">
                                <div className="balance-info-card">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="icon-box-glass">
                                            <i className="bi bi-wallet2 text-white-50"></i>
                                        </div>
                                        <div>
                                            <p className="label mb-0">Opening Balance</p>
                                            <span className="small text-white-50">{formatStatementDate(activeAccountStatement?.openingDate)}</span>
                                        </div>
                                    </div>
                                    <h4 className="value">₹{(activeAccountStatement?.openingBalance || 0).toLocaleString('en-IN')}</h4>
                                </div>
                                <div className={`balance-info-card ${(activeAccountStatement?.balance || 0) < 0 ? 'negative' : ''}`}>
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="icon-box-glass">
                                            <i className="bi bi-graph-up-arrow text-white-50"></i>
                                        </div>
                                        <div>
                                            <p className="label mb-0">Current Balance</p>
                                            <span className="small text-white-50">Real-time</span>
                                        </div>
                                    </div>
                                    <h4 className="value">₹{(activeAccountStatement?.balance || 0).toLocaleString('en-IN')}</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm mb-4 mt-4">
                        <div className="card-body">
                            <div className="row g-3 align-items-end">
                                <div className="col-6 col-md-3">
                                    <label className="form-label small text-muted">Date From</label>
                                    <input type="date" className="form-control" value={statementFilters.dateFrom} onChange={(e) => setStatementFilters(v => ({ ...v, dateFrom: e.target.value }))} />
                                </div>
                                <div className="col-6 col-md-3">
                                    <label className="form-label small text-muted">Date To</label>
                                    <input type="date" className="form-control" value={statementFilters.dateTo} onChange={(e) => setStatementFilters(v => ({ ...v, dateTo: e.target.value }))} />
                                </div>
                                <div className="col-6 col-md-3">
                                    <label className="form-label small text-muted">Transaction Type</label>
                                    <select className="form-select" value={statementFilters.type} onChange={(e) => setStatementFilters(v => ({ ...v, type: e.target.value }))}>
                                        <option value="all">All Types</option>
                                        <option value="Received">Received (In)</option>
                                        <option value="Paid">Paid (Out)</option>
                                        <option value="Moved">Moved (Transfer)</option>
                                    </select>
                                </div>
                                <div className="col-6 col-md-3">
                                    <label className="form-label small text-muted">Payment Mode</label>
                                    <select className="form-select" value={statementFilters.mode} onChange={(e) => setStatementFilters(v => ({ ...v, mode: e.target.value }))}>
                                        <option value="all">All Modes</option>
                                        {statementModes.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="col-12 mt-3">
                                    <div className="row align-items-end g-3">
                                        <div className="col-md-8">
                                            <label className="form-label small text-muted">Search Keywords</label>
                                            <div className="position-relative">
                                                <input 
                                                    type="text" 
                                                    className="form-control ps-5" 
                                                    placeholder="Search by Description, Reference, or Party..." 
                                                    value={statementFilters.search} 
                                                    onChange={(e) => setStatementFilters(v => ({ ...v, search: e.target.value }))} 
                                                />
                                                <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
                                            </div>
                                        </div>
                                        <div className="col-md-4 d-flex gap-2">
                                            <button
                                                className="btn btn-primary-custom flex-grow-1"
                                                disabled={isFiltering}
                                                onClick={() => {
                                                    setAppliedStatementFilters({ ...statementFilters });
                                                    setStatementPage(1);
                                                }}
                                            >
                                                {isFiltering ? (
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                ) : (
                                                    <i className="bi bi-funnel-fill me-2"></i>
                                                )}
                                                Apply Filters
                                            </button>
                                            <button
                                                className="btn btn-outline-custom"
                                                onClick={() => {
                                                    const resetFilters = {
                                                        dateFrom: '',
                                                        dateTo: '',
                                                        type: 'all',
                                                        mode: 'all',
                                                        search: ''
                                                    };
                                                    setStatementFilters(resetFilters);
                                                    setAppliedStatementFilters(resetFilters);
                                                    setStatementPage(1);
                                                }}
                                            >
                                                <i className="bi bi-arrow-counterclockwise"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="d-block d-sm-none statement-cards-wrap">
                            <div className="statement-cards-scroll">
                                <div className="px-2 pt-2 pb-1 text-muted small fw-semibold">Opening Balance</div>
                                <div className="statement-opening-card mx-2 mb-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="text-muted small">As of {formatStatementDate(activeAccountStatement?.openingDate)}</div>
                                        <div className="fw-bold">₹{(activeAccountStatement?.openingBalance || 0).toLocaleString('en-IN')}</div>
                                    </div>
                                </div>

                                {isFiltering ? (
                                    <div className="text-center py-5 text-muted">
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Loading statement...
                                    </div>
                                ) : paginatedStatementRows.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-inbox me-2"></i>
                                        No transactions found for selected filters
                                    </div>
                                ) : (
                                    <div className="px-2 pb-2">
                                        {paginatedStatementRows.map((row) => {
                                            const amount = Number(row.debit || 0) + Number(row.credit || 0);
                                            const isDebit = Number(row.debit || 0) > 0;
                                            const isCredit = Number(row.credit || 0) > 0;
                                            const typeClass = row.type === 'Received' ? 'received' : row.type === 'Paid' ? 'paid' : 'moved';
                                            return (
                                                <div key={row.id} className="statement-txn-card" onClick={() => openTxnModal(row)}>
                                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                                        <div>
                                                            <div className="fw-semibold">{row.description?.length > 15 ? row.description.substring(0, 15) + '...' : row.description}</div>
                                                            <div className="text-muted small">{formatStatementDate(row.date)} • <code className="text-muted">TXT{String(row.id).padStart(6, '0')}</code></div>
                                                        </div>
                                                        <div className={`text-end fw-bold ${isDebit ? 'text-danger' : isCredit ? 'text-success' : ''}`}>₹{amount.toLocaleString('en-IN')}</div>
                                                    </div>

                                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                                        <span className={`statement-type-pill ${typeClass}`}>{row.type}</span>
                                                        <span className="statement-meta-pill">{row.mode}</span>
                                                        <span className="statement-meta-pill"><span className="text-muted">Ref:</span> {row.ref || '-'}</span>
                                                    </div>

                                                    <div className="mt-2 text-muted small">{row.fromTo}</div>

                                                    <div className="mt-2 d-flex justify-content-between align-items-center">
                                                        <div className="text-muted small">Running Balance</div>
                                                        <div className={`fw-bold ${row.balance < 0 ? 'text-danger' : ''}`}>₹{Number(row.balance || 0).toLocaleString('en-IN')}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {!isFiltering && paginatedStatementRows.length > 0 && (
                                    <div className="px-2 pb-3">
                                        <div className="statement-closing-card">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className="text-muted small fw-semibold">Closing Balance</div>
                                                <div className={`fw-bold ${statementTotals.closing < 0 ? 'text-danger' : ''}`}>₹{statementTotals.closing.toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="statement-table-wrap d-none d-sm-block">
                            <div className="table-responsive statement-table-scroll">
                            <table className="table table-hover mb-0 table-statement">
                                <thead className="sticky-top bg-white">
                                    <tr>
                                        <th style={{ cursor: 'pointer' }} onClick={() => setStatementSort(p => ({ key: 'date', direction: p.key === 'date' && p.direction === 'asc' ? 'desc' : 'asc' }))}>Date {statementSort.key === 'date' && (statementSort.direction === 'asc' ? '↑' : '↓')}</th>
                                        <th>Transaction ID</th>
                                        <th>Description</th>
                                        <th>From → To</th>
                                        <th>Type</th>
                                        <th>Payment Mode</th>
                                        <th>Reference</th>
                                        <th className="text-end" style={{ cursor: 'pointer' }} onClick={() => setStatementSort(p => ({ key: 'amount', direction: p.key === 'amount' && p.direction === 'asc' ? 'desc' : 'asc' }))}>Amount {statementSort.key === 'amount' && (statementSort.direction === 'asc' ? '↑' : '↓')}</th>
                                        <th className="text-end">Debit (Out)</th>
                                        <th className="text-end">Credit (In)</th>
                                        <th className="text-end">Running Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-light">
                                        <td colSpan="10" className="fw-bold text-muted">Opening Balance</td>
                                        <td className="text-end fw-bold">₹{(activeAccountStatement?.openingBalance || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                    {isFiltering ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-5 text-muted">
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Loading statement...
                                            </td>
                                        </tr>
                                    ) : paginatedStatementRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-5 text-muted">
                                                <i className="bi bi-inbox me-2"></i>
                                                No transactions found for selected filters
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedStatementRows.map(row => (
                                            <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => openTxnModal(row)}>
                                                <td data-label="Date">{formatStatementDate(row.date)}</td>
                                                <td data-label="Transaction ID"><code className="text-muted">TXT{String(row.id).padStart(6, '0')}</code></td>
                                                <td data-label="Description">
                                                    <div className="fw-semibold" title={row.description}>
                                                        {row.description?.length > 15 ? row.description.substring(0, 15) + '...' : row.description}
                                                    </div>
                                                </td>
                                                <td data-label="From → To" className="text-muted small">{row.fromTo}</td>
                                                <td data-label="Type">
                                                    <span className={`badge ${row.type === 'Received' ? 'bg-success-soft text-success' : row.type === 'Paid' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'}`}>{row.type}</span>
                                                </td>
                                                <td data-label="Payment Mode"><span className="badge bg-light text-dark border">{row.mode}</span></td>
                                                <td data-label="Reference"><code className="text-muted">{row.ref || '-'}</code></td>
                                                <td data-label="Amount" className="text-end text-muted">₹{(Number(row.debit || 0) + Number(row.credit || 0)).toLocaleString('en-IN')}</td>
                                                <td data-label="Debit (Out)" className="text-end text-danger">{row.debit > 0 ? `₹${(row.debit || 0).toLocaleString('en-IN')}` : '-'}</td>
                                                <td data-label="Credit (In)" className="text-end text-success">{row.credit > 0 ? `₹${(row.credit || 0).toLocaleString('en-IN')}` : '-'}</td>
                                                <td data-label="Running Balance" className={`text-end fw-bold statement-balance-col ${row.balance < 0 ? 'text-danger' : 'text-dark'}`}>₹{(row.balance || 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))
                                    )}

                                    {!isFiltering && paginatedStatementRows.length > 0 && (
                                        <tr className="statement-closing-row">
                                            <td colSpan="10" className="fw-bold">Closing Balance</td>
                                            <td className={`text-end fw-bold statement-balance-col ${statementTotals.closing < 0 ? 'text-danger' : ''}`}>₹{statementTotals.closing.toLocaleString('en-IN')}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="small text-muted">
                            Showing {filteredStatementRows.length} transactions
                        </div>
                        <div className="w-100 w-md-auto" style={{ maxWidth: 520 }}>
                            <Pagination
                                totalItems={filteredStatementRows.length}
                                itemsPerPage={statementItemsPerPage}
                                currentPage={statementPage}
                                onPageChange={setStatementPage}
                                onItemsPerPageChange={(val) => {
                                    setStatementItemsPerPage(val);
                                    setStatementPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-6 col-md-3">
                                    <div className="small text-muted">Opening Balance</div>
                                    <div className="fw-bold">₹{statementTotals.opening.toLocaleString('en-IN')}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div className="small text-muted">Total Credit</div>
                                    <div className="fw-bold text-success">₹{statementTotals.totalCredit.toLocaleString('en-IN')}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div className="small text-muted">Total Debit</div>
                                    <div className="fw-bold text-danger">₹{statementTotals.totalDebit.toLocaleString('en-IN')}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div className="small text-muted">Closing Balance</div>
                                    <div className={`fw-bold ${statementTotals.closing < 0 ? 'text-danger' : ''}`}>₹{statementTotals.closing.toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showTxnModal && (
                        <>
                            <div className="modal-backdrop fade show"></div>
                            <div className="modal fade show d-block" tabIndex="-1">
                                <div className="modal-dialog modal-dialog-centered modal-lg">
                                    <div className="modal-content border-0 shadow-lg">
                                        <div className="modal-header bg-light">
                                            <h5 className="modal-title fw-bold">Transaction Details</h5>
                                            <button type="button" className="btn-close" onClick={closeTxnModal}></button>
                                        </div>
                                        <div className="modal-body p-4">
                                            <div className="row g-4">
                                                <div className="col-md-4">
                                                    <div className="detail-item">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Transaction ID</label>
                                                        <div className="h6 mb-0 font-monospace text-primary">TXT{String(selectedTxn?.id).padStart(6, '0')}</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="detail-item">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Date & Time</label>
                                                        <div className="h6 mb-0">{formatStatementDate(selectedTxn?.date)}</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="detail-item">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Type</label>
                                                        <div>
                                                            <span className={`badge rounded-pill px-3 py-2 ${selectedTxn?.type === 'Received' ? 'bg-success-soft text-success' : selectedTxn?.type === 'Paid' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'}`}>
                                                                <i className={`bi ${selectedTxn?.type === 'Received' ? 'bi-arrow-down-left' : selectedTxn?.type === 'Paid' ? 'bi-arrow-up-right' : 'bi-arrow-left-right'} me-1`}></i>
                                                                {selectedTxn?.type?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-12">
                                                    <div className="detail-item p-3 bg-light rounded-3 border-start border-4 border-primary">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Description</label>
                                                        <div className="h6 mb-0 fw-bold">{selectedTxn?.description || 'N/A'}</div>
                                                    </div>
                                                </div>

                                                <div className="col-12">
                                                    <div className="detail-item">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>From → To Movement</label>
                                                        <div className="h6 mb-0 text-muted">{selectedTxn?.fromTo}</div>
                                                    </div>
                                                </div>

                                                <div className="col-md-4">
                                                    <div className="detail-item">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Payment Mode</label>
                                                        <div className="h6 mb-0 fw-semibold">{selectedTxn?.mode || '-'}</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="detail-item">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Reference / Voucher</label>
                                                        <div className="h6 mb-0 font-monospace text-muted">{selectedTxn?.ref || '-'}</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="detail-item">
                                                        <label className="text-uppercase small fw-bold text-muted mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Running Balance</label>
                                                        <div className="h5 mb-0 fw-bold">₹{Number(selectedTxn?.balance || 0).toLocaleString('en-IN')}</div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6">
                                                    <div className="detail-item p-3 rounded-3" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                                                        <label className="text-uppercase small fw-bold text-danger mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Debit (Money Out)</label>
                                                        <div className="h5 mb-0 fw-bold text-danger">{Number(selectedTxn?.debit || 0) ? `₹${Number(selectedTxn?.debit || 0).toLocaleString('en-IN')}` : '₹0.00'}</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="detail-item p-3 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                                                        <label className="text-uppercase small fw-bold text-success mb-1 d-block" style={{ letterSpacing: '0.05em' }}>Credit (Money In)</label>
                                                        <div className="h5 mb-0 fw-bold text-success">{Number(selectedTxn?.credit || 0) ? `₹${Number(selectedTxn?.credit || 0).toLocaleString('en-IN')}` : '₹0.00'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="modal-footer">
                                            <button className="btn btn-light" onClick={closeTxnModal}>Close</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                // -----------------------
                // ALL ACCOUNTS SCREEN
                // -----------------------
                <div className="all-accounts-view fade-in">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                        <div>
                            <h2 className="page-title mb-1">Financial Accounts</h2>
                            <p className="text-muted small mb-0">Production-ready account management with full data integrity.</p>
                        </div>
                        {userRole === 'Super Admin' && (
                            <button className="btn btn-primary-custom w-100 w-sm-auto" onClick={() => openModal('addAccount')}>
                                <i className="bi bi-plus-lg me-2"></i> Add Account
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="card account-filter-card border-0 mb-4">
                        <div className="card-body p-3">
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <select className="form-select border-0 bg-light" value={filters.company} onChange={e => setFilters({ ...filters, company: e.target.value })}>
                                        <option value="all">All Companies</option>
                                        {(mastersData?.company || []).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <select className="form-select border-0 bg-light" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                                        <option value="all">All Types (Bank/Cash)</option>
                                        <option value="Bank">Bank Accounts</option>
                                        <option value="Cash">Cash Accounts</option>
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <div className="position-relative">
                                        <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                                        <input type="text" className="form-control border-0 bg-light ps-5" placeholder="Search code or name..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Accounts Table */}
                    {/* Accounts Table - Desktop */}
                    <div className="table-responsive-wrapper d-none d-lg-block">
                        <div className="table-responsive">
                            <table className="custom-accounts-table mb-0 align-middle">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('company')} style={{ cursor: 'pointer' }}>Company {sortConfig.key === 'company' && '⇅'}</th>
                                        <th>Account Code</th>
                                        <th>Account Name</th>
                                        <th>Account Type</th>
                                        <th>Bank Name</th>
                                        <th className="text-end" onClick={() => handleSort('balance')} style={{ cursor: 'pointer' }}>Current Balance {sortConfig.key === 'balance' && '⇅'}</th>
                                        <th>Last Activity</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedAccounts.map(acc => (
                                        <tr key={acc.id} className="row-clickable" onClick={() => viewStatement(acc)}>
                                            <td data-label="Company"><span className="fw-bold text-dark">{acc.companyName}</span></td>
                                            <td data-label="Account Code"><code className="text-primary small fw-bold">{acc.code}</code></td>
                                            <td data-label="Account Name">
                                                <div className="d-flex align-items-center">
                                                    <div className={`icon-box me-3 ${acc.type === 'Bank' ? 'bg-primary-soft text-primary' : 'bg-warning-soft text-warning'}`}>
                                                        <i className={`bi ${acc.type === 'Bank' ? 'bi-bank' : 'bi-cash-stack'}`}></i>
                                                    </div>
                                                    <div className="fw-bold">{acc.name}</div>
                                                </div>
                                            </td>
                                            <td data-label="Account Type">
                                                <span className={`status-badge ${acc.type === 'Bank' ? 'status-active' : 'status-warning'}`}>{acc.type}</span>
                                            </td>
                                            <td data-label="Bank Name">{acc.type === 'Bank' ? (acc.bankName || '-') : '-'}</td>
                                            <td data-label="Current Balance" className={`text-end fw-bold ${acc.balance < 0 ? 'text-danger' : 'text-dark'}`}>
                                                {acc.balance < 0 && (
                                                    <i className="bi bi-exclamation-triangle-fill me-1" title="Negative balance — check transactions"></i>
                                                )}
                                                ₹{(acc.balance || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td data-label="Last Activity"><span className="text-muted small">{acc.lastActivity || '-'}</span></td>
                                            <td data-label="Status" className="text-center">
                                                <span className={`status-badge ${acc.status === 'Active' ? 'status-active' : 'status-inactive'}`}>{acc.status}</span>
                                            </td>
                                            <td data-label="Actions" className="text-end" onClick={(e) => e.stopPropagation()}>
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button className="btn-icon-small" title="Statement" onClick={() => viewStatement(acc)}><i className="bi bi-file-text"></i></button>
                                                    {userRole === 'Super Admin' && (
                                                        <>
                                                            <button className="btn-icon-small" title="Edit" onClick={() => openModal('editAccount', acc)}><i className="bi bi-pencil"></i></button>
                                                            <button className="btn-icon-small text-danger" title="Delete" onClick={() => handleDelete(acc.id)}><i className="bi bi-trash"></i></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Accounts Cards - Mobile/Tablet */}
                    <div className="account-cards-grid d-lg-none">
                        {paginatedAccounts.map(acc => (
                            <div key={acc.id} className="account-mobile-card shadow-sm border-0 mb-3" onClick={() => viewStatement(acc)}>
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="d-flex align-items-center">
                                            <div className={`account-icon-mobile me-3 ${acc.type === 'Bank' ? 'bg-primary-soft text-primary' : 'bg-warning-soft text-warning'}`}>
                                                <i className={`bi ${acc.type === 'Bank' ? 'bi-bank' : 'bi-cash-stack'}`}></i>
                                            </div>
                                            <div>
                                                <h6 className="mb-0 fw-bold">{acc.name}</h6>
                                                <span className="text-muted small">{acc.companyName}</span>
                                            </div>
                                        </div>
                                        <span className={`badge ${acc.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>{acc.status}</span>
                                    </div>
                                    
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="text-muted small d-block">Code</label>
                                            <code className="text-primary fw-bold">{acc.code}</code>
                                        </div>
                                        <div className="col-6">
                                            <label className="text-muted small d-block">Type</label>
                                            <span className={`badge-subtle ${acc.type === 'Bank' ? 'type-bank' : 'type-cash'}`}>{acc.type}</span>
                                        </div>
                                        {acc.type === 'Bank' && (
                                            <div className="col-12">
                                                <label className="text-muted small d-block">Bank</label>
                                                <span className="fw-semibold">{acc.bankName || '-'}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="d-flex justify-content-between align-items-end pt-3 border-top">
                                        <div>
                                            <label className="text-muted small d-block">Current Balance</label>
                                            <h5 className={`mb-0 fw-bold ${acc.balance < 0 ? 'text-danger' : 'text-dark'}`}>
                                                ₹{(acc.balance || 0).toLocaleString('en-IN')}
                                            </h5>
                                        </div>
                                        <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button className="btn btn-icon-small" onClick={() => viewStatement(acc)}><i className="bi bi-file-text"></i></button>
                                            {userRole === 'Super Admin' && (
                                                <>
                                                    <button className="btn btn-icon-small" onClick={() => openModal('editAccount', acc)}><i className="bi bi-pencil"></i></button>
                                                    <button className="btn btn-icon-small text-danger" onClick={() => handleDelete(acc.id)}><i className="bi bi-trash"></i></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4">
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
                </div>
            )}

            {/* Modals Component */}
            {activeModal && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header border-bottom-0 pb-0">
                                    <h5 className="modal-title fw-bold">
                                        {selectedAccount ? `Edit Account: ${selectedAccount.code}` : 'Register New Account'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={closeModal}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Company Name <span className="text-danger">*</span></label>
                                            <select
                                                className="form-control-custom"
                                                value={formValues?.companyId ?? ''}
                                                onChange={handleCompanyChange}
                                            >
                                                <option value="">Select Company</option>
                                                {allCompanies.map(c => (
                                                    <option key={c.id} value={String(c.id)}>
                                                        {c.name} {c.status === 'Inactive' ? '(Inactive)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Account Code <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control-custom"
                                                placeholder="Auto-generated"
                                                value={formValues?.code ?? ''}
                                                disabled={true}
                                            />
                                            <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Code is auto-generated</small>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Account Name <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control-custom"
                                                placeholder="e.g. HDFC Current A/C"
                                                value={formValues?.name ?? ''}
                                                onChange={(e) => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Account Type</label>
                                            <select
                                                className="form-control-custom"
                                                value={formValues?.type ?? 'Bank'}
                                                disabled={!!selectedAccount}
                                                onChange={(e) => {
                                                    const nextType = e.target.value;
                                                    setFormValues(v => ({
                                                        ...(v || {}),
                                                        type: nextType,
                                                        bankId: nextType === 'Cash' ? '' : (v?.bankId ?? ''),
                                                        ifsc: nextType === 'Cash' ? '' : (v?.ifsc ?? ''),
                                                        branch: nextType === 'Cash' ? '' : (v?.branch ?? '')
                                                    }));
                                                }}
                                            >
                                                <option value="Bank">Bank Account</option>
                                                <option value="Cash">Cash Account</option>
                                            </select>
                                        </div>

                                        {/* Conditional Fields */}
                                        <div className="col-12 p-3 bg-light rounded-3">
                                            <div className="row g-3">
                                                {(formValues?.type ?? 'Bank') === 'Bank' ? (
                                                    <>
                                                        <div className="col-md-6">
                                                            <label className="form-label-custom">Bank Name (from Bank Master) <span className="text-danger">*</span></label>
                                                            <select
                                                                className="form-control-custom"
                                                                value={formValues?.bankId ?? ''}
                                                                onChange={(e) => {
                                                                    const selectedBankId = e.target.value;
                                                                    const b = allBanks.find(x => String(x.id) === String(selectedBankId));
                                                                    setFormValues(v => ({
                                                                        ...(v || {}),
                                                                        bankId: selectedBankId,
                                                                        ifsc: b?.ifsc || v?.ifsc || '',
                                                                        branch: b?.branch || v?.branch || ''
                                                                    }));
                                                                }}
                                                            >
                                                                <option value="">Select Bank from Master</option>
                                                                {allBanks.map(b => (
                                                                    <option key={b.id} value={String(b.id)}>
                                                                        {b.name} {b.status === 'Inactive' ? '(Inactive)' : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label-custom">Account Number (optional)</label>
                                                            <input
                                                                type="text"
                                                                className="form-control-custom"
                                                                placeholder="e.g. 1234567890"
                                                                value={formValues?.accountNumber ?? ''}
                                                                onChange={(e) => setFormValues(v => ({ ...(v || {}), accountNumber: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label-custom">IFSC Code (auto-filled)</label>
                                                            <input
                                                                type="text"
                                                                className="form-control-custom"
                                                                placeholder="e.g. HDFC0XXXXXX"
                                                                value={formValues?.ifsc ?? ''}
                                                                onChange={(e) => setFormValues(v => ({ ...(v || {}), ifsc: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label-custom">Branch Name</label>
                                                            <input
                                                                type="text"
                                                                className="form-control-custom"
                                                                placeholder="e.g. Mumbai Main"
                                                                value={formValues?.branch ?? ''}
                                                                onChange={(e) => setFormValues(v => ({ ...(v || {}), branch: e.target.value }))}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="col-12 text-center py-2 text-muted">
                                                        <i className="bi bi-info-circle me-2"></i> Cash account — no bank details required
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label-custom">Opening Balance (₹) <span className="text-danger">*</span></label>
                                            <input
                                                type="number"
                                                className="form-control-custom"
                                                value={formValues?.openingBalance ?? 0}
                                                disabled={selectedAccount?.hasTransactions}
                                                onChange={(e) => setFormValues(v => ({ ...(v || {}), openingBalance: e.target.value }))}
                                            />
                                            {selectedAccount?.hasTransactions && (
                                                <div className="small text-danger mt-1"><i className="bi bi-exclamation-triangle"></i> Opening balance cannot be changed after transactions exist</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Opening Date <span className="text-danger">*</span></label>
                                            <input
                                                type="date"
                                                className="form-control-custom"
                                                value={formValues?.openingDate ?? ''}
                                                disabled={selectedAccount?.hasTransactions}
                                                onChange={(e) => setFormValues(v => ({ ...(v || {}), openingDate: e.target.value }))}
                                                required
                                            />
                                            {selectedAccount?.hasTransactions && (
                                                <div className="small text-danger mt-1"><i className="bi bi-exclamation-triangle"></i> Opening date cannot be changed after transactions exist</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Account Status</label>
                                            <select
                                                className="form-control-custom"
                                                value={formValues?.status ?? 'Active'}
                                                onChange={(e) => setFormValues(v => ({ ...(v || {}), status: e.target.value }))}
                                            >
                                                <option>Active</option>
                                                <option>Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-5 d-flex gap-2">
                                        <button className="btn btn-light px-4" onClick={closeModal}>Cancel</button>
                                        <button className="btn btn-primary-custom flex-grow-1 py-3" onClick={handleSaveAccount}>
                                            <i className="bi bi-check-lg me-2"></i> Save Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AccountsPage;
