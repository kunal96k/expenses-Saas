import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination';
import { apiService } from '../services/api';
import './MastersPage.css';

const MastersPage = ({ activePage, userRole, mastersData, setMastersData, accounts }) => {
    const masterType = activePage.replace('-master', '');
    const [isLoading, setIsLoading] = useState(false);

    const masterTitles = {
        'company': 'Company Master',
        'bank': 'Bank Master',
        'payment-mode': 'Payment Mode Master',
        'category': 'Purpose / Category Master',
        'employee': 'Employee Master'
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formValues, setFormValues] = useState(null);
    const [detailsFormValues, setDetailsFormValues] = useState(null);
    const [credentialsFormValues, setCredentialsFormValues] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [localData, setLocalData] = useState([]);
    const canManage = userRole === 'Super Admin';

    const getApiEndpoint = (type) => {

        if (type === 'payment-mode') return '/payment-modes';
        if (type === 'category') return '/categories';
        if (type === 'company') return '/companies';
        if (type === 'bank') return '/banks';
        return `/${type}s`;
    };

    const fetchData = useCallback(async () => {
        const endpoint = getApiEndpoint(masterType);
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage - 1,
                size: itemsPerPage,
                search: searchQuery,
                sortBy: 'id',
                direction: 'desc'
            });

            const response = await apiService.get(`${endpoint}?${params.toString()}`);
            setLocalData(response.content || []);
            setTotalElements(response.totalElements || 0);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Swal.fire('Error', `Failed to load ${masterTitles[masterType]}. ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [masterType, currentPage, itemsPerPage, searchQuery]);

    const refreshGlobalMasters = async () => {
        try {
            const endpoint = getApiEndpoint(masterType);
            const response = await apiService.getAllPages(endpoint);
            const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;
            setMastersData(prev => ({ ...prev, [dataKey]: response }));
        } catch (err) {
            console.error("Error refreshing global masters:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!showModal) setFormValues(null);
    }, [showModal]);

    // Reset page on master type change
    useEffect(() => {
        setCurrentPage(1);
        setSearchQuery('');
    }, [masterType]);


    const isCompanyLinked = (companyId) => (accounts || []).some(a => a.companyId === companyId);
    const isBankLinked = (bankId) => (accounts || []).some(a => a.bankId === bankId);

    // We now use localData directly from the server-side response

    const handleToggleStatus = async (id) => {
        if (!canManage) return;
        const endpoint = getApiEndpoint(masterType);
        try {
            await apiService.patch(`${endpoint}/${id}/toggle-status`);
            await fetchData(); // Refresh table
            await refreshGlobalMasters(); // Refresh dropdowns
            Swal.fire({ icon: 'success', title: 'Updated', text: 'Status updated successfully.', timer: 1000, showConfirmButton: false });
        } catch (error) {
            console.error('Error toggling status:', error);
            Swal.fire('Error', `Failed to update status. ${error.message}`, 'error');
        }
    };


    const handleDelete = (id) => {
        if (!canManage) return;
        const dataKey = masterType === 'payment-mode' ? 'paymentMode' : masterType;
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
        }).then(async (result) => {
            if (result.isConfirmed && !isLinked) {
                try {
                    const endpoint = getApiEndpoint(masterType);
                    await apiService.delete(`${endpoint}/${id}`);
                    await fetchData();
                    await refreshGlobalMasters();
                    Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record removed.', timer: 1500, showConfirmButton: false });
                } catch (error) {
                    console.error('Error deleting record:', error);
                    Swal.fire('Error', `Failed to delete record. ${error.message}`, 'error');
                }
            }
        });
    };

    const handleResetPassword = (id) => {
        if (!canManage) return;
        Swal.fire({
            title: 'Reset Password',
            html: `<input id="swal-input1" class="swal2-input" type="password" placeholder="New password">` +
                `<label style="font-weight:600;margin-top:8px;display:block"><input id="swal-send-email" type="checkbox"> Send password to user's email</label>`,
            focusConfirm: false,
            preConfirm: () => {
                const newPassword = document.getElementById('swal-input1').value;
                const sendEmail = document.getElementById('swal-send-email').checked;
                if (!newPassword || newPassword.length < 6) {
                    Swal.showValidationMessage('Enter a password of at least 6 characters');
                    return;
                }
                return { newPassword, sendEmail };
            }
        }).then(async (res) => {
            if (res.isConfirmed && res.value) {
                try {
                    await apiService.patch(`/employees/${id}/reset-password`, { newPassword: res.value.newPassword, sendEmail: res.value.sendEmail });
                    Swal.fire({ icon: 'success', title: 'Password reset', timer: 1200, showConfirmButton: false });
                    await fetchData();
                } catch (err) {
                    const errMsg = err.errors ? Object.values(err.errors).join('\n') : err.message;
                    Swal.fire('Error', errMsg, 'error');
                }
            }
        });
    };

    const handleResetUsername = (id) => {
        if (!canManage) return;
        Swal.fire({
            title: 'Reset Username',
            input: 'text',
            inputPlaceholder: 'New username',
            inputValidator: (value) => {
                if (!value || value.trim().length < 3) return 'Enter a username (min 3 chars)';
                return null;
            },
            showCancelButton: true,
            inputAttributes: { autocapitalize: 'off' }
        }).then(async (res) => {
            if (res.isConfirmed) {
                const sendEmail = await Swal.fire({ title: 'Send email with new username?', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'No' });
                try {
                    await apiService.patch(`/employees/${id}/reset-username`, { newUsername: res.value, sendEmail: sendEmail.isConfirmed });
                    Swal.fire({ icon: 'success', title: 'Username updated', timer: 1200, showConfirmButton: false });
                    await fetchData();
                } catch (err) {
                    const errMsg = err.errors ? Object.values(err.errors).join('\n') : err.message;
                    Swal.fire('Error', errMsg, 'error');
                }
            }
        });
    };

    const handleEditDetails = (item) => {
        if (!canManage) return;
        setSelectedItem(item);
        setDetailsFormValues({
            name: item.name || '',
            email: item.email || '',
            phone: item.phone || '',
            designation: item.designation || '',
            department: item.department || '',
            status: item.status || 'Active'
        });
        setShowDetailsModal(true);
    };

    const handleUpdateDetails = async () => {
        if (!canManage) return;
        if (!detailsFormValues || Object.values(detailsFormValues).every(v => v === '' || v === null || typeof v === 'undefined')) {
            Swal.fire('Validation', 'Enter at least one value to update', 'error');
            return;
        }
        try {
            await apiService.patch(`/employees/${selectedItem.id}/details`, detailsFormValues);
            Swal.fire({ icon: 'success', title: 'Details updated', timer: 1200, showConfirmButton: false });
            setShowDetailsModal(false);
            await fetchData();
        } catch (err) {
            const errMsg = err.errors ? Object.values(err.errors).join('\n') : err.message;
            Swal.fire('Error', errMsg, 'error');
        }
    };

    const handleEditCredentials = (item) => {
        if (!canManage) return;
        setSelectedItem(item);
        setCredentialsFormValues({
            username: item.username || '',
            password: '',
            sendEmail: false
        });
        setShowCredentialsModal(true);
    };

    const handleUpdateCredentials = async () => {
        if (!canManage) return;
        if (!credentialsFormValues.username && !credentialsFormValues.password) {
            Swal.fire('Validation', 'Enter at least username or password to update', 'error');
            return;
        }
        if (credentialsFormValues.username && credentialsFormValues.username.length < 3) {
            Swal.fire('Validation', 'Username must be at least 3 characters', 'error');
            return;
        }
        if (credentialsFormValues.password && credentialsFormValues.password.length < 6) {
            Swal.fire('Validation', 'Password must be at least 6 characters', 'error');
            return;
        }
        try {
            await apiService.patch(`/employees/${selectedItem.id}/credentials`, {
                username: credentialsFormValues.username,
                password: credentialsFormValues.password,
                sendEmail: credentialsFormValues.sendEmail
            });
            Swal.fire({ icon: 'success', title: 'Credentials updated', timer: 1200, showConfirmButton: false });
            setShowCredentialsModal(false);
            await fetchData();
        } catch (err) {
            const errMsg = err.errors ? Object.values(err.errors).join('\n') : err.message;
            Swal.fire('Error', errMsg, 'error');
        }
    };


    const openModal = (item = null) => {
        if (!canManage) return;
        setSelectedItem(item);
        if (masterType === 'employee') {
            setFormValues({
                empCode: item?.empCode || '',
                name: item?.name || '',
                email: item?.email || '',
                phone: item?.phone || '',
                designation: item?.designation || '',
                department: item?.department || '',
                status: item?.status || 'Active',
                role: (item?.role || 'VIEWER').toUpperCase(),
                username: item?.username || '',
                password: '',
                confirmPassword: '',
                sendCredentials: false
            });
        }
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
        } else if (masterType === 'payment-mode') {
            setFormValues({
                name: item?.name || '',
                description: item?.description || '',
                status: item?.status || 'Active'
            });
        } else if (masterType === 'category') {
            setFormValues({
                name: item?.name || '',
                type: item?.type || 'Expense',
                status: item?.status || 'Active'
            });
        }
        setShowModal(true);
    };

    const handleApiAction = async (action, successMsg) => {
        try {
            await action();
            await fetchData();
            await refreshGlobalMasters();
            Swal.fire({ icon: 'success', title: 'Success', text: successMsg, timer: 1500, showConfirmButton: false });
            setShowModal(false);
            setSelectedItem(null);
        } catch (error) {
            console.error('API Error:', error);
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

    const handleSave = async () => {
        if (!canManage) return;
        const endpoint = getApiEndpoint(masterType);

        if (masterType === 'company') {
            const payload = {
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

            const action = selectedItem
                ? () => apiService.put(`${endpoint}/${selectedItem.id}`, payload)
                : () => apiService.post(endpoint, payload);

            await handleApiAction(action, selectedItem ? 'Company updated.' : 'Company added.');
            return;
        }

        if (masterType === 'bank') {
            const payload = {
                name: (formValues?.name || '').trim(),
                ifsc: (formValues?.ifsc || '').trim().toUpperCase(),
                branch: (formValues?.branch || '').trim(),
                status: formValues?.status || 'Active'
            };

            const action = selectedItem
                ? () => apiService.put(`${endpoint}/${selectedItem.id}`, payload)
                : () => apiService.post(endpoint, payload);

            await handleApiAction(action, selectedItem ? 'Bank updated.' : 'Bank added.');
            return;
        }

        if (masterType === 'category') {
            const payload = {
                name: (formValues?.name || '').trim(),
                type: formValues?.type || 'Expense',
                status: formValues?.status || 'Active'
            };

            const action = selectedItem
                ? () => apiService.put(`${endpoint}/${selectedItem.id}`, payload)
                : () => apiService.post(endpoint, payload);

            await handleApiAction(action, selectedItem ? 'Category updated.' : 'Category added.');
            return;
        }

        if (masterType === 'payment-mode') {
            const payload = {
                name: (formValues?.name || '').trim(),
                description: (formValues?.description || '').trim(),
                status: formValues?.status || 'Active'
            };

            const action = selectedItem
                ? () => apiService.put(`${endpoint}/${selectedItem.id}`, payload)
                : () => apiService.post(endpoint, payload);

            await handleApiAction(action, selectedItem ? 'Payment Mode updated.' : 'Payment Mode added.');
            return;
        }

        if (masterType === 'employee') {
            const payload = {
                empCode: (formValues?.empCode || '').trim(),
                name: (formValues?.name || '').trim(),
                email: (formValues?.email || '').trim(),
                phone: (formValues?.phone || '').trim(),
                designation: (formValues?.designation || '').trim(),
                department: (formValues?.department || '').trim(),
                status: formValues?.status || 'Active',
                role: (formValues?.role || 'VIEWER').toUpperCase(),
                username: formValues?.username || undefined,
                password: formValues?.password || undefined,
                sendCredentials: formValues?.sendCredentials || false
            };

            if (!payload.empCode || !payload.name) {
                Swal.fire('Validation', 'Employee code and name are required', 'error');
                return;
            }

            if (payload.password && payload.password !== (formValues?.confirmPassword || '')) {
                Swal.fire('Validation', 'Passwords do not match', 'error');
                return;
            }

            if (payload.password && payload.password.length < 6) {
                Swal.fire('Validation', 'Password must be at least 6 characters', 'error');
                return;
            }

            const action = selectedItem
                ? () => apiService.put(`${endpoint}/${selectedItem.id}`, payload)
                : () => apiService.post(endpoint, payload);

            await handleApiAction(action, selectedItem ? 'Employee updated.' : 'Employee added.');
            return;
        }

    };


    // ─── sr no base for current pagination page ───
    const srBase = (currentPage - 1) * itemsPerPage;

    return (
        <div className="master-container">
            {/* Guide Note for Category Master */}
            {masterType === 'category' && (
                <div className="alert alert-info border-0 shadow-sm mb-4 fade-in" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #f0f9ff, #e0f2fe)', padding: '16px 20px' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                            <i className="bi bi-info-circle-fill" style={{ fontSize: '1.2rem' }}></i>
                        </div>
                        <div>
                            <h6 className="mb-1 fw-bold text-primary">Master Category Guide</h6>
                            <p className="mb-0 small text-muted">
                                Categories help you organize your cash flow. Define <strong>Income</strong> categories for revenue sources and <strong>Expense</strong> categories for spending.
                                These categories will be used across the system to classify all financial transactions.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Guide Note for Company Master */}
            {masterType === 'company' && (
                <div className="alert alert-info border-0 shadow-sm mb-4 fade-in" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #fdf4ff, #fae8ff)', padding: '16px 20px', borderLeft: '4px solid #d946ef' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-magenta text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0, backgroundColor: '#d946ef' }}>
                            <i className="bi bi-building-fill" style={{ fontSize: '1.2rem' }}></i>
                        </div>
                        <div>
                            <h6 className="mb-1 fw-bold" style={{ color: '#a21caf' }}>Company Master Guide</h6>
                            <p className="mb-0 small text-muted">
                                Register your legal entities here. Each company will have its own dedicated accounts, employees, and financial transactions.
                                Make sure to enter the correct <strong>GST</strong> and <strong>PAN</strong> details for official reporting.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Guide Note for Employee Master */}
            {masterType === 'employee' && (
                <div className="alert alert-info border-0 shadow-sm mb-4 fade-in" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #fff7ed, #fffbeb)', padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                            <i className="bi bi-person-badge-fill" style={{ fontSize: '1.2rem' }}></i>
                        </div>
                        <div>
                            <h6 className="mb-1 fw-bold" style={{ color: '#92400e' }}>Employee Master Guide</h6>
                            <p className="mb-0 small text-muted">
                                Manage employee records and account credentials here. Provide a unique <strong>Employee Code</strong> and <strong>email</strong> (if available). You can optionally set a username and password and choose to send credentials by email.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Guide Note for Bank Master */}
            {masterType === 'bank' && (
                <div className="alert alert-info border-0 shadow-sm mb-4 fade-in" style={{ borderRadius: '12px', background: 'linear-gradient(to right, #f0fdf4, #dcfce7)', padding: '16px 20px', borderLeft: '4px solid #22c55e' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                            <i className="bi bi-bank2" style={{ fontSize: '1.2rem' }}></i>
                        </div>
                        <div>
                            <h6 className="mb-1 fw-bold text-success">Bank Master Guide</h6>
                            <p className="mb-0 small text-muted">
                                List all banks where your companies hold accounts. Accurate <strong>IFSC Codes</strong> and <strong>Branch Names</strong> help in identifying locations during account setup.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}



            <div className="master-header">
                <div className="header-info">
                    <h2 className="master-title">{masterTitles[masterType] || 'Master'}</h2>
                    <p className="master-subtitle">Manage configuration data used across the entire system.</p>
                </div>
                <button className="btn-primary-custom" onClick={() => openModal()} disabled={!canManage}>
                    <i className="bi bi-plus-lg"></i>
                    {canManage ? 'Add New' : 'View Only'}
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
                    <span className="master-toolbar-info">{totalElements} record{totalElements !== 1 ? 's' : ''} found</span>
                </div>

                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Desktop Table (hidden on mobile) ── */}
                        <div className="master-desktop-table d-none d-md-block">
                    <div className="table-responsive">
                        <table className="master-table">
                            <thead>
                                <tr>
                                    <th className="col-sr">#</th>
                                    {masterType === 'employee' && <><th>Emp Code</th><th>Name</th><th>Email</th><th>Role</th><th>Username</th></>}
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
                                    {masterType === 'bank' && <>
                                        <th>Bank Name</th>
                                        <th>IFSC Code</th>
                                        <th>Branch</th>
                                    </>}
                                    {masterType === 'payment-mode' && <>
                                        <th>Mode Name</th>
                                        <th>Description</th>
                                    </>}
                                    {masterType === 'category' && <>
                                        <th>Category Name</th>
                                        <th>Type</th>
                                    </>}
                                    <th className="text-center">Status</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localData.length === 0 ? (
                                    <tr className="empty-table-row">
                                        <td colSpan={10}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                                                <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>No records found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : localData.map((item, idx) => (
                                    <tr key={item.id} className={item.status === 'Inactive' ? 'row-inactive' : ''}>
                                        <td className="col-sr">{srBase + idx + 1}</td>
                                        {masterType === 'employee' && <>
                                            <td><code className="master-code-badge">{item.empCode}</code></td>
                                            <td className="fw-semibold" style={{ color: '#0f172a' }}>{item.name}</td>
                                            <td className="small text-muted">{item.email || '—'}</td>
                                            <td>
                                                <span className={`status-badge ${item.role === 'SUPERADMIN' ? 'status-credit' : 'status-debit'}`}>{item.role || 'VIEWER'}</span>
                                                {Boolean(item.isSuperior) && <span className="ms-2 badge bg-dark-subtle text-dark">Superior</span>}
                                            </td>
                                            <td className="small text-muted">{item.username || '—'}</td>
                                        </>}
                                        {masterType === 'company' && <>
                                            <td><code className="master-code-badge">{item.code}</code></td>
                                            <td className="fw-semibold" style={{ color: '#0f172a' }}>{item.name}</td>
                                            <td><span className="master-type-tag">{item.type}</span></td>
                                            <td><code className="master-mono">{item.gst || '—'}</code></td>
                                            <td><code className="master-mono">{item.pan || '—'}</code></td>
                                            <td className="text-muted small">{item.currency || '—'}</td>
                                            <td>
                                                {item.phone && <div className="small"><i className="bi bi-telephone me-1 text-muted"></i>{item.phone}</div>}
                                                {item.email && <div className="small text-muted"><i className="bi bi-envelope me-1"></i>{item.email}</div>}
                                                {!item.phone && !item.email && <span className="text-muted">—</span>}
                                            </td>
                                            <td className="small text-muted" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.address}>{item.address || '—'}</td>
                                        </>}
                                        {masterType === 'bank' && <>
                                            <td className="fw-semibold">{item.name}</td>
                                            <td><code className="master-code-badge">{item.ifsc || '—'}</code></td>
                                            <td className="small text-muted">{item.branch || '—'}</td>
                                        </>}
                                        {masterType === 'payment-mode' && <>
                                            <td className="fw-semibold">{item.name}</td>
                                            <td className="small text-muted">{item.description || '—'}</td>
                                        </>}
                                        {masterType === 'category' && <>
                                            <td className="fw-semibold">{item.name}</td>
                                            <td><span className={`status-badge ${item.type === 'Income' ? 'status-credit' : 'status-debit'}`}>{item.type}</span></td>
                                        </>}
                                        <td className="text-center">
                                            <div className="status-toggle-cell">
                                                <div className="form-check form-switch d-inline-block mb-0">
                                                    <input className="form-check-input" type="checkbox" checked={item.status === 'Active'} onChange={() => handleToggleStatus(item.id)} style={{ cursor: canManage ? 'pointer' : 'not-allowed' }} disabled={!canManage} />
                                                </div>
                                                <div className={`status-text-pill ${item.status.toLowerCase()}`}>{item.status}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                {canManage && masterType === 'employee' && (
                                                    <>
                                                        <button className="btn-icon" onClick={() => handleEditDetails(item)} title="Edit Details (Profile)"><i className="bi bi-person-check"></i></button>
                                                        <button className="btn-icon" onClick={() => handleEditCredentials(item)} title="Update Credentials (Username/Password)"><i className="bi bi-key"></i></button>
                                                        <button className="btn-icon" onClick={() => handleResetPassword(item.id)} title="Reset Password"><i className="bi bi-arrow-clockwise"></i></button>
                                                        <button className="btn-icon" onClick={() => handleResetUsername(item.id)} title="Reset Username"><i className="bi bi-person-gear"></i></button>
                                                    </>
                                                )}
                                                {canManage && masterType !== 'employee' && (
                                                    <button className="btn-icon" onClick={() => openModal(item)} title="Edit"><i className="bi bi-pencil"></i></button>
                                                )}
                                                {canManage && <button className="btn-icon text-danger" onClick={() => handleDelete(item.id)} title="Delete"><i className="bi bi-trash"></i></button>}
                                                {!canManage && <span className="small text-muted">View only</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Mobile Cards (hidden on desktop) ── */}
                <div className="master-mobile-cards d-block d-md-none">
                    {localData.length === 0 ? (
                        <div className="master-empty-mobile">
                            <i className="bi bi-inbox"></i>
                            <span>No records found</span>
                        </div>
                    ) : localData.map((item, idx) => (
                        <div key={item.id} className={`master-mobile-card ${item.status === 'Inactive' ? 'card-inactive' : ''}`}>
                            {/* Card Header */}
                            <div className="mcard-header">
                                <div className="mcard-index">{srBase + idx + 1}</div>
                                <div className="mcard-title-block">
                                    {/* Title varies by type */}
                                    {masterType === 'company' && <><span className="mcard-code">{item.code}</span><span className="mcard-name">{item.name}</span></>}
                                    {masterType === 'bank' && <span className="mcard-name">{item.name}</span>}
                                    {masterType === 'payment-mode' && <span className="mcard-name">{item.name}</span>}
                                    {masterType === 'category' && <span className="mcard-name">{item.name}</span>}
                                    {masterType === 'employee' && <><span className="mcard-code">{item.empCode || 'EMP'}</span><span className="mcard-name">{item.name || '-'}</span></>}
                                </div>
                                <div className={`mcard-status-dot ${item.status === 'Active' ? 'dot-active' : 'dot-inactive'}`} title={item.status}></div>
                            </div>

                            {/* Card Body — Fields */}
                            <div className="mcard-body">
                                {masterType === 'company' && <>
                                    <div className="mcard-row"><span className="mcard-label">Type</span><span className="mcard-value"><span className="master-type-tag">{item.type}</span></span></div>
                                    <div className="mcard-row"><span className="mcard-label">GST</span><span className="mcard-value"><code className="master-mono">{item.gst || '—'}</code></span></div>
                                    <div className="mcard-row"><span className="mcard-label">PAN</span><span className="mcard-value"><code className="master-mono">{item.pan || '—'}</code></span></div>
                                    {item.phone && <div className="mcard-row"><span className="mcard-label">Phone</span><span className="mcard-value">{item.phone}</span></div>}
                                    {item.email && <div className="mcard-row"><span className="mcard-label">Email</span><span className="mcard-value">{item.email}</span></div>}
                                    {item.address && <div className="mcard-row"><span className="mcard-label">Address</span><span className="mcard-value mcard-value-truncate">{item.address}</span></div>}
                                </>}
                                {masterType === 'bank' && <>
                                    <div className="mcard-row"><span className="mcard-label">IFSC</span><span className="mcard-value"><code className="master-code-badge">{item.ifsc || '—'}</code></span></div>
                                    <div className="mcard-row"><span className="mcard-label">Branch</span><span className="mcard-value">{item.branch || '—'}</span></div>
                                </>}
                                {masterType === 'payment-mode' && <>
                                    <div className="mcard-row"><span className="mcard-label">Description</span><span className="mcard-value">{item.description || '—'}</span></div>
                                </>}
                                {masterType === 'category' && <>
                                    <div className="mcard-row"><span className="mcard-label">Type</span><span className="mcard-value"><span className={`status-badge ${item.type === 'Income' ? 'status-credit' : 'status-debit'}`}>{item.type}</span></span></div>
                                </>}
                                {masterType === 'employee' && <>
                                    <div className="mcard-row"><span className="mcard-label">Email</span><span className="mcard-value">{item.email || '—'}</span></div>
                                    <div className="mcard-row"><span className="mcard-label">Role</span><span className="mcard-value">{item.role || 'VIEWER'}{Boolean(item.isSuperior) ? ' (Superior)' : ''}</span></div>
                                    <div className="mcard-row"><span className="mcard-label">Username</span><span className="mcard-value">{item.username || '—'}</span></div>
                                </>}
                            </div>

                            {/* Card Footer — Status + Actions */}
                            <div className="mcard-footer">
                                <div className="mcard-toggle-row">
                                    <span className="mcard-label">Status</span>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="form-check form-switch mb-0">
                                            <input className="form-check-input" type="checkbox" checked={item.status === 'Active'} onChange={() => handleToggleStatus(item.id)} style={{ cursor: canManage ? 'pointer' : 'not-allowed' }} disabled={!canManage} />
                                        </div>
                                        <span className={`status-text-pill ${item.status.toLowerCase()}`}>{item.status}</span>
                                    </div>
                                </div>
                                <div className="mcard-actions">
                                    {canManage && masterType === 'employee' && (
                                        <>
                                            <button className="mcard-btn mcard-btn-edit" onClick={() => handleEditDetails(item)}><i className="bi bi-person-check me-1"></i>Details</button>
                                            <button className="mcard-btn mcard-btn-edit" onClick={() => handleEditCredentials(item)}><i className="bi bi-key me-1"></i>Credentials</button>
                                            <button className="mcard-btn mcard-btn-edit" onClick={() => handleResetPassword(item.id)}><i className="bi bi-arrow-clockwise me-1"></i>Password</button>
                                            <button className="mcard-btn mcard-btn-edit" onClick={() => handleResetUsername(item.id)}><i className="bi bi-person-gear me-1"></i>Username</button>
                                            <button className="mcard-btn mcard-btn-delete" onClick={() => handleDelete(item.id)}><i className="bi bi-trash me-1"></i>Delete</button>
                                        </>
                                    )}
                                    {canManage && masterType !== 'employee' && (
                                        <>
                                            <button className="mcard-btn mcard-btn-edit" onClick={() => openModal(item)}>
                                                <i className="bi bi-pencil me-1"></i>Edit
                                            </button>
                                            <button className="mcard-btn mcard-btn-delete" onClick={() => handleDelete(item.id)}>
                                                <i className="bi bi-trash me-1"></i>Delete
                                            </button>
                                        </>
                                    )}
                                    {!canManage && (
                                        <div className="mcard-view-only text-muted small">Viewer role: read-only access</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <Pagination
                    totalItems={totalElements}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={val => { setItemsPerPage(val); setCurrentPage(1); }}
                />
            </>
        )}
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
                                        {masterType === 'employee' && <>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Employee Code <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.empCode ?? ''}
                                                    placeholder="e.g. EMP-001"
                                                    disabled={!!selectedItem}
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), empCode: e.target.value }))}
                                                />
                                                {selectedItem && <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Code cannot be changed after creation</small>}
                                            </div>
                                            <div className="col-md-8">
                                                <label className="form-label-custom">Employee Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control-custom"
                                                    value={formValues?.name ?? ''}
                                                    placeholder="Enter employee full name"
                                                    onChange={e => setFormValues(v => ({ ...(v || {}), name: e.target.value }))}
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
                                                <label className="form-label-custom">Designation</label>
                                                <input type="text" className="form-control-custom" value={formValues?.designation ?? ''} onChange={e => setFormValues(v => ({ ...(v || {}), designation: e.target.value }))} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Department</label>
                                                <input type="text" className="form-control-custom" value={formValues?.department ?? ''} onChange={e => setFormValues(v => ({ ...(v || {}), department: e.target.value }))} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Username</label>
                                                <input type="text" className="form-control-custom" value={formValues?.username ?? ''} placeholder="Optional username" onChange={e => setFormValues(v => ({ ...(v || {}), username: e.target.value }))} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Role</label>
                                                <select className="form-control-custom" value={(formValues?.role ?? 'VIEWER').toUpperCase()} onChange={e => setFormValues(v => ({ ...(v || {}), role: e.target.value }))}>
                                                    <option value="VIEWER">Viewer</option>
                                                    <option value="SUPERADMIN">Super Admin</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Send Credentials</label>
                                                <div className="form-check form-switch">
                                                    <input className="form-check-input" type="checkbox" checked={formValues?.sendCredentials || false} onChange={e => setFormValues(v => ({ ...(v || {}), sendCredentials: e.target.checked }))} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Password</label>
                                                <input type="password" className="form-control-custom" value={formValues?.password ?? ''} placeholder="Enter password (optional)" onChange={e => setFormValues(v => ({ ...(v || {}), password: e.target.value }))} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label-custom">Confirm Password</label>
                                                <input type="password" className="form-control-custom" value={formValues?.confirmPassword ?? ''} placeholder="Confirm password" onChange={e => setFormValues(v => ({ ...(v || {}), confirmPassword: e.target.value }))} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label-custom">Status</label>
                                                <select className="form-control-custom" value={formValues?.status ?? 'Active'} onChange={e => setFormValues(v => ({ ...(v || {}), status: e.target.value }))}>
                                                    <option>Active</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                        </>}

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

            {/* ────────────── EDIT DETAILS MODAL (EMPLOYEE ONLY) ────────────── */}
            {showDetailsModal && masterType === 'employee' && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0" style={{ borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
                                <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0" style={{ color: '#0f172a', fontSize: '1rem' }}>
                                            Edit Employee Details
                                        </h5>
                                        <p className="mb-0 mt-1" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                            Update profile information only (no credentials).
                                        </p>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
                                </div>
                                <div className="modal-body" style={{ padding: '28px 24px' }}>
                                    <div className="row g-4">
                                        <div className="col-12">
                                            <label className="form-label-custom">Employee Name <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control-custom" value={detailsFormValues?.name ?? ''} onChange={e => setDetailsFormValues(v => ({ ...(v || {}), name: e.target.value }))} />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label-custom">Email</label>
                                            <input type="email" className="form-control-custom" value={detailsFormValues?.email ?? ''} onChange={e => setDetailsFormValues(v => ({ ...(v || {}), email: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Phone</label>
                                            <input type="tel" className="form-control-custom" value={detailsFormValues?.phone ?? ''} onChange={e => setDetailsFormValues(v => ({ ...(v || {}), phone: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Designation</label>
                                            <input type="text" className="form-control-custom" value={detailsFormValues?.designation ?? ''} onChange={e => setDetailsFormValues(v => ({ ...(v || {}), designation: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Department</label>
                                            <input type="text" className="form-control-custom" value={detailsFormValues?.department ?? ''} onChange={e => setDetailsFormValues(v => ({ ...(v || {}), department: e.target.value }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Status</label>
                                            <select className="form-control-custom" value={detailsFormValues?.status ?? 'Active'} onChange={e => setDetailsFormValues(v => ({ ...(v || {}), status: e.target.value }))}>
                                                <option>Active</option>
                                                <option>Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', gap: '10px' }}>
                                    <button className="btn btn-light px-4 py-2 rounded-3" onClick={() => setShowDetailsModal(false)}>Cancel</button>
                                    <button className="btn btn-primary-custom px-4 py-2 rounded-3" onClick={handleUpdateDetails}><i className="bi bi-check2-circle me-2"></i>Update Details</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ────────────── UPDATE CREDENTIALS MODAL (EMPLOYEE ONLY) ────────────── */}
            {showCredentialsModal && masterType === 'employee' && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0" style={{ borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
                                <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fef2f2' }}>
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0" style={{ color: '#7f1d1d', fontSize: '1rem' }}>
                                            Update Employee Credentials
                                        </h5>
                                        <p className="mb-0 mt-1" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                            Update username and/or password only (isolated from profile).
                                        </p>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowCredentialsModal(false)}></button>
                                </div>
                                <div className="modal-body" style={{ padding: '28px 24px' }}>
                                    <div className="row g-4">
                                        <div className="col-12">
                                            <label className="form-label-custom">Username</label>
                                            <input type="text" className="form-control-custom" value={credentialsFormValues?.username ?? ''} placeholder="Leave blank to keep current" onChange={e => setCredentialsFormValues(v => ({ ...(v || {}), username: e.target.value }))} />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label-custom">New Password</label>
                                            <input type="password" className="form-control-custom" value={credentialsFormValues?.password ?? ''} placeholder="Leave blank to keep current" onChange={e => setCredentialsFormValues(v => ({ ...(v || {}), password: e.target.value }))} />
                                        </div>
                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input className="form-check-input" type="checkbox" checked={credentialsFormValues?.sendEmail || false} onChange={e => setCredentialsFormValues(v => ({ ...(v || {}), sendEmail: e.target.checked }))} />
                                                <label className="form-check-label">Send credentials to employee's email</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', gap: '10px' }}>
                                    <button className="btn btn-light px-4 py-2 rounded-3" onClick={() => setShowCredentialsModal(false)}>Cancel</button>
                                    <button className="btn btn-primary-custom px-4 py-2 rounded-3" onClick={handleUpdateCredentials}><i className="bi bi-shield-lock me-2"></i>Update Credentials</button>
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
