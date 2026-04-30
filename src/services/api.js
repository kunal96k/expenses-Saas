const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9091/api';
let hasDispatchedSessionExpiry = false;

const getAuthHeader = () => {
    try {
        const token = localStorage.getItem('expenses_basic_auth');
        return token ? { Authorization: `Basic ${token}` } : {};
    } catch {
        return {};
    }
};

const handleResponse = async (response, { requiresAuth = false } = {}) => {
    if (response.status === 204) return null;
    
    const contentType = response.headers.get("content-type");
    let data = null;
    
    if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
    } else {
        const text = await response.text();
        data = { message: text?.trim() || response.statusText || '' };
    }

    if (!response.ok) {
        if (requiresAuth && (response.status === 401 || response.status === 403) && !hasDispatchedSessionExpiry) {
            hasDispatchedSessionExpiry = true;
            try {
                window.dispatchEvent(new CustomEvent('expenses:session-expired', {
                    detail: { status: response.status }
                }));
            } catch {
                // no-op for non-browser env
            }
        }
        const defaultByStatus = response.status === 401
            ? 'Invalid username or password'
            : response.status === 403
                ? 'Access denied'
                : response.status === 429
                    ? 'Too many requests. Please try again later.'
                : response.status === 404
                    ? 'Resource not found'
                    : 'Something went wrong';
        const message = data?.message || data?.error || response.statusText || defaultByStatus;
        const error = {
            status: response.status,
            message,
            errors: data?.errors || null
        };
        throw error;
    }
    if (requiresAuth) {
        hasDispatchedSessionExpiry = false;
    }
    return data;
};

export const apiService = {
    setBasicAuth: (username, password) => {
        const token = btoa(`${username}:${password}`);
        localStorage.setItem('expenses_basic_auth', token);
        return token;
    },

    clearBasicAuth: () => {
        localStorage.removeItem('expenses_basic_auth');
    },

    getPublic: async (endpoint, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { ...headers }
        });
        return handleResponse(response, { requiresAuth: false });
    },

    postPublic: async (endpoint, body, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body)
        });
        return handleResponse(response, { requiresAuth: false });
    },

    get: async (endpoint, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { ...getAuthHeader(), ...headers }
        });
        return handleResponse(response, { requiresAuth: true });
    },

    getAllPages: async (endpoint, {
        size = 200,
        sortBy = 'id',
        direction = 'asc',
        search = ''
    } = {}) => {
        const rows = [];
        let page = 0;
        let totalPages = 1;

        while (page < totalPages) {
            const params = new URLSearchParams({
                page: String(page),
                size: String(size),
                sortBy,
                direction
            });
            if (search) params.set('search', search);
            const result = await apiService.get(`${endpoint}?${params.toString()}`);
            rows.push(...(result?.content || []));
            totalPages = Math.max(Number(result?.totalPages || 0), 1);
            page += 1;
        }
        return rows;
    },

    post: async (endpoint, body, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...headers },
            body: JSON.stringify(body)
        });
        return handleResponse(response, { requiresAuth: true });
    },

    put: async (endpoint, body, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...headers },
            body: JSON.stringify(body)
        });
        return handleResponse(response, { requiresAuth: true });
    },

    patch: async (endpoint, body = {}, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...headers },
            body: JSON.stringify(body)
        });
        return handleResponse(response, { requiresAuth: true });
    },

    delete: async (endpoint, headers = {}) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader(), ...headers }
        });
        if (response.status === 204) return null;
        return handleResponse(response, { requiresAuth: true });
    }
};
