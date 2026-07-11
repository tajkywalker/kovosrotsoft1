import { useState } from 'react';
import { api } from '../../api/api.js';

function fmtDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function firstOfMonth() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `01.${mm}.${d.getFullYear()}`;
}

function kgToT(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(3).replace('.', ',')} t`;
  return `${String(kg).replace('.', ',')} kg`;
}

const MAT_COLORS = {
  AL:    'bg-blue-100 text-blue-700',
  Cu:    'bg-orange-100 text-orange-700',
  Fe:    'bg-gray-200 text-gray-700',
  Pb:    'bg-purple-100 text-purple-700',
  Zn:    'bg-green-100 text-green-700',
  Nerez: 'bg-cyan-100 text-cyan-700',
};

export default function Overeni() {
  const [from,    setFrom]    = useState(firstOfMonth());
  const [to,      setTo]      = useState(fmtDate());
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const rows = await api.records.verify(from, to);
      setData(rows);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const totalNetto  = data?.reduce((s, r) => s + r.total_netto, 0) ?? 0;
  const totalBrutto = data?.reduce((s, r) => s + r.total_brutto, 0) ?? 0;
  const totalCount  = data?.reduce((s, r) => s + r.count, 0) ?? 0;

  // Validate DD.MM.YYYY format
  const datePattern = /^\d{2}\.\d{2}\.\d{4}$/;
  const valid = datePattern.test(from) && datePattern.test(to);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Ověření</h1>
        <p className="text-sm text-gray-400">Součty dle data – zadejte rozmezí a zjistěte celkové váhy</p>
      </div>

      {/* Date range form */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5"
      >
        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Datum od</label>
            <input
              className="form-input"
              placeholder="DD.MM.YYYY"
              value={from}
              onChange={e => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Datum do</label>
            <input
              className="form-input"
              placeholder="DD.MM.YYYY"
              value={to}
              onChange={e => setTo(e.target.value)}
              required
            />
          </div>
          <button
            className="btn-primary"
            type="submit"
            disabled={loading || !valid}
          >
            {loading ? 'Hledám…' : '🔍 Vyhledat'}
          </button>
        </div>
        {!valid && (from || to) && (
          <p className="mt-2 text-xs text-orange-500">Formát data: DD.MM.YYYY</p>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </form>

      {/* Results */}
      {data !== null && (
        <div className="space-y-4">
          <div className="text-sm text-gray-500 font-medium">
            Výsledky za období <strong className="text-gray-800">{from}</strong> – <strong className="text-gray-800">{to}</strong>
          </div>

          {/* Summary totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 font-semibold uppercase">Záznamy</p>
              <p className="text-2xl font-extrabold text-gray-800 mt-0.5">{totalCount}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 font-semibold uppercase">Čistá celkem</p>
              <p className="text-2xl font-extrabold text-blue-700 mt-0.5">{kgToT(Math.round(totalNetto * 10) / 10)}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 font-semibold uppercase">Brutto celkem</p>
              <p className="text-2xl font-extrabold text-gray-600 mt-0.5">{kgToT(Math.round(totalBrutto * 10) / 10)}</p>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center text-gray-400 shadow-sm">
              Žádné záznamy v tomto období.
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Materiál</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Typ</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Záznamy</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Čistá váha</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 hidden sm:table-cell">Brutto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className={`badge ${MAT_COLORS[row.material_abbr] || 'bg-gray-100 text-gray-700'}`}>
                          {row.material_abbr}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">{row.material_name}</span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-800">{row.type_name}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{row.count}×</td>
                      <td className="px-5 py-3 text-right font-bold text-gray-800">{kgToT(row.total_netto)}</td>
                      <td className="px-5 py-3 text-right text-gray-400 hidden sm:table-cell">{kgToT(row.total_brutto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
