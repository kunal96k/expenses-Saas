import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination';
import './MastersPage.css';

const MastersPage = ({ activePage, userRole, mastersData, setMastersData, accounts }) => {
    const masterType = activePage.replace('-master', '');

    const masterTitles = {
        'company': 'Company Master',
        'bank': 'Bank Master',
        'payment-mode': 'Payment Mode Master',
        'category': 'Purpose / Category Master',
        'employee': 'Employee Master'
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formValues, setFormValues] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        if (!showModal) setFormValues(null);
    }, [showModal]);

    // Reset page on master type change
    useEffect(() => {
        setCurrentPage(1);
        setSearchQuery('');
    }, [masterType]);

    const isCompanyLinked = (companyId) => (accounts || []).some(a => a.companyId === companyId);
    const isBankLinked    = (bankId)    => (accounts || []).some(a => a.bankId    === bankId);

    // Filtered data
    const currentData = useMemo(() => {
        const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;
        const data = mastersData[dataKey] || [];
        const q = searchQuery.toLowerCase();
        if (!q) return data;
        return data.filter(item =>
            (item.name        && item.name.toLowerCase().includes(q)) ||
            (item.code        && item.code.toLowerCase().includes(q)) ||
            (item.type        && item.type.toLowerCase().includes(q)) ||
            (item.ifsc        && item.ifsc.toLowerCase().includes(q)) ||
            (item.branch      && item.branch.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q))
        );
    }, [mastersData, masterType, searchQuery]);

    // Pagination
    const totalPages    = Math.ceil(currentData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return currentData.slice(start, start + itemsPerPage);
    }, [currentData, currentPage, itemsPerPage]);

    const handleToggleStatus = (id) => {
        const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;
        setMastersData(prev => ({
            ...prev,
            [dataKey]: prev[dataKey].map(item =>
                item.id === id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item
            )
        }));
    };

    const handleDelete = (id) => {
        const dataKey  = masterType === 'payment-mode' ? 'paymentMode' : masterType;
        const isLinked = (dataKey === 'company' && isCompanyLinked(id)) || (dataKey === 'bank' && isBankLinked(id));

        Swal.fire({
            title: 'Delete Record?',
            text: isLinked
                ? '⚠ This record is in use and cannot be deleted. You may deactivate it instead.'
                : 'This action cannot be undone!',
            icon: isLinked ? 'error' : 'warning',
            showCancelButton: !isLinked,
            confirmButtonColor: '#ef4444',
            confirmButtonText: isLinked ? 'OK' : 'Yes, Delete',
            cancelButtonText: 'Cancel'
        }).then(result => {
            if (result.isConfirmed && !isLinked) {
                setMastersData(prev => ({
                    ...prev,
                    [dataKey]: prev[dataKey].filter(item => item.id !== id)
                }));
                Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record removed.', timer: 1500, showConfirmButton: false });
            }
        });
    };

    const openModal = (item = null) => {
        setSelectedItem(item);
        if (masterType === 'company') {
            setFormValues({
                code:     item?.code     || '',
                name:     item?.name     || '',
                type:     item?.type     || 'Pvt Ltd',
                gst:      item?.gst      || '',
                pan:      item?.pan      || '',
                phone:    item?.phone    || '',
                email:    item?.email    || '',
                address:  item?.address  || '',
                currency: item?.currency || 'INR (₹)',
                status:   item?.status   || 'Active'
            });
        } else if (masterType === 'bank') {
            setFormValues({
                name:   item?.name   || '',
                ifsc:   item?.ifsc   || '',
                branch: item?.branch || '',
                status: item?.status || 'Active'
            });
        } else if (masterType === 'payment-mode') {
            setFormValues({
                name:        item?.name        || '',
                description: item?.description || '',
                status:      item?.status      || 'Active'
            });
        } else if (masterType === 'category') {
            setFormValues({
                name:   item?.name   || '',
                type:   item?.type   || 'Expense',
                status: item?.status || 'Active'
            });
        }
        setShowModal(true);
    };

    const handleSave = () => {
        const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;

        // --- Company ---
        if (masterType === 'company') {
            const next = {
                code:     (formValues?.code     || '').trim().toUpperCase(),
                name:     (formValues?.name     || '').trim(),
                type:     formValues?.type     || 'Pvt Ltd',
                gst:      (formValues?.gst      || '').trim().toUpperCase(),
                pan:      (formValues?.pan      || '').trim().toUpperCase(),
                phone:    (formValues?.phone    || '').trim(),
                email:    (formValues?.email    || '').trim(),
                address:  (formValues?.address  || '').trim(),
                currency: formValues?.currency || 'INR (₹)',
                status:   formValues?.status   || 'Active'
            };

            if (!next.code) { Swal.fire('Validation Error', 'Company Code is required.', 'error'); return; }
            if (!next.name) { Swal.fire('Validation Error', 'Company Name is required.', 'error'); return; }

            if (next.gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(next.gst)) {
                Swal.fire('Validation Error', 'GST Number format is invalid.', 'error'); return;
            }
            if (next.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(next.pan)) {
                Swal.fire('Validation Error', 'PAN Number format is invalid.', 'error'); return;
            }

            const existing   = mastersData[dataKey] || [];
            const selectedId = selectedItem?.id;
            if (existing.some(c => c.id !== selectedId && (c.code || '').toUpperCase() === next.code)) {
                Swal.fire('Duplicate', 'Company Code must be unique.', 'error'); return;
            }
            if (existing.some(c => c.id !== selectedId && (c.name || '').toLowerCase() === next.name.toLowerCase())) {
                Swal.fire('Duplicate', 'Company Name must be unique.', 'error'); return;
            }

            if (selectedItem) {
                setMastersData(prev => ({ ...prev, [dataKey]: prev[dataKey].map(c => c.id === selectedItem.id ? { ...c, ...next } : c) }));
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Company record updated.', timer: 1500, showConfirmButton: false });
            } else {
                const nextId = existing.length ? Math.max(...existing.map(x => x.id || 0)) + 1 : 1;
                setMastersData(prev => ({ ...prev, [dataKey]: [{ id: nextId, ...next }, ...prev[dataKey]] }));
                Swal.fire({ icon: 'success', title: 'Saved', text: 'Company record added.', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false); setSelectedItem(null); return;
        }

        // --- Bank ---
        if (masterType === 'bank') {
            const next = {
                name:   (formValues?.name   || '').trim(),
                ifsc:   (formValues?.ifsc   || '').trim().toUpperCase(),
                branch: (formValues?.branch || '').trim(),
                status: formValues?.status || 'Active'
            };

            if (!next.name) { Swal.fire('Validation Error', 'Bank Name is required.', 'error'); return; }
            if (next.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(next.ifsc)) {
                Swal.fire('Validation Error', 'IFSC Code is invalid. Expected format: HDFC0XXXXXX', 'error'); return;
            }

            const existing   = mastersData[dataKey] || [];
            const selectedId = selectedItem?.id;
            if (existing.some(b => b.id !== selectedId && (b.name || '').toLowerCase() === next.name.toLowerCase())) {
                Swal.fire('Duplicate', 'Bank Name must be unique.', 'error'); return;
            }

            if (selectedItem) {
                setMastersData(prev => ({ ...prev, [dataKey]: prev[dataKey].map(b => b.id === selectedItem.id ? { ...b, ...next } : b) }));
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Bank record updated.', timer: 1500, showConfirmButton: false });
            } else {
                const nextId = existing.length ? Math.max(...existing.map(x => x.id || 0)) + 1 : 1;
                setMastersData(prev => ({ ...prev, [dataKey]: [{ id: nextId, ...next }, ...prev[dataKey]] }));
                Swal.fire({ icon: 'success', title: 'Saved', text: 'Bank record added.', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false); setSelectedItem(null); return;
        }

        // --- Payment Mode ---
        if (masterType === 'payment-mode') {
            const next = {
                name:        (formValues?.name        || '').trim(),
                description: (formValues?.description || '').trim(),
                status:      formValues?.status || 'Active'
            };

            if (!next.name) { Swal.fire('Validation Error', 'Payment Mode Name is required.', 'error'); return; }

            if (selectedItem) {
                setMastersData(prev => ({ ...prev, [dataKey]: prev[dataKey].map(p => p.id === selectedItem.id ? { ...p, ...next } : p) }));
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Payment Mode updated.', timer: 1500, showConfirmButton: false });
            } else {
                const existing = mastersData[dataKey] || [];
                const nextId   = existing.length ? Math.max(...existing.map(x => x.id || 0)) + 1 : 1;
                setMastersData(prev => ({ ...prev, [dataKey]: [{ id: nextId, ...next }, ...prev[dataKey]] }));
                Swal.fire({ icon: 'success', title: 'Saved', text: 'Payment Mode added.', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false); setSelectedItem(null); return;
        }

        // --- Category ---
        if (masterType === 'category') {
            const next = {
                name:   (formValues?.name   || '').trim(),
                type:   formValues?.type   || 'Expense',
                status: formValues?.status || 'Active'
            };

            if (!next.name) { Swal.fire('Validation Error', 'Category Name is required.', 'error'); return; }

            if (selectedItem) {
                setMastersData(prev => ({ ...prev, [dataKey]: prev[dataKey].map(c => c.id === selectedItem.id ? { ...c, ...next } : c) }));
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Category updated.', timer: 1500, showConfirmButton: false });
            } else {
                const existing = mastersData[dataKey] || [];
                const nextId   = existing.length ? Math.max(...existing.map(x => x.id || 0)) + 1 : 1;
                setMastersData(prev => ({ ...prev, [dataKey]: [{ id: nextId, ...next }, ...prev[dataKey]] }));
                Swal.fire({ icon: 'success', title: 'Saved', text: 'Category added.', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false); setSelectedItem(null); return;
        }

        setShowModal(false);
    };

    // ─── sr no base for current pagination page ───
    const srBase = (currentPage - 1) * itemsPerPage;

    return (
        <div className="master-container">
            {/* Page Header */}
            <div className="master-header">
                <div className="header-info">
                    <h2 className="master-title">{masterTitles[masterType] || 'Master'}</h2>
                    <p className="master-subtitle">Manage configuration data used across the entire system.</p>
                </div>
                <button className="btn-primary-custom" onClick={() => openModal()}>
                    <i className="bi bi-plus-lg"></i>
                    Add New
                </button>
            </div>

            {/* Table Card */}
            <div className="master-card fade-in">
                {/* Toolbar */}
                <div className="master-toolbar">
                    <div className="search-box">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <span className="master-toolbar-info">{currentData.length} record{currentData.length !== 1 ? 's' : ''} found</span>
                </div>

                {/* Table */}
                <div className="table-responsive">
                    <table className="master-table">
                        <thead>
                            <tr>
                                <th className="col-sr">#</th>

                                {/* Company Master Columns */}
                                {masterType === 'company' && <>
                                    <th>Code</th>
                                    <th>Company Name</th>
                                    <th>Type</th>
                                    <th>GST Number</th>
                                    <th>PAN Number</th>
                                    <th>Currency</th>
                                    <th>Contact</th>
                                    <th>Address</th>
                                </>}

                                {/* Bank Master Columns */}
                                {masterType === 'bank' && <>
                                    <th>Bank Name</th>
                                    <th>IFSC Code</th>
                                    <th>Branch</th>
                                </>}

                                {/* Payment Mode Columns */}
                                {masterType === 'payment-mode' && <>
                                    <th>Mode Name</th>
                                    <th>Description</th>
                                </>}

                                {/* Category Columns */}
                                {masterType === 'category' && <>
                                    <th>Category Name</th>
                                    <th>Type</th>
                                </>}

                                <th className="text-center">Status</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr className="empty-table-row">
                                    <td colSpan={10}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                                            <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>No records found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedData.map((item, idx) => (
                                <tr key={item.id} className={item.status === 'Inactive' ? 'row-inactive' : ''}>
                                    {/* SR No */}
                                    <td data-label="#" className="col-sr">{srBase + idx + 1}</td>

                                    {/* Company Columns */}
                                    {masterType === 'company' && <>
                                        <td data-label="Code"><code className="fw-bold" style={{ color: '#5c67f2', background: '#eef0fd', padding: '2px 7px', borderRadius: '5px', fontSize: '0.78rem' }}>{item.code}</code></td>
                                        <td data-label="Company Name" className="fw-bold" style={{ color: '#0f172a' }}>{item.name}</td>
                                        <td data-label="Type"><span className="badge bg-light text-dark border" style={{ fontSize: '0.72rem', fontWeight: 600 }}>{item.type}</span></td>
                                        <td data-label="GST Number"><code style={{ fontSize: '0.78rem', color: '#475569' }}>{item.gst || '—'}</code></td>
                                        <td data-label="PAN Number"><code style={{ fontSize: '0.78rem', color: '#475569' }}>{item.pan || '—'}</code></td>
                                        <td data-label="Currency"><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.currency || '—'}</span></td>
                                        <td data-label="Contact">
                                            {item.phone && <div className="small"><i className="bi bi-telephone me-1" style={{ color: '#94a3b8' }}></i>{item.phone}</div>}
                                            {item.email && <div className="small text-muted"><i className="bi bi-envelope me-1" style={{ color: '#94a3b8' }}></i>{item.email}</div>}
                                            {!item.phone && !item.email && <span className="text-muted">—</span>}
                                        </td>
                                        <td data-label="Address" className="small text-muted" style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.address}>{item.address || '—'}</td>
                                    </>}

                                    {/* Bank Columns */}
                                    {masterType === 'bank' && <>
                                        <td data-label="Bank Name" className="fw-bold">{item.name}</td>
                                        <td data-label="IFSC Code"><code style={{ fontSize: '0.78rem', color: '#5c67f2', background: '#eef0fd', padding: '2px 7px', borderRadius: '5px' }}>{item.ifsc || '—'}</code></td>
                                        <td data-label="Branch" className="small">{item.branch || '—'}</td>
                                    </>}

                                    {/* Payment Mode Columns */}
                                    {masterType === 'payment-mode' && <>
                                        <td data-label="Mode Name" className="fw-bold">{item.name}</td>
                                        <td data-label="Description" className="small text-muted">{item.description || '—'}</td>
                                    </>}

                                    {/* Category Columns */}
                                    {masterType === 'category' && <>
                                        <td data-label="Category Name" className="fw-bold">{item.name}</td>
                                        <td data-label="Type">
                                            <span className={`status-badge ${item.type === 'Income' ? 'status-credit' : 'status-debit'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                    </>}

                                    {/* Status Column */}
                                    <td data-label="Status" className="text-center">
                                        <div className="status-toggle-cell">
                                            <div className="form-check form-switch d-inline-block mb-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={item.status === 'Active'}
                                                    onChange={() => handleToggleStatus(item.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </div>
                                            <div className={`status-text-pill ${item.status.toLowerCase()}`}>{item.status}</div>
                                        </div>
                                    </td>

                                    {/* Actions Column */}
                                    <td data-label="Actions">
                                        <div className="action-btns">
                                            <button className="btn-icon" onClick={() => openModal(item)} title="Edit">
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="btn-icon text-danger" onClick={() => handleDelete(item.id)} title="Delete">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    totalItems={currentData.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={val => { setItemsPerPage(val); setCurrentPage(1); }}
                />
            </div>

            {/* ────────────── MASTER MODAL ────────────── */}
            {showModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
                        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                            <div className="modal-content border-0" style={{ borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

                                {/* Modal Header */}
                                <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: '16px 16px 0 0' }}>
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0" style={{ color: '#0f172a', fontSize: '1rem' }}>
                                            {selectedItem
                                                ? `Edit ${masterTitles[masterType]?.split(' ')[0]}`
                                                : `Add New ${masterTitles[masterType]?.split(' ')[0]}`}
                                        </h5>
                                        <p className="mb-0 mt-1" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                            {selectedItem ? 'Update the information below.' : 'Fill in the details to add a new record.'}
                                        </p>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>

                                {/* Modal Body */}
                                <div className="modal-body" style={{ padding: '28px 24px' }}>
                                    <div className="row g-4">

                                        {/* ── Company Fields ── */}
                                        {masterType === 'company' && <>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Company Code <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.code ?? ''}
                                                    placeholder="e.g. ACME"
                                                    disabled={!!selectedItem}
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), code: e.target.value }))}
                                                />
                                                {selectedItem && <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Code cannot be changed after creation</small>}
                                            </div>
                                            <div className="col-md-8">
                                                <label className="form-label-custom">Company Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.name ?? ''}
                                                    placeholder="Enter company name"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Company Type</label>
                                                <select className="form-control-custom" value={formValues?.type ?? 'Pvt Ltd'} onChange={e => setFormValues(v => ({ ...(v || {}), type: e.target.value }))}>
                                                    <option>Pvt Ltd</option>
                                                    <option>LLP</option>
                                                    <option>Partnership</option>
                                                    <option>Proprietorship</option>
                                                    <option>Public Ltd</option>
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Currency</label>
                                                <input type="text" className="form-control-custom" value={formValues?.currency ?? 'INR (₹)'} disabled />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Status</label>
                                                <select className="form-control-custom" value={formValues?.status ?? 'Active'} onChange={e => setFormValues(v => ({ ...(v || {}), status: e.target.value }))}>
                                                    <option>Active</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">GST Number</label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.gst ?? ''}
                                                    placeholder="27AAAAA0000A1Z5"
                                                    maxLength={15}
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), gst: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">PAN Number</label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.pan ?? ''}
                                                    placeholder="ABCDE1234F"
                                                    maxLength={10}
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), pan: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Phone</label>
                                                <input
                                                    type="tel"
                                                    className="form-control-custom"
                                                    value={formValues?.phone ?? ''}
                                                    placeholder="10-digit number"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), phone: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Email</label>
                                                <input
                                                    type="email"
                                                    className="form-control-custom"
                                                    value={formValues?.email ?? ''}
                                                    placeholder="email@company.com"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), email: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label-custom">Address</label>
                                                <textarea
                                                    className="form-control-custom"
                                                    value={formValues?.address ?? ''}
                                                    rows="2"
                                                    placeholder="Full registered address..."
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), address: e.target.value }))}
                                                ></textarea>
                                            </div>
                                        </>}

                                        {/* ── Bank Fields ── */}
                                        {masterType === 'bank' && <>
                                            <div className="col-md-8">
                                                <label className="form-label-custom">Bank Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.name ?? ''}
                                                    placeholder="e.g. HDFC Bank"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Status</label>
                                                <select className="form-control-custom" value={formValues?.status ?? 'Active'} onChange={e => setFormValues(v => ({ ...(v || {}), status: e.target.value }))}>
                                                    <option>Active</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">IFSC Code</label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.ifsc ?? ''}
                                                    placeholder="HDFC0XXXXXX"
                                                    maxLength={11}
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), ifsc: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Branch Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.branch ?? ''}
                                                    placeholder="e.g. Mumbai Main"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), branch: e.target.value }))}
                                                />
                                            </div>
                                        </>}

                                        {/* ── Payment Mode Fields ── */}
                                        {masterType === 'payment-mode' && <>
                                            <div className="col-md-8">
                                                <label className="form-label-custom">Mode Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.name ?? ''}
                                                    placeholder="e.g. NEFT / Cash / Cheque"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Status</label>
                                                <select className="form-control-custom" value={formValues?.status ?? 'Active'} onChange={e => setFormValues(v => ({ ...(v || {}), status: e.target.value }))}>
                                                    <option>Active</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label-custom">Description</label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.description ?? ''}
                                                    placeholder="Brief description of this payment mode"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), description: e.target.value }))}
                                                />
                                            </div>
                                        </>}

                                        {/* ── Category Fields ── */}
                                        {masterType === 'category' && <>
                                            <div className="col-md-8">
                                                <label className="form-label-custom">Category Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.name ?? ''}
                                                    placeholder="e.g. Salary, Consulting Fee"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Status</label>
                                                <select className="form-control-custom" value={formValues?.status ?? 'Active'} onChange={e => setFormValues(v => ({ ...(v || {}), status: e.target.value }))}>
                                                    <option>Active</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Transaction Type</label>
                                                <select className="form-control-custom" value={formValues?.type ?? 'Expense'} onChange={e => setFormValues(v => ({ ...(v || {}), type: e.target.value }))}>
                                                    <option>Income</option>
                                                    <option>Expense</option>
                                                </select>
                                            </div>
                                        </>}

                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', gap: '10px' }}>
                                    <button
                                        className="btn btn-light px-4 py-2 rounded-3"
                                        style={{ fontWeight: 600, fontSize: '0.84rem' }}
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary-custom flex-grow-1 py-2 rounded-3"
                                        onClick={handleSave}
                                        style={{ maxWidth: '280px' }}
                                    >
                                        <i className="bi bi-check2-circle me-2"></i>
                                        {selectedItem ? 'Update Record' : 'Save Record'}
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

export default MastersPage;
