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

export default function Seznam() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
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
      r.date.includes(q)
      || r.material_abbr.toLowerCase().includes(q)
      || r.type_name.toLowerCase().includes(q)
      || r.box_name.toLowerCase().includes(q)
      || r.location_type.toLowerCase().includes(q)
      || r.location_name.toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleDelete = async (id) => {
    if (!confirm('Opravdu smazat tento záznam?')) return;
    setDeleting(id);
    try {
      await api.records.remove(id);
      load();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Seznam záznamů</h1>
          <p className="text-sm text-gray-400">{records.length} celkem</p>
        </div>
        <input
          className="form-input w-64"
          placeholder="🔍  Hledat…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Načítám…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
          {search ? 'Žádné záznamy neodpovídají hledání.' : 'Žádné záznamy. Přidejte první záznam přes NOVÝ ZÁPIS.'}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Datum', 'Mat.', 'Typ', 'Bedna', 'Brutto', 'Čistá', 'Umístění', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${MAT_COLOR[r.material_abbr] || 'bg-gray-100 text-gray-700'}`}>
                        {r.material_abbr}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.type_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.box_name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {String(r.brutto_weight).replace('.', ',')} kg
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {String(r.netto_weight).replace('.', ',')} kg
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${LOC_COLOR[r.location_type] || 'bg-gray-100'}`}>
                        {r.location_type}
                      </span>
                      <span className="ml-2 text-gray-500 text-xs">{r.location_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="opacity-0 group-hover:opacity-100 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition"
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting === r.id}
                      >
                        {deleting === r.id ? '…' : 'Smazat'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
