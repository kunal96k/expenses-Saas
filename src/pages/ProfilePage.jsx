import React from 'react';
import Swal from 'sweetalert2';

const ProfilePage = () => {
  const saveProfile = () => {
    Swal.fire({
      icon: 'success',
      title: 'Profile Updated!',
      text: 'Your profile has been updated successfully.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="profile-page">
      <div className="text-center mb-4">
        <div className="position-relative d-inline-block">
          <img src="https://ui-avatars.com/api/?name=kunal+patil&background=4f46e5&color=fff&size=120" 
               alt="Profile" className="rounded-circle" style={{ width: '120px', height: '120px' }} />
          <button className="btn btn-sm btn-primary-custom position-absolute" 
                  style={{ bottom: 0, right: 0, borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}>
            <i className="bi bi-camera"></i>
          </button>
        </div>
        <h4 className="mt-3 mb-1">kunal patil</h4>
        <p className="text-muted mb-0">Super Administrator</p>
        <span className="status-badge status-active mt-2">Active</span>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Full Name</label>
          <input type="text" className="form-control" defaultValue="kunal patil" />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Email Address</label>
          <input type="email" className="form-control" defaultValue="kunal.patil@technokraft.com" />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Phone Number</label>
          <input type="tel" className="form-control" defaultValue="+91 98765 43210" />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Department</label>
          <select className="form-select" defaultValue="Administration">
            <option>Administration</option>
            <option>Software Development</option>
            <option>Application Development</option>
            <option>Web Development</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Role</label>
          <select className="form-select" defaultValue="Super Admin">
            <option>Super Admin</option>
            <option>Admin</option>
            <option>Manager</option>
            <option>User</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Join Date</label>
          <input type="date" className="form-control" defaultValue="2023-01-15" />
        </div>
        <div className="col-12">
          <label className="form-label fw-semibold">Bio</label>
          <textarea className="form-control" rows="3" placeholder="Tell us about yourself..." defaultValue="Experienced administrator with 5+ years in educational technology management."></textarea>
        </div>
      </div>
      
      <div className="modal-footer px-0 pb-0 mt-4">
        <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button type="button" className="btn btn-primary-custom" onClick={saveProfile} data-bs-dismiss="modal">
          <i className="bi bi-check-lg me-1"></i> Save Changes
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
