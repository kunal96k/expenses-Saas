import { useState } from 'react';
import './AddAccountModal.css';

export default function AddAccountModal({ onClose, onSave }) {
    const [formData, setFormData] = useState({
        accountCode: '',
        bankCode: '',
        name: '',
        description: '',
        accountType: 'SAVINGS',
        currency: 'USD',
        balance: 0,
        active: true,
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.accountCode.trim()) {
            newErrors.accountCode = 'Account code is required';
        } else if (formData.accountCode.length < 2) {
            newErrors.accountCode = 'Account code must be at least 2 characters';
        }
        
        if (!formData.bankCode.trim()) {
            newErrors.bankCode = 'Bank code is required';
        } else if (formData.bankCode.length < 2) {
            newErrors.bankCode = 'Bank code must be at least 2 characters';
        }
        
        if (!formData.name.trim()) {
            newErrors.name = 'Account name is required';
        } else if (formData.name.length < 2) {
            newErrors.name = 'Account name must be at least 2 characters';
        }
        
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);
        try {
            await onSave(formData);
            setFormData({
                accountCode: '',
                bankCode: '',
                name: '',
                description: '',
                accountType: 'SAVINGS',
                currency: 'USD',
                balance: 0,
                active: true,
            });
            setErrors({});
            onClose();
        } catch (error) {
            console.error('Error saving account:', error);
            if (error.response?.data?.message) {
                setErrors({ submit: error.response.data.message });
            } else {
                setErrors({ submit: 'Failed to save account' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Account</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="account-form">
                    {errors.submit && (
                        <div className="error-message">{errors.submit}</div>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="accountCode">Account Code *</label>
                        <input
                            type="text"
                            id="accountCode"
                            name="accountCode"
                            value={formData.accountCode}
                            onChange={handleChange}
                            placeholder="Enter account code"
                            className={errors.accountCode ? 'input-error' : ''}
                            disabled={isLoading}
                        />
                        {errors.accountCode && (
                            <span className="field-error">{errors.accountCode}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="bankCode">Bank Code *</label>
                        <input
                            type="text"
                            id="bankCode"
                            name="bankCode"
                            value={formData.bankCode}
                            onChange={handleChange}
                            placeholder="Enter bank code"
                            className={errors.bankCode ? 'input-error' : ''}
                            disabled={isLoading}
                        />
                        {errors.bankCode && (
                            <span className="field-error">{errors.bankCode}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="name">Account Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter account name"
                            className={errors.name ? 'input-error' : ''}
                            disabled={isLoading}
                        />
                        {errors.name && (
                            <span className="field-error">{errors.name}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="accountType">Account Type</label>
                        <select
                            id="accountType"
                            name="accountType"
                            value={formData.accountType}
                            onChange={handleChange}
                            disabled={isLoading}
                        >
                            <option value="SAVINGS">Savings</option>
                            <option value="CHECKING">Checking</option>
                            <option value="BUSINESS">Business</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="currency">Currency</label>
                        <select
                            id="currency"
                            name="currency"
                            value={formData.currency}
                            onChange={handleChange}
                            disabled={isLoading}
                        >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="INR">INR</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter account description"
                            rows="3"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group checkbox">
                        <label htmlFor="active">
                            <input
                                type="checkbox"
                                id="active"
                                name="active"
                                checked={formData.active}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                            Active Account
                        </label>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
