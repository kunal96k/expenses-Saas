const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        const error = {
            status: response.status,
            message: data.message || 'Something went wrong',
            errors: data.errors || null
        };
        throw error;
    }
    return data;
};

export const apiService = {
    get: async (endpoint) => {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        return handleResponse(response);
    },

    post: async (endpoint, body) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return handleResponse(response);
    },

    put: async (endpoint, body) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return handleResponse(response);
    },

    patch: async (endpoint, body = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return handleResponse(response);
    },

    delete: async (endpoint) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE'
        });
        if (response.status === 204) return null;
        return handleResponse(response);
    }
};
