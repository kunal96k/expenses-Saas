import React, { useState } from 'react';

const AddInternPage = ({ onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dept: 'Software Development',
    status: 'active'
  });

  const handleSave = () => {
    if (formData.name) {
      onSave(formData);
      setFormData({ name: '', email: '', dept: 'Software Development', status: 'active' });
    }
  };

  return (
    <form id="addInternForm">
      <div className="mb-3">
        <label className="form-label">Full Name</label>
        <input 
          type="text" 
          className="form-control" 
          id="formName" 
          placeholder="e.g. Aditi Rao" 
          required 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Email Address</label>
        <input 
          type="email" 
          className="form-control" 
          id="formEmail" 
          placeholder="name@company.com" 
          required 
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
      </div>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Department</label>
          <select 
            className="form-select" 
            id="formDept" 
            value={formData.dept}
            onChange={(e) => setFormData({...formData, dept: e.target.value})}
          >
            <option>Software Development</option>
            <option>Application Development</option>
            <option>Web Development</option>
            <option>Frontend Development</option>
          </select>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Status</label>
          <select 
            className="form-select" 
            id="formStatus" 
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="modal-footer px-0 pb-0">
        <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button 
          type="button" 
          className="btn btn-primary-custom" 
          onClick={handleSave}
          data-bs-dismiss={formData.name ? "modal" : ""}
        >
          Save Record
        </button>
      </div>
    </form>
  );
};

export default AddInternPage;
