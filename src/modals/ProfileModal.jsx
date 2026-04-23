import React from 'react';
import ProfilePage from '../pages/ProfilePage';

const ProfileModal = () => {
  return (
    <div className="modal fade custom-modal" id="profileModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title">My Profile</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body">
            <ProfilePage />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
