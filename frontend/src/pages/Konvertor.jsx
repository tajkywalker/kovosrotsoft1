import { useState, useEffect, useRef } from 'react';
import { api } from '../api/api.js';

const MAT_COLOR = {
  AL:    'bg-blue-100 text-blue-700',
  Cu:    'bg-orange-100 text-orange-700',
  Fe:    'bg-gray-200 text-gray-700',
  Pb:    'bg-purple-100 text-purple-700',
  Zn:    'bg-green-100 text-green-700',
  Nerez: 'bg-cyan-100 text-cyan-700',
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg
      ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
      {msg}
    </div>
  );
}

// ─── Single import accordion row ─────────────────────────────────────────────
function ImportCard({ imp, materials, types, onDelete, onRemap, onReparse, compareId, onCompare }) {
  const [open,     setOpen]    = useState(false);
  const [rows,     setRows]    = useState([]);
  const [loading,  setLoading] = useState(false);
  const [rawText,  setRawText] = useState(null);
  const [showRaw,  setShowRaw] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    const data = await api.konvertor.rows(imp.id).catch(() => []);
    setRows(data);
    setLoading(false);
  };

  const toggle = async () => {
    if (!open && rows.length === 0) await loadRows();
    setOpen(v => !v);
  };

  const handleReparse = async () => {
    setLoading(true);
    try {
      const res = await onReparse(imp.id);
      await loadRows();
      setOpen(true);
    } finally { setLoading(false); }
  };

  const toggleRaw = async () => {
    if (!rawText) {
      const data = await api.konvertor.rawtext(imp.id).catch(() => ({ raw_text: '(chyba načtení)' }));
      setRawText(data.raw_text);
    }
    setShowRaw(v => !v);
  };

  const totalNetto  = imp.total_netto  ?? 0;
  const totalBrutto = imp.total_brutto ?? 0;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <span className={`transition-transform duration-200 text-gray-500 ${open ? 'rotate-90' : ''}`}>▶</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm truncate">{imp.label}</p>
          <p className="text-xs text-gray-400">{imp.filename} · {imp.row_count} řádků</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-800">{String(totalNetto).replace('.', ',')} kg čistá</p>
          <p className="text-xs text-gray-400">{String(totalBrutto).replace('.', ',')} kg brutto</p>
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 bg-white flex-wrap">
        <button
          onClick={() => onCompare(compareId === imp.id ? null : imp.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            compareId === imp.id ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {compareId === imp.id ? '✓ Porovnáváno' : '⇄ Porovnat'}
        </button>
        <button
          onClick={handleReparse}
          disabled={loading}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
          title="Přeparsovat s nejnovějším algoritmem"
        >
          {loading ? '…' : '⟳ Přeparsovat'}
        </button>
        <button
          onClick={() => { onRemap(imp.id); }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          ↻ Přemapovat
        </button>
        <button
          onClick={toggleRaw}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          title="Zobrazit/skrýt raw text z PDF"
        >
          {showRaw ? '✕ Raw' : '👁 Raw text'}
        </button>
        <button
          onClick={() => onDelete(imp.id)}
          className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
        >
          Smazat
        </button>
      </div>

      {/* Raw text debug view */}
      {showRaw && rawText && (
        <div className="border-t border-gray-100 bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-400 mb-2">Raw text z PDF (prvních 6000 znaků) – pozor: háčkované znaky mohou chybět:</p>
          <pre className="text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto leading-5">
            {rawText}
          </pre>
        </div>
      )}

      {/* Rows */}
      {open && (
        <div className="border-t border-gray-100">
          {loading ? (
            <div className="py-6 text-center text-sm text-gray-400">Načítám…</div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">Žádné řádky</div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="divide-y divide-gray-100 sm:hidden">
                {rows.map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-xs text-gray-400">{r.date}</span>
                        {r.material_abbr && (
                          <span className={`badge text-[10px] ${MAT_COLOR[r.material_abbr] || 'bg-gray-100 text-gray-600'}`}>
                            {r.material_abbr}
                          </span>
                        )}
                        {r.type_name && <span className="text-xs font-medium text-gray-700">{r.type_name}</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {[r.raw_material, r.raw_type, r.raw_box].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">{r.netto != null ? String(r.netto).replace('.', ',') + ' kg' : '—'}</p>
                      <p className="text-xs text-gray-400">{r.brutto != null ? String(r.brutto).replace('.', ',') : '—'} brutto</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <table className="w-full text-xs hidden sm:table">
                <thead className="bg-gray-50">
                  <tr>
                    {['Datum','PDF materiál','PDF typ','PDF bedna','Mapped','Brutto','Čistá','Umístění'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50 ${!r.mapped_material_id ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.raw_material}</td>
                      <td className="px-3 py-2 text-gray-600">{r.raw_type}</td>
                      <td className="px-3 py-2 text-gray-500">{r.raw_box}</td>
                      <td className="px-3 py-2">
                        {r.material_abbr ? (
                          <span className="flex items-center gap-1">
                            <span className={`badge text-[10px] ${MAT_COLOR[r.material_abbr] || 'bg-gray-100'}`}>{r.material_abbr}</span>
                            <span className="text-gray-600">{r.type_name}</span>
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{r.brutto != null ? String(r.brutto).replace('.', ',') : '—'}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800">{r.netto != null ? String(r.netto).replace('.', ',') : '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{r.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Comparison panel ─────────────────────────────────────────────────────────
function ComparePanel({ importId, materials }) {
  const [pdfRows, setPdfRows] = useState([]);
  const [ourRows, setOurRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imp,     setImp]     = useState(null);

  useEffect(() => {
    if (!importId) return;
    setLoading(true);
    Promise.all([
      api.konvertor.rows(importId),
      api.konvertor.imports(),
      api.records.list(),
    ]).then(([pRows, imps, records]) => {
      setPdfRows(pRows);
      const thisImp = imps.find(i => i.id === importId);
      setImp(thisImp);
      // Filter our records by same date range
      if (thisImp?.date_from && thisImp?.date_to) {
        const from = thisImp.date_from;
        const to   = thisImp.date_to;
        const filtered = records.filter(r => {
          const [dd,mm,yyyy] = r.date.split('.');
          const iso = `${yyyy}-${mm}-${dd}`;
          const [ddf,mmf,yyyyf] = from.split('.');
          const [ddt,mmt,yyyyt] = to.split('.');
          return iso >= `${yyyyf}-${mmf}-${ddf}` && iso <= `${yyyyt}-${mmt}-${ddt}`;
        });
        setOurRows(filtered);
      } else {
        setOurRows([]);
      }
    }).finally(() => setLoading(false));
  }, [importId]);

  if (!importId) return null;

  // Summary by type from PDF (mapped)
  const pdfSummary = {};
  for (const r of pdfRows) {
    if (!r.type_name) continue;
    const k = `${r.material_abbr}|${r.type_name}`;
    if (!pdfSummary[k]) pdfSummary[k] = { mat: r.material_abbr, typ: r.type_name, netto: 0, count: 0 };
    pdfSummary[k].netto += r.netto ?? 0;
    pdfSummary[k].count++;
  }

  // Summary by type from our records
  const ourSummary = {};
  for (const r of ourRows || []) {
    const k = `${r.material_abbr}|${r.type_name}`;
    if (!ourSummary[k]) ourSummary[k] = { mat: r.material_abbr, typ: r.type_name, netto: 0, count: 0 };
    ourSummary[k].netto += r.netto_weight ?? 0;
    ourSummary[k].count++;
  }

  const allKeys = [...new Set([...Object.keys(pdfSummary), ...Object.keys(ourSummary)])].sort();

  return (
    <div className="card overflow-hidden mt-4">
      <div className="card-header">
        <span className="text-base">⇄</span>
        <h3 className="font-bold text-gray-800">
          Porovnání: <span className="text-blue-600">{imp?.label}</span>
        </h3>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-400">Načítám…</div>
      ) : (
        <>
          {/* Mobile: stacked */}
          <div className="sm:hidden divide-y divide-gray-100">
            {allKeys.map(k => {
              const p = pdfSummary[k]; const o = ourSummary[k];
              const diff = Math.round(((p?.netto ?? 0) - (o?.netto ?? 0)) * 10) / 10;
              return (
                <div key={k} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    {(p||o)?.mat && <span className={`badge text-[10px] ${MAT_COLOR[(p||o).mat]||'bg-gray-100'}`}>{(p||o).mat}</span>}
                    <span className="font-semibold text-sm">{(p||o).typ}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="rounded bg-blue-50 p-2">
                      <p className="text-gray-400 mb-0.5">PDF</p>
                      <p className="font-bold text-blue-700">{p ? String(Math.round(p.netto*10)/10).replace('.',',') + ' kg' : '—'}</p>
                    </div>
                    <div className="rounded bg-green-50 p-2">
                      <p className="text-gray-400 mb-0.5">Naše</p>
                      <p className="font-bold text-green-700">{o ? String(Math.round(o.netto*10)/10).replace('.',',') + ' kg' : '—'}</p>
                    </div>
                    <div className={`rounded p-2 ${Math.abs(diff) < 0.1 ? 'bg-gray-50' : diff > 0 ? 'bg-orange-50' : 'bg-red-50'}`}>
                      <p className="text-gray-400 mb-0.5">Rozdíl</p>
                      <p className={`font-bold ${Math.abs(diff)<0.1?'text-gray-500':diff>0?'text-orange-600':'text-red-600'}`}>
                        {diff >= 0 ? '+' : ''}{String(diff).replace('.', ',')} kg
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: side-by-side table */}
          <table className="w-full text-sm hidden sm:table">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Typ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-500 bg-blue-50/40">PDF čistá</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-400 bg-blue-50/40">PDF záz.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-green-500 bg-green-50/40">Naše čistá</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-green-400 bg-green-50/40">Naše záz.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-400">Rozdíl</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allKeys.map(k => {
                const p = pdfSummary[k]; const o = ourSummary[k];
                const diff = Math.round(((p?.netto ?? 0) - (o?.netto ?? 0)) * 10) / 10;
                const diffCls = Math.abs(diff) < 0.5 ? 'text-gray-500' : diff > 0 ? 'text-orange-600 font-bold' : 'text-red-600 font-bold';
                return (
                  <tr key={k} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        {(p||o)?.mat && <span className={`badge text-[10px] ${MAT_COLOR[(p||o).mat]||'bg-gray-100'}`}>{(p||o).mat}</span>}
                        {(p||o)?.typ}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50/20">
                      {p ? String(Math.round(p.netto*10)/10).replace('.',',') + ' kg' : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400 bg-blue-50/20">{p?.count ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700 bg-green-50/20">
                      {o ? String(Math.round(o.netto*10)/10).replace('.',',') + ' kg' : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 bg-green-50/20">{o?.count ?? '—'}</td>
                    <td className={`px-4 py-3 text-right ${diffCls}`}>
                      {diff >= 0 ? '+' : ''}{String(diff).replace('.', ',')} kg
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ─── Mappings editor ──────────────────────────────────────────────────────────
function MappingsPanel({ materials, types }) {
  const [mappings,  setMappings]  = useState([]);
  const [pdfName,   setPdfName]   = useState('');
  const [selMat,    setSelMat]    = useState('');
  const [selTyp,    setSelTyp]    = useState('');
  const [filtTypes, setFiltTypes] = useState([]);

  const load = () => api.konvertor.mappings.list().then(setMappings);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selMat) setFiltTypes(types.filter(t => t.material_id === parseInt(selMat)));
    else        setFiltTypes([]);
    setSelTyp('');
  }, [selMat, types]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.konvertor.mappings.save({
        pdf_name: pdfName.trim(),
        material_id: selMat ? parseInt(selMat) : null,
        type_id:     selTyp ? parseInt(selTyp) : null,
      });
      setPdfName(''); setSelMat(''); setSelTyp('');
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-1">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Název z PDF</label>
          <input className="form-input" placeholder="např. Hliník profilový" value={pdfName} onChange={e => setPdfName(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Náš materiál</label>
          <select className="form-input" value={selMat} onChange={e => setSelMat(e.target.value)}>
            <option value="">— materiál —</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.abbreviation} – {m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Náš typ</label>
          <select className="form-input" value={selTyp} onChange={e => setSelTyp(e.target.value)} disabled={!selMat}>
            <option value="">— typ —</option>
            {filtTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button className="btn-primary" type="submit">Uložit mapování</button>
      </form>

      {/* List */}
      {mappings.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {/* header */}
            {['Název z PDF', 'Mapuje na', ''].map(h => (
              <div key={h} className="px-4 py-2 bg-gray-50 text-xs font-semibold uppercase text-gray-400 hidden sm:block">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-gray-100">
            {mappings.map(m => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
                <span className="font-medium text-gray-800 text-sm">{m.pdf_name}</span>
                <span className="flex items-center gap-1.5">
                  {m.material_abbr && <span className={`badge text-xs ${MAT_COLOR[m.material_abbr]||'bg-gray-100'}`}>{m.material_abbr}</span>}
                  {m.type_name && <span className="text-sm text-gray-600">{m.type_name}</span>}
                  {!m.material_abbr && <span className="text-gray-400 text-sm">— bez mapování —</span>}
                </span>
                <button
                  onClick={() => api.konvertor.mappings.remove(m.id).then(load)}
                  className="text-xs text-red-400 hover:text-red-600 transition ml-auto"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Konvertor() {
  const [imports,    setImports]    = useState([]);
  const [materials,  setMaterials]  = useState([]);
  const [types,      setTypes]      = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [compareId,  setCompareId]  = useState(null);
  const [showMap,    setShowMap]    = useState(false);
  const [toast,      setToast]      = useState({ msg: '', type: '' });
  const fileRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  const loadImports = () => api.konvertor.imports().then(setImports).catch(() => {});

  useEffect(() => {
    loadImports();
    api.materials.list().then(setMaterials);
    api.types.list().then(setTypes);
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const res = await api.konvertor.upload(file);
      showToast(`✓ Importováno: ${res.label} (${res.rows} řádků)`);
      loadImports();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Smazat tento import?')) return;
    await api.konvertor.remove(id).catch(() => {});
    if (compareId === id) setCompareId(null);
    loadImports();
    showToast('Import smazán');
  };

  const handleRemap = async (id) => {
    await api.konvertor.remap(id).catch(() => {});
    showToast('Přemapováno');
    loadImports();
  };

  return (
    <div className="space-y-5">
      {/* Header + upload */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">PDF Konvertor</h1>
          <p className="text-sm text-gray-400">Nahrajte PDF, přeložte názvy, porovnejte se záznamy</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowMap(v => !v)}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold border transition ${
              showMap ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {showMap ? '✕ Zavřít mapování' : '⚙ Mapování názvů'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-2"
          >
            {uploading ? (
              <><span className="animate-spin">↻</span> Nahrávám…</>
            ) : (
              <><span>📤</span> Nahrát PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Mappings panel */}
      {showMap && (
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-gray-800">Mapování názvů z PDF → naše kategorie</h3>
          <p className="text-xs text-gray-400">
            Přiřaďte název z PDF k vašemu materiálu a typu. Uložené mapování se použije automaticky při každém dalším importu.
          </p>
          <MappingsPanel materials={materials} types={types} />
        </div>
      )}

      {/* Compare selector */}
      {imports.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500 font-medium">Porovnat s importem:</span>
          <select
            className="form-input w-auto text-sm"
            value={compareId ?? ''}
            onChange={e => setCompareId(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">— vyberte —</option>
            {imports.map(i => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
          {compareId && (
            <button onClick={() => setCompareId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ zrušit</button>
          )}
        </div>
      )}

      {/* Comparison panel */}
      {compareId && <ComparePanel importId={compareId} materials={materials} />}

      {/* Import list */}
      {imports.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="font-semibold text-gray-600">Žádné importy</p>
          <p className="text-sm text-gray-400 mt-1">Nahrajte PDF soubor tlačítkem výše</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            Importované soubory ({imports.length})
          </h2>
          {imports.map(imp => (
            <ImportCard
              key={imp.id}
              imp={imp}
              materials={materials}
              types={types}
              compareId={compareId}
              onCompare={setCompareId}
              onDelete={handleDelete}
              onRemap={handleRemap}
            />
          ))}
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
