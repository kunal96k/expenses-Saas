import React from 'react';
import Swal from 'sweetalert2';

const SettingsPage = () => {
  const saveSettings = () => {
    Swal.fire({
      icon: 'success',
      title: 'Settings Saved!',
      text: 'Your settings have been saved successfully.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="settings-page">
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item">
          <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#generalTab">
            <i className="bi bi-gear me-2"></i>General
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" data-bs-toggle="tab" data-bs-target="#securityTab">
            <i className="bi bi-shield-lock me-2"></i>Security
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" data-bs-toggle="tab" data-bs-target="#notificationTab">
            <i className="bi bi-bell me-2"></i>Notifications
          </button>
        </li>
      </ul>

      <div className="tab-content">
        <div className="tab-pane fade show active" id="generalTab">
          <h6 className="mb-3">Preferences</h6>
          <div className="mb-3">
            <label className="form-label">Language</label>
            <select className="form-select" defaultValue="English (US)">
              <option>English (US)</option>
              <option>Hindi</option>
              <option>Marathi</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Timezone</label>
            <select className="form-select" defaultValue="Asia/Kolkata (IST)">
              <option>Asia/Kolkata (IST)</option>
              <option>America/New_York (EST)</option>
              <option>Europe/London (GMT)</option>
            </select>
          </div>
          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" id="darkMode" />
            <label className="form-check-label" htmlFor="darkMode">Enable Dark Mode</label>
          </div>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="autoSave" defaultChecked />
            <label className="form-check-label" htmlFor="autoSave">Auto-save changes</label>
          </div>
        </div>
        
        <div className="tab-pane fade" id="securityTab">
          <h6 className="mb-3">Password</h6>
          <div className="mb-3">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-control" placeholder="Enter current password" />
          </div>
          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input type="password" className="form-control" placeholder="Enter new password" />
          </div>
          <div className="mb-4">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-control" placeholder="Confirm new password" />
          </div>
        </div>

        <div className="tab-pane fade" id="notificationTab">
          <h6 className="mb-3">Email Notifications</h6>
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" id="emailInterns" defaultChecked />
            <label className="form-check-label" htmlFor="emailInterns">
              <div className="fw-semibold">New Intern Registration</div>
              <small className="text-muted">Receive email when new intern joins</small>
            </label>
          </div>
        </div>
      </div>
      
      <div className="modal-footer px-0 pb-0 mt-4">
        <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button type="button" className="btn btn-primary-custom" onClick={saveSettings} data-bs-dismiss="modal">
          <i className="bi bi-check-lg me-1"></i> Save Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
