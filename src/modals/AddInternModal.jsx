import React from 'react';
import AddInternPage from '../pages/AddInternPage';

const AddInternModal = ({ onSave }) => {
  return (
    <div className="modal fade custom-modal" id="addModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Onboard New Intern</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body">
            <AddInternPage onSave={onSave} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddInternModal;
