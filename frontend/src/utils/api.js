export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const baseUrl = process.env.REACT_APP_BASE_URL;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {}),
  };
  const resp = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const err = new Error(data?.message || resp.statusText);
    err.status = resp.status;
    err.body = data;
    throw err;
  }
  return data;
};
