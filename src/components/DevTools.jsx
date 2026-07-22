import React, { useState } from 'react';
import { apiService } from '../services/api';
import Swal from 'sweetalert2';

const DevTools = ({ userRole, setUserRole, refreshData, isVisible }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Only show if in DEV mode AND isVisible is true AND user is Super Admin
    if (!import.meta.env.DEV || !isVisible || userRole !== 'Super Admin') return null;

    const roles = [
        { label: 'Super Admin', value: 'Super Admin', raw: 'SUPERADMIN' },
        { label: 'Viewer', value: 'Viewer', raw: 'VIEWER' }
    ];

    const handleRoleChange = (role) => {
        setUserRole(role.value);
        setIsOpen(false);
        Swal.fire({
            title: 'Role Switched',
            text: `You are now acting as: ${role.label}`,
            icon: 'info',
            timer: 1000,
            showConfirmButton: false
        });
    };

    const resetDatabase = async () => {
        const result = await Swal.fire({
            title: 'Reset Dev Data?',
            text: 'This will clear local storage and re-initialize the app. (Database must be reset manually or via endpoint if available)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reset'
        });

        if (result.isConfirmed) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="dev-tools-wrapper" style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999
        }}>
            <button 
                className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                style={{ width: '50px', height: '50px', border: '2px solid #3b82f6' }}
                onClick={() => setIsOpen(!isOpen)}
                title="Developer Tools"
            >
                <i className={`bi bi-gear-fill ${isOpen ? 'spin' : ''}`} style={{ fontSize: '1.5rem' }}></i>
            </button>

            {isOpen && (
                <div className="card shadow-lg mt-2" style={{
                    position: 'absolute',
                    bottom: '60px',
                    right: '0',
                    width: '240px',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}>
                    <div className="card-header bg-dark text-white py-2">
                        <small className="fw-bold">Developer Support</small>
                    </div>
                    <div className="card-body p-3">
                        <div className="mb-3">
                            <label className="form-label small text-muted mb-1">Switch Role (Client-side)</label>
                            <div className="d-flex flex-column gap-1">
                                {roles.map(role => (
                                    <button 
                                        key={role.value}
                                        className={`btn btn-sm text-start ${userRole === role.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => handleRoleChange(role)}
                                    >
                                        <i className={`bi bi-${userRole === role.value ? 'check-circle-fill' : 'circle'} me-2`}></i>
                                        {role.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-top pt-2 mt-2">
                            <button className="btn btn-sm btn-outline-danger w-100" onClick={resetDatabase}>
                                <i className="bi bi-arrow-counterclockwise me-2"></i> Reset App State
                            </button>
                        </div>
                    </div>
                    <div className="card-footer py-1 bg-light text-center">
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>DEV MODE ONLY</small>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .dev-tools-wrapper .spin {
                    animation: spin 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default DevTools;
