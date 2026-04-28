const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

const handleResponse = async (response) => {
    if (response.status === 204) return null;
    
    const contentType = response.headers.get("content-type");
    let data = null;
    
    if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
    } else {
        // Fallback for non-JSON or empty responses
        data = { message: response.statusText || 'Error occurred' };
    }

    if (!response.ok) {
        const error = {
            status: response.status,
            message: data?.message || 'Something went wrong',
            errors: data?.errors || null
        };
        throw error;
    }
    return data;
};

export const apiService = {
    get: async (endpoint, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { ...headers }
        });
        return handleResponse(response);
    },

    post: async (endpoint, body, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body)
        });
        return handleResponse(response);
    },

    put: async (endpoint, body, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body)
        });
        return handleResponse(response);
    },

    patch: async (endpoint, body = {}, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body)
        });
        return handleResponse(response);
    },

    delete: async (endpoint, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { ...headers }
        });
        if (response.status === 204) return null;
        return handleResponse(response);
    }
};
