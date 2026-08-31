const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Thin fetch wrapper: builds the full URL, attaches the bearer token, JSON-encodes
 * the body, and throws with the server's error message on a non-2xx response.
 * @param {string} path - e.g. '/api/sessions'
 * @param {string} token - Clerk session token
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body]
 * @returns {Promise<any>} parsed JSON response
 */
export async function authedRequest(path, token, { method = 'GET', body } = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
}
