import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

const MAT_COLORS = {
  AL:    { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  Cu:    { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  Fe:    { bg: 'bg-gray-200',   text: 'text-gray-700',   dot: 'bg-gray-500'   },
  Pb:    { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  Zn:    { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  Nerez: { bg: 'bg-cyan-100',   text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
};

function getColor(abbr) {
  return MAT_COLORS[abbr] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
}

function kgToT(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(3).replace('.', ',')} t`;
  return `${String(kg).replace('.', ',')} kg`;
}

export default function Prehled() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.records.summary()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  // Group by material
  const byMat = data.reduce((acc, row) => {
    const key = row.material_abbr;
    if (!acc[key]) acc[key] = { name: row.material_name, rows: [], totalNetto: 0, count: 0 };
    acc[key].rows.push(row);
    acc[key].totalNetto += row.total_netto;
    acc[key].count += row.count;
    return acc;
  }, {});

  const totalAll = data.reduce((s, r) => s + r.total_netto, 0);
  const countAll = data.reduce((s, r) => s + r.count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Načítám…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Přehled</h1>
        <p className="text-sm text-gray-400">Souhrn všech záznamů od začátku evidence</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Celkem záznamy</p>
          <p className="mt-1 text-3xl font-extrabold text-gray-800">{countAll}</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Celkem čistá</p>
          <p className="mt-1 text-3xl font-extrabold text-blue-700">{kgToT(Math.round(totalAll * 10) / 10)}</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Druhů materiálu</p>
          <p className="mt-1 text-3xl font-extrabold text-gray-800">{Object.keys(byMat).length}</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Druhů typů</p>
          <p className="mt-1 text-3xl font-extrabold text-gray-800">{data.length}</p>
        </div>
      </div>

      {/* Per-material breakdown */}
      {Object.entries(byMat).length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
          Žádné záznamy. Začněte přidáním prvního záznamu tlačítkem NOVÝ ZÁPIS.
        </div>
      ) : (
        Object.entries(byMat).map(([abbr, mat]) => {
          const col = getColor(abbr);
          return (
            <div key={abbr} className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className={`flex items-center gap-3 px-5 py-4 ${col.bg}`}>
                <span className={`h-3 w-3 rounded-full ${col.dot}`} />
                <h3 className={`font-extrabold text-lg ${col.text}`}>{abbr}</h3>
                <span className={`text-sm font-medium ${col.text} opacity-70`}>{mat.name}</span>
                <span className="ml-auto text-xs text-gray-500">{mat.count} záz. · {kgToT(Math.round(mat.totalNetto * 10) / 10)}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left font-semibold text-gray-500">Typ</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500">Záznamy</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500">Čistá váha</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500 hidden sm:table-cell">Brutto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mat.rows.map(row => (
                    <tr key={row.type_name} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{row.type_name}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{row.count}×</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">{kgToT(row.total_netto)}</td>
                      <td className="px-5 py-3 text-right text-gray-400 hidden sm:table-cell">{kgToT(row.total_brutto)}</td>
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
