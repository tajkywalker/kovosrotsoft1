const BASE = '/api';

function getToken() {
  return localStorage.getItem('kss_token') || '';
}

async function req(method, path, body) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('kss_token');
    window.location.href = '/login';
    throw new Error('Nepřihlášen');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Chyba serveru');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (data) => fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Chyba přihlášení');
      return d;
    }),
  },
  materials:  {
    list:    ()     => req('GET',    '/materials'),
    create:  (data) => req('POST',   '/materials', data),
    remove:  (id)   => req('DELETE', `/materials/${id}`),
  },
  types:  {
    list:    (matId) => req('GET',   `/types${matId ? `?material_id=${matId}` : ''}`),
    create:  (data)  => req('POST',  '/types', data),
    remove:  (id)    => req('DELETE', `/types/${id}`),
  },
  boxes:  {
    list:    (matId) => req('GET',   `/boxes${matId ? `?material_id=${matId}` : ''}`),
    create:  (data)  => req('POST',  '/boxes', data),
    setTare: (id, t) => req('PATCH', `/boxes/${id}/tare`, { tare_weight: t }),
    remove:  (id)    => req('DELETE', `/boxes/${id}`),
  },
  containers: {
    list:   ()     => req('GET',    '/containers'),
    create: (data) => req('POST',   '/containers', data),
    remove: (id)   => req('DELETE', `/containers/${id}`),
  },
  records: {
    list:    ()          => req('GET',    '/records'),
    summary: ()          => req('GET',    '/records/summary'),
    verify:  (from, to)  => req('GET',   `/records/verify?from=${from}&to=${to}`),
    create:  (data)      => req('POST',   '/records', data),
    remove:  (id)        => req('DELETE', `/records/${id}`),
  },
  logs: {
    list: (limit) => req('GET', `/logs${limit ? `?limit=${limit}` : ''}`),
  },
};
