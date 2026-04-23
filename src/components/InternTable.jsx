import React from 'react';

const InternTable = ({ interns, onDelete, onEdit }) => {
  return (
    <div className="card table-card">
      <div className="card-header-custom">
        <div>
          <h5>Recent Onboarding</h5>
          <p className="text-muted mb-0 sm-text">Manage the latest intern entries</p>
        </div>
        <button 
          className="btn btn-primary-custom" 
          data-bs-toggle="modal" 
          data-bs-target="#addModal"
        >
          <i className="bi bi-plus-lg"></i> Add New
        </button>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table custom-table mb-0" id="internTable">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Department</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {interns.map(intern => {
                const initials = intern.name.split(' ').map(n => n[0]).join('');
                return (
                  <tr key={intern.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar-initial">{initials}</div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--dark)' }}>{intern.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: #{intern.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{intern.dept}</td>
                    <td>{intern.date}</td>
                    <td>
                      <span className={`status-badge status-${intern.status}`}>
                        {intern.status.charAt(0).toUpperCase() + intern.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <button className="btn-sm-action" onClick={() => onEdit(intern.id)} title="Edit">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn-sm-action" onClick={() => onDelete(intern.id)} title="Delete">
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InternTable;
