async function getAuthToken() {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) {
        throw new Error('NOT_SIGNED_IN');
    }
    return authToken;
}

async function authedFetch(path, options = {}) {
    const token = await getAuthToken();
    const response = await fetch(`${window.ECHO_CONFIG.API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        // Token expired/invalid: drop it so the popup routes back to sign-in next time.
        await chrome.storage.local.remove('authToken');
        throw new Error('TOKEN_EXPIRED');
    }

    return response;
}

export async function uploadScreenShot(base64Image, sessionId) {
    console.log("Uploading screenshot for session", sessionId);

    const response = await authedFetch(`/api/sessions/${sessionId}/screenshots`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image })
    });
    if (!response.ok) {
        throw new Error('Failed to upload screenshot');
    }
    console.log("Image uploaded");
    return await response.json();
}

export async function getSessionId(title) {
    const response = await authedFetch('/api/sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ title })
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully fetched session Id:', data);
    return data.session?._id || null;
}
