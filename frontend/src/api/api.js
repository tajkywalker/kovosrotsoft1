const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Chyba serveru');
  }
  return res.json();
}

export const api = {
  materials:  {
    list:   ()        => req('GET',  '/materials'),
    create: (data)    => req('POST', '/materials', data),
  },
  types:  {
    list:   (matId)   => req('GET',  `/types${matId ? `?material_id=${matId}` : ''}`),
    create: (data)    => req('POST', '/types', data),
  },
  boxes:  {
    list:   (matId)   => req('GET',  `/boxes${matId ? `?material_id=${matId}` : ''}`),
    create: (data)    => req('POST', '/boxes', data),
  },
  containers: {
    list:   ()        => req('GET',  '/containers'),
    create: (data)    => req('POST', '/containers', data),
  },
  records: {
    list:    ()        => req('GET',  '/records'),
    summary: ()        => req('GET',  '/records/summary'),
    verify:  (from, to) => req('GET', `/records/verify?from=${from}&to=${to}`),
    create:  (data)    => req('POST', '/records', data),
    remove:  (id)      => req('DELETE', `/records/${id}`),
  },
};
