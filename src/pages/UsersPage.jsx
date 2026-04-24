import React, { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import Pagination from '../components/Pagination';
import './UsersPage.css';

const UsersPage = ({ userRole }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Mock Data (Simplified Roles)
    const initialUsers = [
        { id: 1, name: 'Kunal Verma', email: 'kunal@example.com', role: 'Super Admin', companies: ['Acme Corp', 'Global Tech'], status: 'Active', lastLogin: '2024-04-24 10:15 AM' },
        { id: 2, name: 'Priya Patil', email: 'priya@tech.com', role: 'Super Admin', companies: ['Global Tech'], status: 'Active', lastLogin: '2024-04-23 04:45 PM' },
        { id: 3, name: 'Amit Patel', email: 'amit@partner.com', role: 'Viewer', companies: ['Acme Corp'], status: 'Inactive', lastLogin: '2024-04-15 09:00 AM' },
        { id: 4, name: 'Sneha Reddy', email: 'sneha@viewer.com', role: 'Viewer', companies: ['Acme Corp', 'Global Tech'], status: 'Active', lastLogin: '2024-04-24 11:30 AM' },
    ];

    const [users, setUsers] = useState(initialUsers);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Filtering Logic
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

    // Pagination Logic
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    // Reset pagination when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter]);

    const handleToggleStatus = (id) => {
        if (userRole !== 'Super Admin') return;
        setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
    };

    const handleDeleteUser = (id) => {
        Swal.fire({
            title: 'Delete User?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                setUsers(users.filter(u => u.id !== id));
                Swal.fire('Deleted!', 'User has been removed.', 'success');
            }
        });
    };

    const openUserModal = (user = null) => {
        setSelectedUser(user);
        setShowUserModal(true);
    };

    return (
        <div className="users-container">
            <div className="users-header">
                <div className="header-content">
                    <h2 className="page-title">Employee Master</h2>
                    <p className="page-subtitle">Manage employee profiles, system access, and company assignments.</p>
                </div>
                {userRole === 'Super Admin' && (
                    <div className="header-actions">
                        <button className="btn-primary-custom" onClick={() => openUserModal()}>
                            <i className="bi bi-person-plus-fill me-2"></i> Add New User
                        </button>
                    </div>
                )}
            </div>

            <div className="users-view fade-in">
                {/* Role Status Message */}
                {userRole === 'Viewer' && (
                    <div className="alert alert-info border-0 shadow-sm d-flex align-items-center mb-4">
                        <i className="bi bi-info-circle-fill me-3 fs-4"></i>
                        <div>
                            <strong>View Only Access:</strong> You can view system users and their assignments, but you cannot make any changes.
                        </div>
                    </div>
                )}

                {/* Filter Bar */}
                <div className="users-filter-card">
                    <div className="filter-grid">
                        <div className="filter-item">
                            <label>Search Users</label>
                            <div className="search-input-wrapper">
                                <i className="bi bi-search"></i>
                                <input
                                    type="text"
                                    placeholder="Name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="filter-item">
                            <label>Role</label>
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                                <option value="all">All Roles</option>
                                <option value="Super Admin">Super Admin</option>
                                <option value="Viewer">Viewer</option>
                            </select>
                        </div>
                        <div className="filter-item">
                            <label>Status</label>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="all">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="users-table-card">
                    <div className="table-responsive">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User Details</th>
                                    <th>Role</th>
                                    <th>Assigned Companies</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    {userRole === 'Super Admin' && <th className="text-end">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map(user => (
                                    <tr key={user.id} className={user.status === 'Inactive' ? 'row-inactive' : ''}>
                                        <td>
                                            <div className="user-info-cell">
                                                <div className={`user-avatar-small ${user.role === 'Viewer' ? 'bg-secondary' : ''}`}>
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="user-meta">
                                                    <span className="user-name">{user.name}</span>
                                                    <span className="user-email">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${user.role.toLowerCase().replace(' ', '-')}`}>
                                                {user.role}
                                            </span>
                                            {user.role === 'Viewer' && <div className="mt-1 small text-muted">View-only access</div>}
                                        </td>
                                        <td>
                                            <div className="company-tags">
                                                {user.companies.map(c => (
                                                    <span key={c} className="company-pill">{c}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={user.status === 'Active'}
                                                    onChange={() => handleToggleStatus(user.id)}
                                                    disabled={userRole !== 'Super Admin'}
                                                />
                                                <span className={`status-text ${user.status.toLowerCase()}`}>{user.status}</span>
                                            </div>
                                        </td>
                                        <td className="text-muted small">{user.lastLogin}</td>
                                        {userRole === 'Super Admin' && (
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn-icon" onClick={() => openUserModal(user)} title="Edit">
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button className="btn-icon text-danger" onClick={() => handleDeleteUser(user.id)} title="Delete">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Global Pagination Component */}
                    <Pagination 
                        totalItems={filteredUsers.length}
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

            {/* User Modal */}
            {showUserModal && userRole === 'Super Admin' && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header border-bottom-0 pb-0">
                                    <h5 className="modal-title fw-bold">
                                        {selectedUser ? 'Edit User Account' : 'Create New User'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowUserModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Full Name</label>
                                            <input type="text" className="form-control-custom" defaultValue={selectedUser?.name || ''} placeholder="e.g. Kunal Patil" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Email Address</label>
                                            <input type="email" className="form-control-custom" defaultValue={selectedUser?.email || ''} placeholder="e.g. kunal@technokraft.com" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Access Role</label>
                                            <select className="form-control-custom" defaultValue={selectedUser?.role || 'Viewer'}>
                                                <option>Super Admin</option>
                                                <option>Viewer</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label-custom">Account Status</label>
                                            <select className="form-control-custom" defaultValue={selectedUser?.status || 'Active'}>
                                                <option>Active</option>
                                                <option>Inactive</option>
                                            </select>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label-custom">Assign Companies <span className="text-danger">*</span></label>
                                            <div className="company-selection-grid">
                                                {['Acme Corp', 'Global Tech', 'Star Inc', 'PVT Ltd'].map(c => (
                                                    <div key={c} className="company-check-card">
                                                        <input type="checkbox" id={`comp-${c}`} defaultChecked={selectedUser?.companies.includes(c)} />
                                                        <label htmlFor={`comp-${c}`}>{c}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5">
                                        <button className="btn btn-primary-custom w-100 py-3 rounded-3" onClick={() => setShowUserModal(false)}>
                                            {selectedUser ? 'Save Changes' : 'Create Account'}
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

export default UsersPage;
