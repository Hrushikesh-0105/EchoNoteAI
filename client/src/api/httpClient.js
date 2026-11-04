const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Thin fetch wrapper: attaches the bearer token, JSON-encodes the body, throws on non-2xx
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
