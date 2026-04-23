import React from 'react';
import NotificationsPage from '../pages/NotificationsPage';

const NotificationsModal = () => {
  return (
    <div className="modal fade custom-modal" id="notificationsModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Notifications</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body">
            <NotificationsPage />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
