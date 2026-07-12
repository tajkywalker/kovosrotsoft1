import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

const MAT_COLORS = {
  AL:    { bg:'bg-blue-100',   text:'text-blue-700',   dot:'bg-blue-500',   border:'border-blue-200' },
  Cu:    { bg:'bg-orange-100', text:'text-orange-700', dot:'bg-orange-500', border:'border-orange-200' },
  Fe:    { bg:'bg-gray-200',   text:'text-gray-700',   dot:'bg-gray-500',   border:'border-gray-300' },
  Pb:    { bg:'bg-purple-100', text:'text-purple-700', dot:'bg-purple-500', border:'border-purple-200' },
  Zn:    { bg:'bg-green-100',  text:'text-green-700',  dot:'bg-green-500',  border:'border-green-200' },
  Nerez: { bg:'bg-cyan-100',   text:'text-cyan-700',   dot:'bg-cyan-500',   border:'border-cyan-200' },
};
function getCol(a){ return MAT_COLORS[a] || {bg:'bg-gray-100',text:'text-gray-700',dot:'bg-gray-400',border:'border-gray-200'}; }
function fmtKg(kg){ return kg>=1000 ? `${(kg/1000).toFixed(2).replace('.',',')} t` : `${String(Math.round(kg*10)/10).replace('.',',')} kg`; }

export default function Prehled() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.records.summary().then(setData).finally(() => setLoading(false)); }, []);

  const byMat = data.reduce((acc, r) => {
    if (!acc[r.material_abbr]) acc[r.material_abbr] = { name: r.material_name, rows: [], netto: 0, count: 0 };
    acc[r.material_abbr].rows.push(r);
    acc[r.material_abbr].netto += r.total_netto;
    acc[r.material_abbr].count += r.count;
    return acc;
  }, {});

  const totalNetto = data.reduce((s, r) => s + r.total_netto, 0);
  const totalCount = data.reduce((s, r) => s + r.count, 0);

  if (loading) return <div className="flex h-48 items-center justify-center text-gray-400">Načítám…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">Přehled</h1>
        <p className="text-sm text-gray-400">Souhrn od začátku evidence</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Záznamy',   value: totalCount,             cls: 'text-gray-800' },
          { label: 'Čistá celkem', value: fmtKg(Math.round(totalNetto*10)/10), cls: 'text-blue-700' },
          { label: 'Materiálů',  value: Object.keys(byMat).length, cls: 'text-gray-800' },
          { label: 'Typů',      value: data.length,            cls: 'text-gray-800' },
        ].map(c => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
            <p className={`mt-1 text-2xl sm:text-3xl font-extrabold ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Per-material */}
      {Object.keys(byMat).length === 0 ? (
        <div className="card p-10 text-center text-gray-400">Žádné záznamy.</div>
      ) : (
        Object.entries(byMat).map(([abbr, mat]) => {
          const col = getCol(abbr);
          return (
            <div key={abbr} className={`card overflow-hidden border ${col.border}`}>
              <div className={`flex items-center gap-3 px-4 py-3 ${col.bg} border-b ${col.border}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <span className={`font-extrabold text-base ${col.text}`}>{abbr}</span>
                <span className={`text-xs font-medium ${col.text} opacity-70`}>{mat.name}</span>
                <span className="ml-auto text-xs text-gray-500">{mat.count} záz. · {fmtKg(Math.round(mat.netto*10)/10)}</span>
              </div>

              {/* Mobile: stacked rows */}
              <div className="sm:hidden divide-y divide-gray-100">
                {mat.rows.map(r => (
                  <div key={r.type_name} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{r.type_name}</p>
                      <p className="text-xs text-gray-400">{r.count} záznamy</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{fmtKg(r.total_netto)}</p>
                      <p className="text-xs text-gray-400">brutto {fmtKg(r.total_brutto)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <table className="w-full text-sm hidden sm:table">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left font-semibold text-gray-500">Typ</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500">Záznamy</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500">Čistá váha</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500">Brutto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mat.rows.map(r => (
                    <tr key={r.type_name} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{r.type_name}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{r.count}×</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">{fmtKg(r.total_netto)}</td>
                      <td className="px-5 py-3 text-right text-gray-400">{fmtKg(r.total_brutto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
