import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/api.js';

const LOC_COLOR = {
  KONTEJNER: 'bg-blue-100 text-blue-700',
  BEDNA:     'bg-amber-100 text-amber-700',
};
const MAT_COLOR = {
  AL:    'bg-blue-100 text-blue-700',
  Cu:    'bg-orange-100 text-orange-700',
  Fe:    'bg-gray-200 text-gray-700',
  Pb:    'bg-purple-100 text-purple-700',
  Zn:    'bg-green-100 text-green-700',
  Nerez: 'bg-cyan-100 text-cyan-700',
};

// Mobile record card
function RecordCard({ r, onDelete, deleting }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${MAT_COLOR[r.material_abbr] || 'bg-gray-100 text-gray-700'}`}>
            {r.material_abbr}
          </span>
          <span className="font-semibold text-gray-800 text-sm">{r.type_name}</span>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{r.date}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-500">Bedna</span>
        <span className="font-medium">{r.box_name}</span>
        <span className="text-gray-500">Brutto</span>
        <span>{String(r.brutto_weight).replace('.', ',')} kg</span>
        <span className="text-gray-500">Čistá</span>
        <span className="font-bold text-gray-800">{String(r.netto_weight).replace('.', ',')} kg</span>
        <span className="text-gray-500">Umístění</span>
        <span className="flex items-center gap-1">
          <span className={`badge text-[10px] ${LOC_COLOR[r.location_type] || ''}`}>{r.location_type}</span>
          <span className="text-gray-500 truncate">{r.location_name}</span>
        </span>
      </div>
      <div className="flex justify-end">
        <button
          className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50"
          onClick={() => onDelete(r.id)}
          disabled={deleting === r.id}
        >
          {deleting === r.id ? '…' : 'Smazat'}
        </button>
      </div>
    </div>
  );
}

export default function Seznam() {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    api.records.list().then(setRecords).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      r.date.includes(q) ||
      r.material_abbr.toLowerCase().includes(q) ||
      r.type_name.toLowerCase().includes(q) ||
      r.box_name.toLowerCase().includes(q) ||
      r.location_name.toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleDelete = async (id) => {
    if (!confirm('Opravdu smazat tento záznam?')) return;
    setDeleting(id);
    try { await api.records.remove(id); load(); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">Seznam záznamů</h1>
          <p className="text-sm text-gray-400">{records.length} celkem</p>
        </div>
        <input
          className="form-input w-full sm:w-56"
          placeholder="🔍  Hledat…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Načítám…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          {search ? 'Žádné záznamy neodpovídají hledání.' : 'Žádné záznamy.'}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 sm:hidden">
            {filtered.map(r => (
              <RecordCard key={r.id} r={r} onDelete={handleDelete} deleting={deleting} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="card hidden sm:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Datum','Mat.','Typ','Bedna','Brutto','Čistá','Umístění',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{r.date}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${MAT_COLOR[r.material_abbr] || 'bg-gray-100 text-gray-700'}`}>{r.material_abbr}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.type_name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.box_name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{String(r.brutto_weight).replace('.', ',')} kg</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{String(r.netto_weight).replace('.', ',')} kg</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${LOC_COLOR[r.location_type] || ''}`}>{r.location_type}</span>
                        <span className="ml-1.5 text-gray-500 text-xs">{r.location_name}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="opacity-0 group-hover:opacity-100 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition"
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                        >{deleting === r.id ? '…' : 'Smazat'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
