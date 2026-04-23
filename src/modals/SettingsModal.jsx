import React from 'react';
import SettingsPage from '../pages/SettingsPage';

const SettingsModal = () => {
  return (
    <div className="modal fade custom-modal" id="settingsModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Account Settings</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body">
            <SettingsPage />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
