import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination';
import './MastersPage.css';

const MastersPage = ({ activePage, userRole, mastersData, setMastersData, accounts }) => {
    // Determine which master we are looking at
    const masterType = activePage.replace('-master', '');
    
    // Mapping for display titles
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

    const isCompanyLinked = (companyId) => {
        return (accounts || []).some(a => a.companyId === companyId);
    };

    const isBankLinked = (bankId) => {
        return (accounts || []).some(a => a.bankId === bankId);
    };

    // Filter logic
    const currentData = useMemo(() => {
        const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;
        const data = mastersData[dataKey] || [];
        return data.filter(item => 
            (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.type && item.type.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [mastersData, masterType, searchQuery]);

    // Pagination Logic
    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return currentData.slice(startIndex, startIndex + itemsPerPage);
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
        // Validation check (Mock: always check if record is 'linked')
        const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;
        const isLinked =
            (dataKey === 'company' && isCompanyLinked(id)) ||
            (dataKey === 'bank' && isBankLinked(id));
        
        Swal.fire({
            title: 'Delete Record?',
            text: isLinked ? "⚠ This record is in use and cannot be deleted. You may deactivate it instead." : "This action cannot be undone!",
            icon: isLinked ? 'error' : 'warning',
            showCancelButton: !isLinked,
            confirmButtonColor: '#ef4444',
            confirmButtonText: isLinked ? 'OK' : 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed && !isLinked) {
                setMastersData(prev => ({
                    ...prev,
                    [dataKey]: prev[dataKey].filter(item => item.id !== id)
                }));
                Swal.fire('Deleted!', 'Record has been removed.', 'success');
            }
        });
    };

    const openModal = (item = null) => {
        setSelectedItem(item);
        if (masterType === 'company') {
            setFormValues({
                code: item?.code || '',
                name: item?.name || '',
                type: item?.type || 'Pvt Ltd',
                gst: item?.gst || '',
                pan: item?.pan || '',
                phone: item?.phone || '',
                email: item?.email || '',
                address: item?.address || '',
                currency: item?.currency || 'INR (₹)',
                status: item?.status || 'Active'
            });
        } else if (masterType === 'bank') {
            setFormValues({
                name: item?.name || '',
                ifsc: item?.ifsc || '',
                branch: item?.branch || '',
                status: item?.status || 'Active'
            });
        }
        setShowModal(true);
    };

    const handleSave = () => {
        const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;

        if (masterType !== 'bank' && masterType !== 'company') {
            setShowModal(false);
            return;
        }

        if (masterType === 'company') {
            const next = {
                code: (formValues?.code || '').trim().toUpperCase(),
                name: (formValues?.name || '').trim(),
                type: formValues?.type || 'Pvt Ltd',
                gst: (formValues?.gst || '').trim().toUpperCase(),
                pan: (formValues?.pan || '').trim().toUpperCase(),
                phone: (formValues?.phone || '').trim(),
                email: (formValues?.email || '').trim(),
                address: (formValues?.address || '').trim(),
                currency: formValues?.currency || 'INR (₹)',
                status: formValues?.status || 'Active'
            };

            if (!next.code) {
                Swal.fire('Validation Error', 'Company Code is required.', 'error');
                return;
            }
            if (!next.name) {
                Swal.fire('Validation Error', 'Company Name is required.', 'error');
                return;
            }

            if (next.gst) {
                const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                if (!gstRegex.test(next.gst)) {
                    Swal.fire('Validation Error', 'GST Number is invalid.', 'error');
                    return;
                }
            }
            if (next.pan) {
                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                if (!panRegex.test(next.pan)) {
                    Swal.fire('Validation Error', 'PAN Number is invalid.', 'error');
                    return;
                }
            }

            const existing = mastersData[dataKey] || [];
            const selectedId = selectedItem?.id;

            const codeTaken = existing.some(c => c.id !== selectedId && (c.code || '').toUpperCase() === next.code);
            if (codeTaken) {
                Swal.fire('Duplicate', 'Company Code must be unique.', 'error');
                return;
            }

            const nameTaken = existing.some(c => c.id !== selectedId && (c.name || '').trim().toLowerCase() === next.name.toLowerCase());
            if (nameTaken) {
                Swal.fire('Duplicate', 'Company Name must be unique.', 'error');
                return;
            }

            if (selectedItem) {
                setMastersData(prev => ({
                    ...prev,
                    [dataKey]: prev[dataKey].map(c => (c.id === selectedItem.id ? { ...c, ...next } : c))
                }));
                Swal.fire('Updated', 'Company record updated successfully.', 'success');
            } else {
                const nextId = existing.length ? Math.max(...existing.map(x => x.id || 0)) + 1 : 1;
                setMastersData(prev => ({
                    ...prev,
                    [dataKey]: [{ id: nextId, ...next }, ...prev[dataKey]]
                }));
                Swal.fire('Saved', 'Company record added successfully.', 'success');
            }

            setShowModal(false);
            setSelectedItem(null);
            return;
        }

        const next = {
            name: (formValues?.name || '').trim(),
            ifsc: (formValues?.ifsc || '').trim().toUpperCase(),
            branch: (formValues?.branch || '').trim(),
            status: formValues?.status || 'Active'
        };

        if (!next.name) {
            Swal.fire('Validation Error', 'Bank Name is required.', 'error');
            return;
        }

        if (next.ifsc) {
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!ifscRegex.test(next.ifsc)) {
                Swal.fire('Validation Error', 'IFSC Code is invalid. Expected format like HDFC0XXXXXX.', 'error');
                return;
            }
        }

        const existing = mastersData[dataKey] || [];
        const selectedId = selectedItem?.id;

        const nameTaken = existing.some(b => b.id !== selectedId && (b.name || '').trim().toLowerCase() === next.name.toLowerCase());
        if (nameTaken) {
            Swal.fire('Duplicate', 'Bank Name must be unique.', 'error');
            return;
        }

        if (selectedItem) {
            setMastersData(prev => ({
                ...prev,
                [dataKey]: prev[dataKey].map(b => (b.id === selectedItem.id ? { ...b, ...next } : b))
            }));
            Swal.fire('Updated', 'Bank record updated successfully.', 'success');
        } else {
            const nextId = existing.length ? Math.max(...existing.map(x => x.id || 0)) + 1 : 1;
            setMastersData(prev => ({
                ...prev,
                [dataKey]: [{ id: nextId, ...next }, ...prev[dataKey]]
            }));
            Swal.fire('Saved', 'Bank record added successfully.', 'success');
        }

        setShowModal(false);
        setSelectedItem(null);
    };

    return (
        <div className="master-container">
            <div className="master-header">
                <div className="header-info">
                    <h2 className="master-title">{masterTitles[masterType]}</h2>
                    <p className="master-subtitle">Production-ready configuration for system-wide data integrity.</p>
                </div>
                <button className="btn-primary-custom" onClick={() => openModal()}>
                    <i className="bi bi-plus-lg me-2"></i> Add New {masterTitles[masterType].split(' ')[0]}
                </button>
            </div>

            <div className="master-card fade-in">
                <div className="master-toolbar">
                    <div className="search-box">
                        <i className="bi bi-search"></i>
                        <input 
                            type="text" 
                            placeholder={`Search by name, code or details...`}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="master-table">
                        <thead>
                            <tr>
                                {masterType === 'company' && <th>Company Code</th>}
                                {masterType === 'company' && <th>Company Name</th>}
                                {masterType === 'company' && (
                                    <>
                                        <th>Type</th>
                                        <th>GST Number</th>
                                        <th>PAN Number</th>
                                        <th>Contact (Phone / Email)</th>
                                        <th>Address</th>
                                    </>
                                )}
                                {masterType === 'bank' && (
                                    <>
                                        <th>Bank Name</th>
                                        <th>IFSC Code</th>
                                        <th>Branch</th>
                                    </>
                                )}
                                {masterType !== 'bank' && masterType !== 'company' && <th>Name</th>}
                                {masterType === 'payment-mode' && <th>Description</th>}
                                {masterType === 'category' && <th>Type</th>}
                                <th className="text-center">Status</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map(item => (
                                <tr key={item.id} className={item.status === 'Inactive' ? 'row-inactive' : ''}>
                                    {masterType === 'company' && (
                                        <>
                                            <td><code className="fw-bold text-primary">{item.code}</code></td>
                                            <td className="fw-bold">{item.name}</td>
                                        </>
                                    )}
                                    {masterType === 'company' && (
                                        <>
                                            <td><span className="badge bg-light text-dark border">{item.type}</span></td>
                                            <td><code>{item.gst || '-'}</code></td>
                                            <td><code>{item.pan || '-'}</code></td>
                                            <td>
                                                <div className="small"><i className="bi bi-telephone me-1"></i> {item.phone || '-'}</div>
                                                <div className="small text-muted"><i className="bi bi-envelope me-1"></i> {item.email || '-'}</div>
                                            </td>
                                            <td className="small text-muted">{item.address || '-'}</td>
                                        </>
                                    )}
                                    {masterType === 'bank' && (
                                        <>
                                            <td className="fw-bold">{item.name}</td>
                                            <td><code>{item.ifsc}</code></td>
                                            <td className="small">{item.branch}</td>
                                        </>
                                    )}
                                    {masterType === 'payment-mode' && <td className="small text-muted">{item.description}</td>}
                                    {masterType === 'category' && (
                                        <td>
                                            <span className={`badge ${item.type === 'Income' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                    )}
                                    <td className="text-center">
                                        <div className="form-check form-switch d-inline-block">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                checked={item.status === 'Active'} 
                                                onChange={() => handleToggleStatus(item.id)}
                                            />
                                        </div>
                                        <div className={`status-text-pill ${item.status.toLowerCase()}`}>{item.status}</div>
                                    </td>
                                    <td>
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

                {/* Global Pagination Component */}
                <Pagination 
                    totalItems={currentData.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(val) => {
                        setItemsPerPage(val);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {/* Master Modal */}
            {showModal && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header bg-light border-bottom-0">
                                    <h5 className="modal-title fw-bold">
                                        {selectedItem ? `Edit ${masterTitles[masterType].split(' ')[0]}` : `Add New ${masterTitles[masterType].split(' ')[0]}`}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-4">
                                        {masterType === 'company' && (
                                            <>
                                                <div className="col-md-4">
                                                    <label className="form-label-custom">Company Code <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="form-control-custom"
                                                        value={formValues?.code ?? ''}
                                                        placeholder="e.g. ACME"
                                                        disabled={!!selectedItem}
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), code: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-md-8">
                                                    <label className="form-label-custom">Company Name <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="form-control-custom"
                                                        value={formValues?.name ?? ''}
                                                        placeholder="Enter company name"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label-custom">Company Type</label>
                                                    <select
                                                        className="form-control-custom"
                                                        value={formValues?.type ?? 'Pvt Ltd'}
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), type: e.target.value }))}
                                                    >
                                                        <option>Pvt Ltd</option>
                                                        <option>LLP</option>
                                                        <option>Partnership</option>
                                                        <option>Proprietorship</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label-custom">Currency</label>
                                                    <input type="text" className="form-control-custom" value={formValues?.currency ?? 'INR (₹)'} disabled />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label-custom">GST Number</label>
                                                    <input
                                                        type="text"
                                                        className="form-control-custom"
                                                        value={formValues?.gst ?? ''}
                                                        placeholder="27AAAAA0000A1Z5"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), gst: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label-custom">PAN Number</label>
                                                    <input
                                                        type="text"
                                                        className="form-control-custom"
                                                        value={formValues?.pan ?? ''}
                                                        placeholder="ABCDE1234F"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), pan: e.target.value }))}
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label-custom">Phone (optional)</label>
                                                    <input
                                                        type="tel"
                                                        className="form-control-custom"
                                                        value={formValues?.phone ?? ''}
                                                        placeholder="10-digit number"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), phone: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label-custom">Email (optional)</label>
                                                    <input
                                                        type="email"
                                                        className="form-control-custom"
                                                        value={formValues?.email ?? ''}
                                                        placeholder="email@company.com"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), email: e.target.value }))}
                                                    />
                                                </div>

                                                <div className="col-12">
                                                    <label className="form-label-custom">Address</label>
                                                    <textarea
                                                        className="form-control-custom"
                                                        value={formValues?.address ?? ''}
                                                        rows="2"
                                                        placeholder="Full registered address..."
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), address: e.target.value }))}
                                                    ></textarea>
                                                </div>
                                            </>
                                        )}

                                        {masterType !== 'bank' && masterType !== 'company' && (
                                            <div className={'col-12'}>
                                                <label className="form-label-custom">Name / Title <span className="text-danger">*</span></label>
                                                <input type="text" className="form-control-custom" defaultValue={selectedItem?.name || ''} placeholder="Enter full name" />
                                            </div>
                                        )}

                                        {masterType === 'bank' && (
                                            <>
                                                <div className="col-md-8">
                                                    <label className="form-label-custom">Bank Name <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="form-control-custom"
                                                        value={formValues?.name ?? ''}
                                                        placeholder="e.g. HDFC Bank"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label-custom">Status</label>
                                                    <select
                                                        className="form-control-custom"
                                                        value={formValues?.status ?? 'Active'}
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), status: e.target.value }))}
                                                    >
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
                                                        placeholder="e.g. HDFC0XXXXXX"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), ifsc: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label-custom">Branch Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-control-custom"
                                                        value={formValues?.branch ?? ''}
                                                        placeholder="e.g. Mumbai Main"
                                                        onChange={(e) => setFormValues(v => ({ ...(v || {}), branch: e.target.value }))}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {masterType === 'payment-mode' && (
                                            <div className="col-12">
                                                <label className="form-label-custom">Mode Description</label>
                                                <input type="text" className="form-control-custom" defaultValue={selectedItem?.description || ''} placeholder="Brief details about this payment mode" />
                                            </div>
                                        )}

                                        {masterType === 'category' && (
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Type</label>
                                                <select className="form-control-custom" defaultValue={selectedItem?.type || 'Expense'}>
                                                    <option>Income</option>
                                                    <option>Expense</option>
                                                </select>
                                            </div>
                                        )}

                                        {(masterType !== 'bank') && (
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Status</label>
                                                <select
                                                    className="form-control-custom"
                                                    value={masterType === 'company' ? (formValues?.status ?? 'Active') : (selectedItem?.status || 'Active')}
                                                    onChange={(e) => {
                                                        if (masterType === 'company') setFormValues(v => ({ ...(v || {}), status: e.target.value }));
                                                    }}
                                                >
                                                    <option>Active</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-5 d-flex gap-2">
                                        <button className="btn btn-light px-4" onClick={() => setShowModal(false)}>Cancel</button>
                                        <button className="btn btn-primary-custom flex-grow-1 py-3 rounded-3" onClick={handleSave}>
                                            <i className="bi bi-check2-circle me-2"></i>
                                            {selectedItem ? 'Update Configuration' : 'Save Configuration'}
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

export default MastersPage;
