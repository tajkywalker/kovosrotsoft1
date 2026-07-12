const BASE = '/api';

function getToken() { return localStorage.getItem('kss_token') || ''; }

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
    window.location.href = '/';
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
    list:   ()     => req('GET',    '/materials'),
    create: (data) => req('POST',   '/materials', data),
    remove: (id)   => req('DELETE', `/materials/${id}`),
  },
  types:  {
    list:   (matId) => req('GET',   `/types${matId ? `?material_id=${matId}` : ''}`),
    create: (data)  => req('POST',  '/types', data),
    remove: (id)    => req('DELETE', `/types/${id}`),
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
    list:    ()         => req('GET',    '/records'),
    summary: ()         => req('GET',    '/records/summary'),
    verify:  (f, t)     => req('GET',   `/records/verify?from=${f}&to=${t}`),
    create:  (data)     => req('POST',   '/records', data),
    remove:  (id)       => req('DELETE', `/records/${id}`),
  },
  logs: {
    list: (limit) => req('GET', `/logs${limit ? `?limit=${limit}` : ''}`),
  },
  konvertor: {
    // Upload PDF – uses FormData, not JSON
    upload: async (file) => {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch(`${BASE}/konvertor/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Chyba uploadu');
      return d;
    },
    imports:  ()    => req('GET',    '/konvertor/imports'),
    rows:     (id)  => req('GET',    `/konvertor/imports/${id}/rows`),
    remove:   (id)  => req('DELETE', `/konvertor/imports/${id}`),
    remap:    (id)  => req('POST',   `/konvertor/imports/${id}/remap`, {}),
    reparse:  (id)  => req('POST',   `/konvertor/imports/${id}/reparse`, {}),
    rawtext:  (id)  => req('GET',    `/konvertor/imports/${id}/rawtext`),
    mappings: {
      list:   ()     => req('GET',    '/konvertor/mappings'),
      save:   (data) => req('POST',   '/konvertor/mappings', data),
      remove: (id)   => req('DELETE', `/konvertor/mappings/${id}`),
    },
  },
};
