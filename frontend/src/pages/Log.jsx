import { useState, useEffect } from 'react';
import { api } from '../api/api.js';

const ACTION_STYLE = {
  CREATE_RECORD:    { bg: 'bg-green-100',  text: 'text-green-700',  label: '+ Záznam' },
  DELETE_RECORD:    { bg: 'bg-red-100',    text: 'text-red-700',    label: '− Záznam' },
  CREATE_MATERIAL:  { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '+ Materiál' },
  DELETE_MATERIAL:  { bg: 'bg-red-100',    text: 'text-red-700',    label: '− Materiál' },
  CREATE_TYPE:      { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '+ Typ' },
  DELETE_TYPE:      { bg: 'bg-red-100',    text: 'text-red-700',    label: '− Typ' },
  CREATE_BOX:       { bg: 'bg-purple-100', text: 'text-purple-700', label: '+ Bedna' },
  DELETE_BOX:       { bg: 'bg-red-100',    text: 'text-red-700',    label: '− Bedna' },
  UPDATE_BOX_TARE:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '✎ Tára' },
  CREATE_CONTAINER: { bg: 'bg-cyan-100',   text: 'text-cyan-700',   label: '+ Kontejner' },
  DELETE_CONTAINER: { bg: 'bg-red-100',    text: 'text-red-700',    label: '− Kontejner' },
  USER_LOGIN:       { bg: 'bg-gray-100',   text: 'text-gray-600',   label: '⚑ Login' },
};

function formatDetails(action, detailsStr) {
  try {
    const d = JSON.parse(detailsStr);
    switch (action) {
      case 'CREATE_RECORD':
      case 'DELETE_RECORD':
        return `${d.date} · ${d.material} · ${d.type} · ${d.box} · ${d.netto} kg · ${d.location}`;
      case 'CREATE_MATERIAL':
      case 'DELETE_MATERIAL':
        return `${d.abbreviation} – ${d.name}`;
      case 'CREATE_TYPE':
      case 'DELETE_TYPE':
        return `${d.name} (mat. ID ${d.material_id})`;
      case 'CREATE_BOX':
      case 'DELETE_BOX':
        return `${d.name} · tára ${d.tare_weight ?? 0} kg`;
      case 'UPDATE_BOX_TARE':
        return `Box ID ${d.id} → ${d.tare_weight} kg`;
      case 'CREATE_CONTAINER':
      case 'DELETE_CONTAINER':
        return d.name;
      case 'USER_LOGIN':
        return `Uživatel: ${d.username}`;
      default:
        return detailsStr.slice(0, 100);
    }
  } catch {
    return detailsStr.slice(0, 100);
  }
}

export default function Log() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');

  const load = () => {
    setLoading(true);
    api.logs.list(500).then(setLogs).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter
    ? logs.filter(l => l.action.includes(filter) || l.details.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Log</h1>
          <p className="text-sm text-gray-400">Automaticky se aktualizuje každých 30 s · {logs.length} záznamů</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Filter chips */}
          {['', 'RECORD', 'MATERIAL', 'TYPE', 'BOX', 'CONTAINER', 'LOGIN'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                filter === f
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {f === '' ? 'Vše' : f}
            </button>
          ))}
          <button onClick={load} className="rounded-full px-3 py-1 text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition">
            ↻ Obnovit
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Načítám…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
          Žádné záznamy v logu.
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-40">Čas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-28">Akce</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Detail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-16">Uživatel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(log => {
                const style = ACTION_STYLE[log.action] || { bg: 'bg-gray-100', text: 'text-gray-700', label: log.action };
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap font-mono">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs">
                      {formatDetails(log.action, log.details)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{log.user_name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
