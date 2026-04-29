import React, { useState, useMemo, useEffect } from 'react';
import './ReportsPage.css';
import Pagination from '../components/Pagination';
import Swal from 'sweetalert2';
import { apiService } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
    const isViewer = userRole === 'Viewer';
    const getDefaultDateRange = () => {
        const to = new Date();
        const from = new Date();
        from.setMonth(from.getMonth() - 1);

        const toIso = to.toISOString().slice(0, 10);
        const fromIso = from.toISOString().slice(0, 10);
        return { fromIso, toIso };
    };

    const defaultRange = useMemo(() => getDefaultDateRange(), []);

    // Report types mapping
    const reportTypeMap = {
        'bank-statement': 'Bank Statement',
        'company-report': 'Company Report',
        'combined-report': 'Combined Report',
        'date-wise-report': 'Date-wise Report'
    };

    const [filters, setFilters] = useState({
        dateFrom: defaultRange.fromIso,
        dateTo: defaultRange.toIso,
        companyIds: [],
        accountIds: [],
        paymentModeId: null,
        txnType: 'all',
        search: ''
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [drillDownData, setDrillDownData] = useState(null);

    const [companyOptions, setCompanyOptions] = useState([]);
    const [accountOptions, setAccountOptions] = useState([]);
    const [paymentModeOptions, setPaymentModeOptions] = useState([]);

    const [bankStatementRows, setBankStatementRows] = useState([]);
    const [bankStatementTotal, setBankStatementTotal] = useState(0);
    const [bankStatementMeta, setBankStatementMeta] = useState({
        openingBalance: null,
        currentBalance: null,
        accountName: null,
        companyName: null,
        accountId: null
    });

    const selectedSingleAccountLabel = useMemo(() => {
        if (!filters.accountIds || filters.accountIds.length !== 1) return null;
        const id = filters.accountIds[0];
        const acc = accountOptions.find(a => a.id === id);
        if (!acc) return null;
        return `${acc.name}${acc.companyName ? ` (${acc.companyName})` : ''}`;
    }, [filters.accountIds, accountOptions]);

    const [companySummary, setCompanySummary] = useState(null);
    const [combinedRows, setCombinedRows] = useState([]);
    const [combinedTotal, setCombinedTotal] = useState(0);
    const [dateWiseReport, setDateWiseReport] = useState(null);
    const [dateWiseDetails, setDateWiseDetails] = useState({
        period: '',
        totalCredit: 0,
        totalDebit: 0,
        netAmount: 0,
        content: [],
        totalElements: 0,
        page: 0,
        size: 10
    });
    const [isLoadingDateWiseDetails, setIsLoadingDateWiseDetails] = useState(false);

    const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const formatDateForLabel = (isoDate) => {
        if (!isoDate) return '-';
        const date = new Date(isoDate);
        if (Number.isNaN(date.getTime())) return String(isoDate);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getRangeLabel = () => `${formatDateForLabel(filters.dateFrom)} to ${formatDateForLabel(filters.dateTo)}`;

    const sanitizeText = (value) => {
        if (value === null || typeof value === 'undefined') return '-';
        return String(value)
            .replaceAll('→', '->')
            .replaceAll('₹', 'Rs ')
            .replaceAll(/\s+/g, ' ')
            .trim();
    };

    const sanitizePdfText = (value) => {
        const clean = sanitizeText(value);
        return clean
            .normalize('NFKD')
            .replace(/[^\x20-\x7E]/g, '')
            .trim() || '-';
    };

    const getReportTitle = () => reportTypeMap[activePage] || 'Financial Report';

    const getRequestBody = () => ({
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        companyIds: filters.companyIds,
        accountIds: filters.accountIds,
        paymentModeId: filters.paymentModeId,
        txnType: filters.txnType,
        search: filters.search
    });

    const getExportFilePrefix = () => {
        const from = filters.dateFrom || 'start';
        const to = filters.dateTo || 'end';
        return `${activePage}-${from}-to-${to}`;
    };

    const hasExportableData = useMemo(() => {
        if (activePage === 'bank-statement') return bankStatementRows.length > 0;
        if (activePage === 'company-report') return Boolean(companySummary);
        if (activePage === 'combined-report') return combinedRows.length > 0;
        if (activePage === 'date-wise-report') return Boolean(dateWiseReport?.periods?.length);
        return false;
    }, [activePage, bankStatementRows.length, companySummary, combinedRows.length, dateWiseReport]);

    const loadFullReportForExport = async () => {
        const body = getRequestBody();
        const fetchAllPagedRows = async (endpoint, sortBy = 'date', sortDir = 'asc') => {
            const pageSize = 500;
            const first = await apiService.post(`${endpoint}?page=0&size=${pageSize}&sortBy=${sortBy}&sortDir=${sortDir}`, body);
            const totalElements = Number(first?.totalElements || 0);
            const totalPages = Math.max(Number(first?.totalPages || 0), totalElements > 0 ? Math.ceil(totalElements / pageSize) : 0);
            const rows = [...(first?.content || [])];
            if (totalPages > 1) {
                for (let page = 1; page < totalPages; page += 1) {
                    const next = await apiService.post(`${endpoint}?page=${page}&size=${pageSize}&sortBy=${sortBy}&sortDir=${sortDir}`, body);
                    rows.push(...(next?.content || []));
                }
            }
            return { rows, firstPage: first };
        };

        if (activePage === 'bank-statement') {
            const { rows, firstPage } = await fetchAllPagedRows('/reports/bank-statement/paged', 'date', 'asc');
            return {
                rows,
                meta: {
                    openingBalance: firstPage?.openingBalance ?? bankStatementMeta?.openingBalance ?? null,
                    currentBalance: firstPage?.currentBalance ?? bankStatementMeta?.currentBalance ?? null,
                    accountName: firstPage?.accountName ?? bankStatementMeta?.accountName ?? null,
                    companyName: firstPage?.companyName ?? bankStatementMeta?.companyName ?? null,
                    accountId: firstPage?.accountId ?? bankStatementMeta?.accountId ?? null
                }
            };
        }
        if (activePage === 'company-report') {
            const report = await apiService.post('/reports/company-report', body);
            return { report: report || null };
        }
        if (activePage === 'combined-report') {
            const { rows } = await fetchAllPagedRows('/reports/combined-report/paged', 'date', 'asc');
            return { rows };
        }
        if (activePage === 'date-wise-report') {
            const report = await apiService.post('/reports/date-wise-report/paged?page=0&size=1000', body);
            return { report: report || null };
        }
        return {};
    };

    const buildExportPayload = (fullData) => {
        if (activePage === 'bank-statement') {
            const rows = fullData.rows || [];
            const exportMeta = fullData.meta || bankStatementMeta || {};
            return {
                summary: [
                    ['Report', getReportTitle()],
                    ['Date Range', getRangeLabel()],
                    ['Opening Balance', exportMeta?.openingBalance == null ? '-' : formatCurrency(exportMeta.openingBalance)],
                    ['Current Balance', exportMeta?.currentBalance == null ? '-' : formatCurrency(exportMeta.currentBalance)],
                    ['Total Transactions', rows.length]
                ],
                columns: ['Date', 'ID', 'Description', 'From To', 'Type', 'Mode', 'Reference', 'Debit', 'Credit', 'Running Balance'],
                rows: rows.map((txn) => ({
                    Date: sanitizeText(txn.date),
                    ID: txn.id || '-',
                    Description: sanitizeText(txn.description),
                    'From To': sanitizeText(txn.fromTo),
                    Type: sanitizeText(txn.type),
                    Mode: sanitizeText(txn.mode),
                    Reference: sanitizeText(txn.ref),
                    Debit: Number(txn.debit || 0),
                    Credit: Number(txn.credit || 0),
                    'Running Balance': txn.balance == null ? '' : Number(txn.balance || 0)
                }))
            };
        }

        if (activePage === 'company-report') {
            const report = fullData.report || {};
            const transactions = report?.recentTransactions || [];
            const totalCredit = Number(report?.totalCredit || 0);
            const totalDebit = Number(report?.totalDebit || 0);
            return {
                summary: [
                    ['Report', getReportTitle()],
                    ['Date Range', getRangeLabel()],
                    ['Total Credit', formatCurrency(totalCredit)],
                    ['Total Debit', formatCurrency(totalDebit)],
                    ['Net Position', formatCurrency(totalCredit - totalDebit)]
                ],
                columns: ['Date', 'Account', 'Description', 'From To', 'Type', 'Mode', 'Reference', 'Debit', 'Credit'],
                rows: transactions.map((txn) => ({
                    Date: sanitizeText(txn.date),
                    Account: sanitizeText(txn.account),
                    Description: sanitizeText(txn.description),
                    'From To': sanitizeText(txn.fromTo),
                    Type: sanitizeText(txn.type),
                    Mode: sanitizeText(txn.mode),
                    Reference: sanitizeText(txn.ref),
                    Debit: Number(txn.debit || 0),
                    Credit: Number(txn.credit || 0)
                }))
            };
        }

        if (activePage === 'combined-report') {
            const rows = (fullData.rows || []).map((txn) => ({
                ...txn,
                netEffect: txn.type === 'Moved' ? 0 : Number(txn.credit || 0) - Number(txn.debit || 0)
            }));
            return {
                summary: [
                    ['Report', getReportTitle()],
                    ['Date Range', getRangeLabel()],
                    ['Total Transactions', rows.length]
                ],
                columns: ['Date', 'Company', 'Account', 'Description', 'From To', 'Type', 'Mode', 'Reference', 'Debit', 'Credit', 'Net Effect', 'Running Balance'],
                rows: rows.map((txn) => ({
                    Date: sanitizeText(txn.date),
                    Company: sanitizeText(txn.company),
                    Account: sanitizeText(txn.account),
                    Description: sanitizeText(txn.description),
                    'From To': sanitizeText(txn.fromTo),
                    Type: sanitizeText(txn.type),
                    Mode: sanitizeText(txn.mode),
                    Reference: sanitizeText(txn.ref),
                    Debit: Number(txn.debit || 0),
                    Credit: Number(txn.credit || 0),
                    'Net Effect': Number(txn.netEffect || 0),
                    'Running Balance': txn.balance == null ? '' : Number(txn.balance || 0)
                }))
            };
        }

        const periods = fullData.report?.periods || [];
        const totalCredit = Number(fullData.report?.totalCredit || 0);
        const totalDebit = Number(fullData.report?.totalDebit || 0);
        const netSavings = Number(fullData.report?.netSavings || 0);
        return {
            summary: [
                ['Report', getReportTitle()],
                ['Date Range', getRangeLabel()],
                ['Total Credit', formatCurrency(totalCredit)],
                ['Total Debit', formatCurrency(totalDebit)],
                ['Net Savings', formatCurrency(netSavings)],
                ['Total Periods', periods.length]
            ],
            columns: ['Period', 'Month', 'Year', 'Transactions', 'Credit', 'Debit', 'Net Flow', 'Trend Percent'],
            rows: periods.map((p) => ({
                Period: sanitizeText(p.period),
                Month: sanitizeText(p.month),
                Year: sanitizeText(p.year),
                Transactions: Number(p.txns || 0),
                Credit: Number(p.credit || 0),
                Debit: Number(p.debit || 0),
                'Net Flow': Number(p.credit || 0) - Number(p.debit || 0),
                'Trend Percent': Number(p.trend || 0)
            }))
        };
    };

    const exportToExcel = async () => {
        try {
            const data = buildExportPayload(await loadFullReportForExport());
            if (!data.rows.length) {
                Swal.fire('No data', 'No rows available for export.', 'info');
                return;
            }

            const wb = XLSX.utils.book_new();
            const summarySheet = XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ...data.summary]);
            const tableRows = data.rows.map((row) => {
                const out = {};
                data.columns.forEach((col) => { out[col] = row[col]; });
                return out;
            });
            const tableSheet = XLSX.utils.json_to_sheet(tableRows, { header: data.columns });
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
            XLSX.utils.book_append_sheet(wb, tableSheet, 'Report Data');
            XLSX.writeFile(wb, `${getExportFilePrefix()}.xlsx`);
        } catch (err) {
            Swal.fire('Export failed', err?.message || 'Unable to export Excel report', 'error');
        }
    };

    const exportToPdf = async () => {
        try {
            const data = buildExportPayload(await loadFullReportForExport());
            if (!data.rows.length) {
                Swal.fire('No data', 'No rows available for export.', 'info');
                return;
            }
    
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
    
            // ── Header band ──────────────────────────────────────────────
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageW, 72, 'F');
    
            // Logo block (left)
            doc.setFillColor(92, 103, 242);
            doc.roundedRect(30, 16, 38, 38, 4, 4, 'F');
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('F', 40, 41);
    
            // Report title
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(sanitizePdfText(getReportTitle()), 80, 33);
    
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(`Period: ${sanitizePdfText(getRangeLabel())}`, 80, 48);
    
            // Right side: generated date + confidential
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 30, 30, { align: 'right' });
            doc.setFillColor(92, 103, 242);
            doc.roundedRect(pageW - 110, 40, 80, 16, 3, 3, 'F');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('CONFIDENTIAL', pageW - 70, 51, { align: 'center' });
    
            // ── Summary cards ─────────────────────────────────────────────
            let cardY = 90;
            const cols = data.summary.length;
            const cardW = Math.min(150, (pageW - 60) / cols);
            const totalCardW = cols * cardW + (cols - 1) * 10;
            let cardX = (pageW - totalCardW) / 2;
    
            data.summary.forEach(([label, value]) => {
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(cardX, cardY, cardW, 44, 4, 4, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.5);
                doc.roundedRect(cardX, cardY, cardW, 44, 4, 4, 'S');
    
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(sanitizePdfText(label).toUpperCase(), cardX + cardW / 2, cardY + 13, { align: 'center' });
    
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                const valStr = sanitizePdfText(value);
                doc.text(valStr.length > 18 ? valStr.slice(0, 18) : valStr, cardX + cardW / 2, cardY + 30, { align: 'center' });
    
                cardX += cardW + 10;
            });
    
            // ── Section label ─────────────────────────────────────────────
            const tableStartY = cardY + 60;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(92, 103, 242);
            doc.text('TRANSACTION DETAILS', 30, tableStartY - 8);
            doc.setDrawColor(92, 103, 242);
            doc.setLineWidth(1.5);
            doc.line(30, tableStartY - 4, 160, tableStartY - 4);
    
            // ── Data table ────────────────────────────────────────────────
            const numericColumns = new Set(['Debit', 'Credit', 'Balance', 'Net Effect', 'Running Balance',
                'Transactions', 'Net Flow', 'Trend Percent']);
            const columnStyles = {};
            data.columns.forEach((col, i) => {
                if (numericColumns.has(col)) columnStyles[i] = { halign: 'right', fontStyle: 'normal' };
                if (col === 'Description') columnStyles[i] = { ...(columnStyles[i] || {}), cellWidth: 160 };
                if (col === 'From To') columnStyles[i] = { ...(columnStyles[i] || {}), cellWidth: 140 };
                if (col === 'Reference') columnStyles[i] = { ...(columnStyles[i] || {}), cellWidth: 100 };
            });
    
            autoTable(doc, {
                startY: tableStartY,
                head: [data.columns.map(c => sanitizePdfText(c))],
                body: data.rows.map(row => data.columns.map(col => {
                    const value = row[col];
                    if (numericColumns.has(col) && value !== '' && value !== '-') {
                        return Number(value || 0).toLocaleString('en-IN');
                    }
                    return sanitizePdfText(value);
                })),
                theme: 'plain',
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 7.5,
                    cellPadding: { top: 8, bottom: 8, left: 6, right: 6 },
                    lineColor: [15, 23, 42],
                    lineWidth: 0
                },
                bodyStyles: {
                    fontSize: 7.5,
                    cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
                    lineColor: [241, 245, 249],
                    lineWidth: { bottom: 0.5 },
                    textColor: [51, 65, 85]
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles,
                margin: { left: 20, right: 20, top: 72, bottom: 30 },
                didDrawPage: (tableData) => {
                    // Header on each page (except first which already has it)
                    if (tableData.pageNumber > 1) {
                        doc.setFillColor(15, 23, 42);
                        doc.rect(0, 0, pageW, 36, 'F');
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(255, 255, 255);
                        doc.text(sanitizePdfText(getReportTitle()), 30, 23);
                        doc.setFontSize(7.5);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(148, 163, 184);
                        doc.text(`Period: ${sanitizePdfText(getRangeLabel())}`, pageW - 30, 23, { align: 'right' });
                    }
                    // Footer strip
                    doc.setFillColor(248, 250, 252);
                    doc.rect(0, pageH - 22, pageW, 22, 'F');
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.5);
                    doc.line(0, pageH - 22, pageW, pageH - 22);
                    doc.setFontSize(7.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    doc.text('Generated by Financial Reports System', 30, pageH - 8);
                    doc.text(
                        `Page ${tableData.pageNumber}`,
                        pageW - 30, pageH - 8, { align: 'right' }
                    );
                    doc.text(
                        new Date().toLocaleDateString('en-GB'),
                        pageW / 2, pageH - 8, { align: 'center' }
                    );
                }
            });
    
            doc.save(`${getExportFilePrefix()}.pdf`);
        } catch (err) {
            Swal.fire('Export failed', err?.message || 'Unable to export PDF report', 'error');
        }
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const printReport = async () => {
        try {
            const data = buildExportPayload(await loadFullReportForExport());
            if (!data.rows.length) {
                Swal.fire('No data', 'No rows available for print.', 'info');
                return;
            }

            const printWindow = window.open('', '_blank', 'width=1280,height=900');
            if (!printWindow) {
                Swal.fire('Popup blocked', 'Please allow popups to print the report.', 'warning');
                return;
            }

            const summaryHtml = data.summary.map(([metric, value]) => `
                <div class="p-summary-card">
                    <div class="p-summary-label">${escapeHtml(sanitizeText(metric))}</div>
                    <div class="p-summary-value">${escapeHtml(sanitizeText(value))}</div>
                </div>
            `).join('');
            const headHtml = data.columns.map((col) => `<th>${escapeHtml(sanitizeText(col))}</th>`).join('');
            const bodyHtml = data.rows.map((row) => `<tr>${data.columns.map((col) => `<td>${escapeHtml(sanitizeText(row[col]))}</td>`).join('')}</tr>`).join('');

            printWindow.document.write(`
                <html>
                    <head>
                        <title>${escapeHtml(getReportTitle())}</title>
                        <style>
                            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 12px; }

                            /* ── Page header ── */
                            .p-page-header { background: #0f172a; color: #fff; padding: 18px 28px 14px; display: flex; justify-content: space-between; align-items: flex-start; }
                            .p-logo-block { display: flex; align-items: center; gap: 12px; }
                            .p-logo-sq { width: 36px; height: 36px; background: #5c67f2; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; color: #fff; flex-shrink: 0; }
                            .p-org-name { font-size: 11px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
                            .p-report-name { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
                            .p-header-right { text-align: right; }
                            .p-confidential { display: inline-block; background: #5c67f2; color: #fff; font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
                            .p-gen-date { font-size: 10px; color: #94a3b8; }

                            /* ── Meta strip ── */
                            .p-meta-strip { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px 28px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
                            .p-meta-item { font-size: 10px; color: #64748b; }
                            .p-meta-item strong { color: #1e293b; font-weight: 700; }

                            /* ── Summary cards ── */
                            .p-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; padding: 14px 28px; border-bottom: 1px solid #e2e8f0; background: #fff; }
                            .p-summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
                            .p-summary-label { font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 4px; }
                            .p-summary-value { font-size: 14px; font-weight: 700; color: #1e293b; }

                            /* ── Section header ── */
                            .p-section-header { padding: 12px 28px 6px; display: flex; align-items: center; gap: 10px; }
                            .p-section-title { font-size: 10px; font-weight: 700; color: #5c67f2; text-transform: uppercase; letter-spacing: 0.06em; }
                            .p-section-line { flex: 1; height: 1px; background: #e2e8f0; }

                            /* ── Table ── */
                            .p-table-wrap { padding: 0 28px 20px; overflow-x: auto; }
                            table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
                            thead tr { background: #0f172a; }
                            thead th { color: #fff; padding: 9px 8px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; border: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                            thead th:first-child { border-radius: 0; }
                            tbody td { padding: 8px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                            tbody tr:nth-child(even) td { background: #f8fafc; }
                            tbody tr:hover td { background: #f1f5f9; }

                            /* ── Footer ── */
                            .p-footer { margin-top: 14px; padding: 10px 28px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
                            .p-footer-text { font-size: 9px; color: #94a3b8; }

                            @media print {
                                @page { margin: 8mm 10mm; size: landscape; }
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                .p-page-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                tbody tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                .p-summary-card { page-break-inside: avoid; }
                                table { page-break-inside: auto; }
                                tr { page-break-inside: avoid; page-break-after: auto; }
                                thead { display: table-header-group; }
                            }
                    </style>
                    </head>
                    <body>
                        <div class="p-page-header">
                            <div class="p-logo-block">
                                <div class="p-logo-sq">F</div>
                                <div>
                                    <div class="p-org-name">Financial Reports</div>
                                    <div class="p-report-name">${escapeHtml(getReportTitle())}</div>
                                </div>
                            </div>
                            <div class="p-header-right">
                                <div class="p-confidential">Confidential</div>
                                <div class="p-gen-date">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
                            </div>
                        </div>

                        <div class="p-meta-strip">
                            <div class="p-meta-item"><strong>Period:</strong> ${escapeHtml(getRangeLabel())}</div>
                            <div class="p-meta-item"><strong>Report Type:</strong> ${escapeHtml(getReportTitle())}</div>
                            <div class="p-meta-item"><strong>Total Records:</strong> ${data.rows.length}</div>
                        </div>

                        <div class="p-summary-grid">
                            ${data.summary.map(([metric, value]) => `
                                <div class="p-summary-card">
                                    <div class="p-summary-label">${escapeHtml(sanitizeText(metric))}</div>
                                    <div class="p-summary-value">${escapeHtml(sanitizeText(value))}</div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="p-section-header">
                            <span class="p-section-title">Transaction Details</span>
                            <div class="p-section-line"></div>
                        </div>

                        <div class="p-table-wrap">
                            <table>
                                <thead><tr>${headHtml}</tr></thead>
                                <tbody>${bodyHtml}</tbody>
                            </table>
                        </div>

                        <div class="p-footer">
                            <span class="p-footer-text">Financial Reports System &mdash; Confidential &amp; Proprietary</span>
                            <span class="p-footer-text">${escapeHtml(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))}</span>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } catch (err) {
            Swal.fire('Print failed', err?.message || 'Unable to prepare report for print', 'error');
        }
    };

    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [companies, accounts, modes] = await Promise.all([
                    apiService.getAllPages('/companies').catch(() => []),
                    apiService.getAllPages('/accounts').catch(() => []),
                    apiService.getAllPages('/payment-modes').catch(() => [])
                ]);
                setCompanyOptions(companies || []);
                setAccountOptions(accounts || []);
                setPaymentModeOptions(modes || []);
            } catch {
                setCompanyOptions([]);
                setAccountOptions([]);
                setPaymentModeOptions([]);
            }
        };

        loadFilterOptions();
    }, []);

    const fetchBankStatement = async () => {
        const requestBody = {
            dateFrom: filters.dateFrom || null,
            dateTo: filters.dateTo || null,
            companyIds: filters.companyIds,
            accountIds: filters.accountIds,
            paymentModeId: filters.paymentModeId,
            txnType: filters.txnType,
            search: filters.search
        };

        const res = await apiService.post(
            `/reports/bank-statement/paged?page=${Math.max(currentPage - 1, 0)}&size=${itemsPerPage}&sortBy=${sortConfig.key}&sortDir=${sortConfig.direction}`,
            requestBody
        );

        setBankStatementRows(res?.content || []);
        setBankStatementTotal(res?.totalElements || 0);
        setBankStatementMeta({
            openingBalance: res?.openingBalance ?? null,
            currentBalance: res?.currentBalance ?? null,
            accountName: res?.accountName ?? null,
            companyName: res?.companyName ?? null,
            accountId: res?.accountId ?? null
        });
    };

    const fetchCompanyReport = async () => {
        const res = await apiService.post(
            `/reports/company-report/paged?page=${Math.max(currentPage - 1, 0)}&size=${itemsPerPage}&sortBy=${sortConfig.key}&sortDir=${sortConfig.direction}`,
            getRequestBody()
        );
        setCompanySummary(res || null);
    };

    const fetchCombinedReport = async () => {
        const res = await apiService.post(
            `/reports/combined-report/paged?page=${Math.max(currentPage - 1, 0)}&size=${itemsPerPage}&sortBy=${sortConfig.key}&sortDir=${sortConfig.direction}`,
            getRequestBody()
        );
        setCombinedRows(res?.content || []);
        setCombinedTotal(res?.totalElements || 0);
    };

    const fetchDateWiseReport = async () => {
        const res = await apiService.post(
            `/reports/date-wise-report/paged?page=${Math.max(currentPage - 1, 0)}&size=${itemsPerPage}`,
            getRequestBody()
        );
        setDateWiseReport(res || null);
    };

    const fetchDateWiseDetails = async (period, page = 1, size = 10) => {
        if (!period) return;
        setIsLoadingDateWiseDetails(true);
        try {
            const encodedPeriod = encodeURIComponent(period);
            const res = await apiService.post(
                `/reports/date-wise-report/transactions?period=${encodedPeriod}&page=${Math.max(page - 1, 0)}&size=${size}&sortBy=date&sortDir=desc`,
                getRequestBody()
            );
            setDateWiseDetails({
                period: res?.period || period,
                totalCredit: Number(res?.totalCredit || 0),
                totalDebit: Number(res?.totalDebit || 0),
                netAmount: Number(res?.netAmount || 0),
                content: res?.content || [],
                totalElements: Number(res?.totalElements || 0),
                page: Number(res?.page || 0),
                size: Number(res?.size || size)
            });
        } catch (err) {
            Swal.fire('Error', err?.message || 'Failed to load period transactions', 'error');
        } finally {
            setIsLoadingDateWiseDetails(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            if (activePage === 'bank-statement') {
                await fetchBankStatement();
            } else if (activePage === 'company-report') {
                await fetchCompanyReport();
            } else if (activePage === 'combined-report') {
                await fetchCombinedReport();
            } else if (activePage === 'date-wise-report') {
                await fetchDateWiseReport();
            }
        } catch (err) {
            Swal.fire('Error', err?.message || 'Failed to generate report', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            dateFrom: defaultRange.fromIso,
            dateTo: defaultRange.toIso,
            companyIds: [],
            accountIds: [],
            paymentModeId: null,
            txnType: 'all',
            search: ''
        });
        setCurrentPage(1);
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
        setCurrentPage(1);
    };

    const removeTag = (type, value) => {
        setFilters(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item !== value)
        }));
        setCurrentPage(1);
    };

    useEffect(() => {
        if (activePage === 'bank-statement') fetchBankStatement().catch(() => {});
        if (activePage === 'company-report') fetchCompanyReport().catch(() => {});
        if (activePage === 'combined-report') fetchCombinedReport().catch(() => {});
        if (activePage === 'date-wise-report') fetchDateWiseReport().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePage, currentPage, itemsPerPage, sortConfig.key, sortConfig.direction]);

    useEffect(() => {
        if (!drillDownData?.period) return;
        const page = Number(drillDownData.page || 1);
        const size = Number(drillDownData.size || 10);
        fetchDateWiseDetails(drillDownData.period, page, size);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drillDownData?.period, drillDownData?.page, drillDownData?.size]);

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
                        <div className="date-range-pair">
                            <input 
                                type="date" 
                                className="report-filter-input" 
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                            />
                            <input 
                                type="date" 
                                className="report-filter-input" 
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
                                    if (e.target.value) toggleItem('companyIds', Number(e.target.value));
                                    e.target.value = '';
                                }}
                            >
                                <option value="">Add Company...</option>
                                {companyOptions.map(c => (
                                    <option key={c.id} value={c.id} disabled={filters.companyIds.includes(c.id)}>{c.name}</option>
                                ))}
                            </select>
                            <div className="selected-tags mt-2">
                                {filters.companyIds.length === 0 ? (
                                    <span className="tag-all">All Companies Selected</span>
                                ) : (
                                    filters.companyIds.map(id => (
                                        <span key={id} className="filter-tag">
                                            {(companyOptions.find(c => c.id === id)?.name) || id}{' '}
                                            <i className="bi bi-x" onClick={() => removeTag('companyIds', id)}></i>
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
                                    if (e.target.value) toggleItem('accountIds', Number(e.target.value));
                                    e.target.value = '';
                                }}
                            >
                                <option value="">Add Account...</option>
                                {accountOptions.map(a => (
                                    <option key={a.id} value={a.id} disabled={filters.accountIds.includes(a.id)}>{a.name}</option>
                                ))}
                            </select>
                            <div className="selected-tags mt-2">
                                {filters.accountIds.length === 0 ? (
                                    <span className="tag-all">All Accounts Selected</span>
                                ) : (
                                    filters.accountIds.map(id => (
                                        <span key={id} className="filter-tag">
                                            {(accountOptions.find(a => a.id === id)?.name) || id}{' '}
                                            <i className="bi bi-x" onClick={() => removeTag('accountIds', id)}></i>
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
                            value={filters.paymentModeId ?? 'all'}
                            onChange={(e) => {
                                const v = e.target.value;
                                setFilters({ ...filters, paymentModeId: v === 'all' ? null : Number(v) });
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All Modes</option>
                            {paymentModeOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                                rows={bankStatementRows}
                                totalItems={bankStatementTotal}
                                meta={bankStatementMeta}
                                fallbackSubtitle={selectedSingleAccountLabel}
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
                                report={companySummary}
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
                                transactions={combinedRows}
                                totalItems={combinedTotal}
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
                        {activePage === 'date-wise-report' && (
                            <DateWiseReportView
                                report={dateWiseReport}
                                filters={filters}
                                currentPage={currentPage}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={(val) => {
                                    setItemsPerPage(val);
                                    setCurrentPage(1);
                                }}
                                setDrillDown={setDrillDownData}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Export Actions */}
            {!isGenerating && (
                <div className="export-actions mt-4 mb-5">
                    <button className="btn-export pdf" onClick={exportToPdf} disabled={isViewer || !hasExportableData} title={isViewer ? 'Viewer can print only' : ''}><i className="bi bi-file-earmark-pdf"></i> Export PDF</button>
                    <button className="btn-export excel" onClick={exportToExcel} disabled={isViewer || !hasExportableData} title={isViewer ? 'Viewer can print only' : ''}><i className="bi bi-file-earmark-excel"></i> Export Excel</button>
                    <button className="btn-export print" onClick={printReport} disabled={!hasExportableData}><i className="bi bi-printer"></i> Print Report</button>
                </div>
            )}

            {/* Drill-down Modal */}
            {drillDownData && (
                <>
                    <div className="modal-backdrop fade show" onClick={() => setDrillDownData(null)}></div>
                    <div className="modal fade show d-block dd-modal" tabIndex="-1" role="dialog">
                        <div className="modal-dialog modal-lg modal-dialog-centered dd-modal-dialog" role="document">
                            <div className="modal-content dd-modal-content">

                                {/* Modal Header */}
                                <div className="dd-modal-header">
                                    <div className="dd-modal-title-block">
                                        <div className="dd-modal-drag-handle"></div>
                                        <div className="dd-modal-title-row">
                                            <div>
                                                <div className="dd-modal-period">{drillDownData.period}</div>
                                                <div className="dd-modal-subtitle">Transaction Details</div>
                                            </div>
                                            <button className="dd-modal-close" onClick={() => setDrillDownData(null)}>
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Summary pills */}
                                    <div className="dd-modal-pills">
                                        <span className="dd-pill income"><i className="bi bi-arrow-up-right me-1"></i>₹{Number(dateWiseDetails.totalCredit || drillDownData.credit || 0).toLocaleString('en-IN')}</span>
                                        <span className="dd-pill expense"><i className="bi bi-arrow-down-right me-1"></i>₹{Number(dateWiseDetails.totalDebit || drillDownData.debit || 0).toLocaleString('en-IN')}</span>
                                        <span className="dd-pill net"><i className="bi bi-graph-up me-1"></i>₹{Number(dateWiseDetails.netAmount || drillDownData.net || 0).toLocaleString('en-IN')} Net</span>
                                    </div>
                                </div>

                                {/* Transaction Cards */}
                                <div className="dd-modal-body">
                                    {isLoadingDateWiseDetails && (
                                        <div className="text-center py-4 text-muted">
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Loading transactions...
                                        </div>
                                    )}
                                    {!isLoadingDateWiseDetails && (dateWiseDetails.content || []).map((t) => (
                                        <div key={t.id} className="dd-txn-card">
                                            <div className="dd-txn-left">
                                                <div className="dd-txn-icon-wrap" style={{
                                                    background: t.type === 'Received' ? '#ecfdf5' : t.type === 'Paid' ? '#fef2f2' : '#eff6ff'
                                                }}>
                                                    <i className={`bi ${t.type === 'Received' ? 'bi-arrow-down-left' : t.type === 'Paid' ? 'bi-arrow-up-right' : 'bi-arrow-left-right'}`}
                                                        style={{ color: t.type === 'Received' ? '#10b981' : t.type === 'Paid' ? '#ef4444' : '#3b82f6', fontSize: '1rem' }}
                                                    ></i>
                                                </div>
                                                <div className="dd-txn-info">
                                                    <span className="dd-txn-desc">{t.description || '-'}</span>
                                                    <span className="dd-txn-meta">{t.date} · <code style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.ref}</code></span>
                                                </div>
                                            </div>
                                            <div className="dd-txn-right">
                                                <span className={`dd-txn-amount ${t.credit > 0 ? 'income' : t.type === 'Moved' ? 'transfer' : 'expense'}`}>
                                                    {t.type === 'Received' ? '+' : t.type === 'Moved' ? '↔' : '-'}₹{Number(t.credit || t.debit || 0).toLocaleString('en-IN')}
                                                </span>
                                                <span className={`dd-txn-badge ${t.type.toLowerCase()}`}>{t.type}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {!isLoadingDateWiseDetails && (!dateWiseDetails.content || dateWiseDetails.content.length === 0) && (
                                        <div className="text-center py-4 text-muted">No transactions found for this period.</div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="dd-modal-footer">
                                    <Pagination
                                        totalItems={dateWiseDetails.totalElements || 0}
                                        itemsPerPage={dateWiseDetails.size || 10}
                                        currentPage={(dateWiseDetails.page || 0) + 1}
                                        onPageChange={(page) => setDrillDownData(prev => ({ ...prev, page }))}
                                        onItemsPerPageChange={(size) => setDrillDownData(prev => ({ ...prev, page: 1, size }))}
                                    />
                                    <button className="dd-close-btn" onClick={() => setDrillDownData(null)}>
                                        Done
                                    </button>
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

const BankStatementView = ({ rows, totalItems, meta, fallbackSubtitle, filters, onSort, sortConfig, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    if (!rows || rows.length === 0) return (
        <div className="empty-state">
            <i className="bi bi-inbox empty-state-icon"></i>
            <p className="empty-state-text">No data available for selected filters</p>
        </div>
    );

    const openingBalance = meta?.openingBalance;
    const currentBalance = meta?.currentBalance;

    const subtitle = meta?.accountName
        ? `${meta.accountName}${meta.companyName ? ` (${meta.companyName})` : ''}`
        : (fallbackSubtitle || (filters.accountIds?.length > 1
            ? `${filters.accountIds.length} Accounts Selected`
            : (filters.accountIds?.length === 1
                ? 'Selected Account'
                : 'All Accounts')));

    return (
        <>
            <div className="report-header">
                <div className="report-title-row">
                    <div className="report-title-main">
                        <h2>Bank Statement</h2>
                        <div className="report-subtitle">
                            <i className="bi bi-bank me-2"></i>
                            <strong>{subtitle}</strong>
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
                        <i className="bi bi-question-circle opening-balance-tooltip" title="Opening/current balance is shown when exactly one account is selected."></i>
                    </div>
                    <span className="stat-value">
                        {openingBalance === null || typeof openingBalance === 'undefined'
                            ? '—'
                            : `₹${Number(openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Current Balance</span>
                    <span className="stat-value" style={{ color: '#5c67f2' }}>
                        {currentBalance === null || typeof currentBalance === 'undefined'
                            ? '—'
                            : `₹${Number(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </span>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="report-table-desktop">
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
                            {rows.map(txn => (
                                <tr key={txn.id} className="statement-row">
                                    <td>{txn.date}</td>
                                    <td><code className="small text-primary">{txn.id}</code></td>
                                    <td>{txn.description}</td>
                                    <td>{txn.fromTo}</td>
                                    <td>
                                        <span className={`badge rounded-pill ${txn.type === 'Received' ? 'bg-success-subtle text-success' : txn.type === 'Paid' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`}>
                                            {txn.type}
                                        </span>
                                    </td>
                                    <td>{txn.mode}</td>
                                    <td><code className="text-muted small">{txn.ref}</code></td>
                                    <td className="text-end amount-out">{txn.debit > 0 ? `₹${txn.debit.toLocaleString()}` : '-'}</td>
                                    <td className="text-end amount-in">{txn.credit > 0 ? `₹${txn.credit.toLocaleString()}` : '-'}</td>
                                    <td className="text-end running-balance">
                                        {txn.balance === null || typeof txn.balance === 'undefined'
                                            ? '-'
                                            : `₹${Number(txn.balance).toLocaleString('en-IN')}`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="report-mobile-cards">
                {rows.map(txn => (
                    <div key={txn.id} className="report-txn-card">
                        <div className="rtcard-header">
                            <span className="rtcard-id">{txn.id}</span>
                            <span className="rtcard-date">{txn.date}</span>
                            <span className={`badge rounded-pill ${txn.type === 'Received' ? 'bg-success-subtle text-success' : txn.type === 'Paid' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`}>{txn.type}</span>
                        </div>
                        <div className="rtcard-body">
                            <div className="rtcard-desc">{txn.description}</div>
                            <div className="rtcard-row">
                                <span className="rtcard-label">From → To</span>
                                <span className="rtcard-value">{txn.fromTo}</span>
                            </div>
                            <div className="rtcard-row">
                                <span className="rtcard-label">Mode</span>
                                <span className="rtcard-value">{txn.mode}</span>
                            </div>
                            <div className="rtcard-row">
                                <span className="rtcard-label">Ref</span>
                                <code className="rtcard-value" style={{fontSize:'0.76rem'}}>{txn.ref}</code>
                            </div>
                        </div>
                        <div className="rtcard-footer">
                            <div>
                                <div style={{fontSize:'0.65rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>{txn.debit > 0 ? 'Debit' : 'Credit'}</div>
                                {txn.debit > 0
                                    ? <span className="rtcard-amount-out">-₹{txn.debit.toLocaleString()}</span>
                                    : <span className="rtcard-amount-in">+₹{txn.credit.toLocaleString()}</span>
                                }
                            </div>
                            <div style={{textAlign:'right'}}>
                                <div style={{fontSize:'0.65rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Balance</div>
                                <span className="rtcard-balance">
                                    {txn.balance === null || typeof txn.balance === 'undefined'
                                        ? '-'
                                        : `₹${Number(txn.balance).toLocaleString('en-IN')}`}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Pagination 
                totalItems={totalItems}
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

const CompanyReportView = ({ report, filters, sortConfig, onSort, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    const recentTransactions = report?.recentTransactions || [];
    const totalCredit = Number(report?.totalCredit || 0);
    const totalDebit = Number(report?.totalDebit || 0);
    const accountBreakdown = Object.entries(report?.accountBreakdown || {});
    
    return (
        <div className="p-4">
            <div className="report-header px-0 border-0 mb-4">
                <h2>Company Financial Summary</h2>
                <p className="report-subtitle">Analysis for selected filters | Period: {filters.dateFrom} - {filters.dateTo}</p>
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
                        {accountBreakdown.length === 0 && <li className="breakdown-list-item"><span>No data</span><span className="fw-bold">₹0</span></li>}
                        {accountBreakdown.map(([accName, amt]) => (
                            <li key={accName} className="breakdown-list-item">
                                <span>{accName}</span>
                                <span className="fw-bold">₹{Number(amt || 0).toLocaleString('en-IN')}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="breakdown-card">
                    <div className="card-header-small">Financial Insights</div>
                    <ul className="breakdown-list">
                        <li className="breakdown-list-item">
                            <span className="text-muted small">Total Income</span>
                            <span className="insight-chip top-income">₹{totalCredit.toLocaleString('en-IN')}</span>
                        </li>
                        <li className="breakdown-list-item">
                            <span className="text-muted small">Total Expense</span>
                            <span className="insight-chip top-expense">₹{totalDebit.toLocaleString('en-IN')}</span>
                        </li>
                        <li className="breakdown-list-item">
                            <span className="text-muted small">Net Position</span>
                            <span className="fw-bold text-primary">₹{(totalCredit - totalDebit).toLocaleString('en-IN')}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <h5 className="mb-3 fw-bold">Recent Company Transactions</h5>
            {/* Desktop Table */}
            <div className="report-table-desktop statement-table-wrapper border rounded">
                <table className="statement-table">
                    <thead>
                        <tr>
                            <th className="sortable-header" onClick={() => onSort('date')}>Date <i className={`bi bi-caret-${sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'up'}`}></i></th>
                            <th>Account</th>
                            <th>Description</th>
                            <th className="text-end sortable-header" onClick={() => onSort('amount')}>Amount <i className={`bi bi-caret-${sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'up'}`}></i></th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTransactions.map(txn => (
                            <tr key={txn.id}>
                                <td>{txn.date}</td>
                                <td>{txn.account}</td>
                                <td>{txn.description}</td>
                                <td className={`text-end fw-bold ${txn.credit > 0 ? 'text-success' : 'text-danger'}`}>
                                    {txn.credit > 0 ? `+₹${txn.credit.toLocaleString()}` : `-₹${txn.debit.toLocaleString()}`}
                                </td>
                                <td>{txn.type}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile Cards */}
            <div className="report-mobile-cards">
                {recentTransactions.map(txn => (
                    <div key={txn.id} className="report-txn-card">
                        <div className="rtcard-header">
                            <span className="rtcard-date">{txn.date}</span>
                            <span className="rtcard-value fw-semibold">{txn.account}</span>
                            <span className={`badge rounded-pill ${txn.credit > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>{txn.type}</span>
                        </div>
                        <div className="rtcard-body">
                            <div className="rtcard-desc">{txn.description}</div>
                        </div>
                        <div className="rtcard-footer">
                            <span style={{fontSize:'0.76rem', color:'#64748b'}}>Amount</span>
                            <span className={txn.credit > 0 ? 'rtcard-amount-in' : 'rtcard-amount-out'}>
                                {txn.credit > 0 ? `+₹${txn.credit.toLocaleString()}` : `-₹${txn.debit.toLocaleString()}`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <Pagination 
                totalItems={report?.totalElements || 0}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={onPageChange}
                onItemsPerPageChange={onItemsPerPageChange}
            />
        </div>
    );
};

const CombinedReportView = ({ transactions, totalItems, filters, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    const tableData = transactions.map(txn => {
        const credit = Number(txn.credit || 0);
        const debit = Number(txn.debit || 0);
        const netEffect = txn.type === 'Moved' ? 0 : (credit - debit);
        return { ...txn, netEffect, runningBal: Number(txn.balance || 0) };
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

            {/* Desktop Table */}
            <div className="report-table-desktop statement-table-wrapper">
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
                        {tableData.map(txn => (
                            <tr key={txn.id}>
                                <td>{txn.date}</td>
                                <td className="fw-semibold">{txn.company}</td>
                                <td>{txn.account}</td>
                                <td>{txn.fromTo}</td>
                                <td>{txn.type}</td>
                                <td className="text-end text-danger">{txn.debit > 0 ? `₹${txn.debit.toLocaleString()}` : '-'}</td>
                                <td className="text-end text-success">{txn.credit > 0 ? `₹${txn.credit.toLocaleString()}` : '-'}</td>
                                <td className="text-end fw-bold">₹{Number(txn.netEffect || 0).toLocaleString('en-IN')}</td>
                                <td className="text-end running-balance">
                                    {txn.balance === null || typeof txn.balance === 'undefined'
                                        ? '-'
                                        : `₹${Number(txn.balance).toLocaleString('en-IN')}`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="report-mobile-cards">
                {tableData.map(txn => (
                    <div key={txn.id} className="report-txn-card">
                        <div className="rtcard-header">
                            <span className="rtcard-date">{txn.date}</span>
                            <span className="rtcard-id">{txn.company}</span>
                            <span className={`badge rounded-pill ${txn.type === 'Received' ? 'bg-success-subtle text-success' : txn.type === 'Paid' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`}>{txn.type}</span>
                        </div>
                        <div className="rtcard-body">
                            <div className="rtcard-row">
                                <span className="rtcard-label">Account</span>
                                <span className="rtcard-value">{txn.account}</span>
                            </div>
                            <div className="rtcard-row">
                                <span className="rtcard-label">From → To</span>
                                <span className="rtcard-value">{txn.fromTo}</span>
                            </div>
                            <div className="rtcard-row">
                                <span className="rtcard-label">Net Effect</span>
                                <span className="rtcard-value fw-bold" style={{color: Number(txn.netEffect || 0) >= 0 ? '#10b981' : '#ef4444'}}>
                                    ₹{Number(txn.netEffect || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                        <div className="rtcard-footer">
                            <div>
                                <div style={{fontSize:'0.65rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>
                                    {txn.debit > 0 ? 'Debit' : 'Credit'}
                                </div>
                                {txn.debit > 0
                                    ? <span className="rtcard-amount-out">-₹{txn.debit.toLocaleString()}</span>
                                    : <span className="rtcard-amount-in">+₹{txn.credit.toLocaleString()}</span>
                                }
                            </div>
                            <div style={{textAlign:'right'}}>
                                <div style={{fontSize:'0.65rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Balance</div>
                                <span className="rtcard-balance">
                                    {txn.balance === null || typeof txn.balance === 'undefined'
                                        ? '-'
                                        : `₹${Number(txn.balance).toLocaleString('en-IN')}`}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>


            <Pagination 
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={onPageChange}
                onItemsPerPageChange={onItemsPerPageChange}
            />
        </>
    );
};

const DateWiseReportView = ({ report, filters, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange, setDrillDown }) => {
    const periods = report?.periods || [];
    const totalCredit = Number(report?.totalCredit || 0);
    const totalDebit = Number(report?.totalDebit || 0);
    const netSavings = Number(report?.netSavings || 0);
    const totalTransactions = Number(report?.totalTransactions || 0);

    const barData = {
        labels: periods.map(p => p.month),
        datasets: [
            {
                label: 'Credit',
                data: periods.map(p => Number(p.credit || 0)),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: '#10b981',
                borderWidth: 1,
            },
            {
                label: 'Debit',
                data: periods.map(p => Number(p.debit || 0)),
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: '#ef4444',
                borderWidth: 1,
            },
        ],
    };

    const lineData = {
        labels: (report?.balanceTrend || []).map(p => p.label),
        datasets: [
            {
                label: 'Running Balance',
                data: (report?.balanceTrend || []).map(p => Number(p.value || 0)),
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
            {!report && (
                <div className="empty-state">
                    <i className="bi bi-inbox empty-state-icon"></i>
                    <p className="empty-state-text">No date-wise data available for selected filters</p>
                </div>
            )}
            {report && (
            <>
            <div className="report-header">
                <div className="report-title-row">
                    <div className="report-title-main">
                        <h2>Date-wise Performance</h2>
                        <p className="report-subtitle">Monthly & quarterly trends from real transaction data</p>
                    </div>
                    <div className="report-meta">
                        <div>Generated: {new Date().toLocaleString()}</div>
                        <div>Range: {filters.dateFrom} to {filters.dateTo}</div>
                    </div>
                </div>
            </div>

            <div className="dw-kpi-strip">
                <div className="dw-kpi-item">
                    <i className="bi bi-arrow-up-circle-fill dw-kpi-icon income"></i>
                    <div><div className="dw-kpi-label">Total Income</div><div className="dw-kpi-value income">₹{totalCredit.toLocaleString('en-IN')}</div></div>
                </div>
                <div className="dw-kpi-divider"></div>
                <div className="dw-kpi-item">
                    <i className="bi bi-arrow-down-circle-fill dw-kpi-icon expense"></i>
                    <div><div className="dw-kpi-label">Total Expense</div><div className="dw-kpi-value expense">₹{totalDebit.toLocaleString('en-IN')}</div></div>
                </div>
                <div className="dw-kpi-divider"></div>
                <div className="dw-kpi-item">
                    <i className="bi bi-graph-up-arrow dw-kpi-icon net"></i>
                    <div><div className="dw-kpi-label">Net Savings</div><div className="dw-kpi-value net">₹{netSavings.toLocaleString('en-IN')}</div></div>
                </div>
                <div className="dw-kpi-divider"></div>
                <div className="dw-kpi-item">
                    <i className="bi bi-receipt dw-kpi-icon txn"></i>
                    <div><div className="dw-kpi-label">Transactions</div><div className="dw-kpi-value txn">{totalTransactions}</div></div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-container">
                    <div className="dw-chart-header"><span className="dw-chart-title">Credit vs Debit</span><span className="dw-chart-badge">Monthly</span></div>
                    <div style={{ height: '230px', width: '100%' }}><Bar data={barData} options={options} /></div>
                </div>
                <div className="chart-container">
                    <div className="dw-chart-header"><span className="dw-chart-title">Balance Trend</span><span className="dw-chart-badge">Running</span></div>
                    <div style={{ height: '230px', width: '100%' }}><Line data={lineData} options={options} /></div>
                </div>
            </div>

            <div className="dw-section-header">
                <span className="dw-section-title">Monthly Breakdown</span>
                <span className="dw-section-count">{report?.totalElements || 0} periods</span>
            </div>

            <div className="report-table-desktop p-4 pt-0">
                <div className="statement-table-wrapper border rounded">
                    <table className="statement-table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th className="text-end">Total Credit</th>
                                <th className="text-end">Total Debit</th>
                                <th className="text-end">Net Flow</th>
                                <th className="text-center">Txns</th>
                                <th className="text-center">Trend</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map(p => (
                                <tr key={p.period}>
                                    <td className="fw-semibold">{p.period}</td>
                                    <td className="text-end text-success fw-bold">₹{Number(p.credit || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-end text-danger fw-bold">₹{Number(p.debit || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-end fw-bold" style={{ color: '#5c67f2' }}>₹{(Number(p.credit || 0) - Number(p.debit || 0)).toLocaleString('en-IN')}</td>
                                    <td className="text-center">{p.txns}</td>
                                    <td className="text-center">
                                        <span className={`dw-trend-badge ${p.trendDir || 'up'}`}>
                                            <i className={`bi bi-arrow-${p.trendDir || 'up'}-right`}></i>
                                            {Math.abs(Number(p.trend || 0))}%
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-light border text-primary"
                                            onClick={() => setDrillDown({
                                                period: p.period,
                                                credit: Number(p.credit || 0),
                                                debit: Number(p.debit || 0),
                                                net: Number(p.credit || 0) - Number(p.debit || 0),
                                                page: 1,
                                                size: 10
                                            })}
                                        >
                                            <i className="bi bi-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="report-mobile-cards dw-period-cards">
                {periods.map((p) => {
                    const credit = Number(p.credit || 0);
                    const debit = Number(p.debit || 0);
                    const net = credit - debit;
                    const expenseRatio = credit > 0 ? Math.min((debit / credit) * 100, 100) : 100;
                    return (
                        <div key={p.period} className="dw-ios-card">
                            <div className="dw-ios-header">
                                <div className="dw-ios-month-badge">
                                    <span className="dw-ios-month">{(p.month || '---').toUpperCase()}</span>
                                    <span className="dw-ios-year">{p.year || ''}</span>
                                </div>
                                <div className="dw-ios-title-block">
                                    <div className="dw-ios-period">{p.period}</div>
                                    <div className="dw-ios-txn-count">{Number(p.txns || 0)} transactions</div>
                                </div>
                                <span className={`dw-trend-badge ${p.trendDir || 'up'}`}>
                                    <i className={`bi bi-arrow-${p.trendDir || 'up'}-right`}></i>
                                    {Math.abs(Number(p.trend || 0))}%
                                </span>
                            </div>

                            <div className="dw-ios-amounts">
                                <div className="dw-ios-amount-block">
                                    <span className="dw-ios-amount-label">Credit</span>
                                    <span className="dw-ios-amount income">₹{credit.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="dw-ios-amount-divider"></div>
                                <div className="dw-ios-amount-block">
                                    <span className="dw-ios-amount-label">Debit</span>
                                    <span className="dw-ios-amount expense">₹{debit.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            <div className="dw-ios-progress-section">
                                <div className="dw-ios-progress-labels">
                                    <span className="dw-ios-amount-label">Expense Ratio</span>
                                    <span className="dw-ios-amount-label">{Math.round(expenseRatio)}%</span>
                                </div>
                                <div className="dw-ios-progress-bar">
                                    <div className="dw-ios-progress-fill" style={{ width: `${Math.max(0, 100 - expenseRatio)}%` }}></div>
                                </div>
                            </div>

                            <div className="dw-ios-net-row">
                                <span className="dw-ios-net-label">Net Flow</span>
                                <span className={`dw-ios-net-amount ${net >= 0 ? 'positive' : 'negative'}`}>
                                    ₹{Math.abs(net).toLocaleString('en-IN')}
                                </span>
                            </div>

                            <button
                                className="dw-ios-cta"
                                onClick={() => setDrillDown({
                                    period: p.period,
                                    credit,
                                    debit,
                                    net,
                                    page: 1,
                                    size: 10
                                })}
                            >
                                <i className="bi bi-eye me-2"></i> View Transactions
                            </button>
                        </div>
                    );
                })}
                {periods.length === 0 && (
                    <div className="text-center py-4 text-muted">No period data available.</div>
                )}
            </div>

            <Pagination
                totalItems={report?.totalElements || 0}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={onPageChange}
                onItemsPerPageChange={onItemsPerPageChange}
            />
            </>
            )}
        </>
    );
};

export default ReportsPage;
