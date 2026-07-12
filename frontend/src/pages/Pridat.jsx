import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api.js';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg
      ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
      {type === 'error' ? '✕ ' : '✓ '}{msg}
    </div>
  );
}

// ─── Section form card ────────────────────────────────────────────────────────
function FormSection({ title, icon, children }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Delete button ────────────────────────────────────────────────────────────
function DelBtn({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-30"
      title="Smazat"
    >✕</button>
  );
}

// ─── Materials + Types list ───────────────────────────────────────────────────
function MaterialsList({ materials, types, onDeleteMat, onDeleteType, onTareChange, onDeleteBox, boxes }) {
  return (
    <div className="space-y-4">
      {materials.map(mat => {
        const matTypes = types.filter(t => t.material_id === mat.id);
        const matBoxes = boxes.filter(b => b.material_id === mat.id);
        return (
          <div key={mat.id} className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Material header */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5">
                  {mat.abbreviation}
                </span>
                <span className="font-semibold text-gray-800 text-sm">{mat.name}</span>
              </div>
              <DelBtn onClick={() => onDeleteMat(mat)} />
            </div>

            {/* Types */}
            {matTypes.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Typy</p>
                <div className="flex flex-wrap gap-2">
                  {matTypes.map(t => (
                    <div key={t.id} className="flex items-center gap-1 rounded-full bg-white border border-gray-200 pl-3 pr-1.5 py-0.5">
                      <span className="text-xs font-medium text-gray-700">{t.name}</span>
                      <DelBtn onClick={() => onDeleteType(t)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boxes */}
            {matBoxes.length > 0 && (
              <div className="px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Bedny</p>
                <div className="space-y-1">
                  {matBoxes.map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-700 w-12">{b.name}</span>
                      <span className="text-gray-400">tára:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-center focus:outline-none focus:border-blue-400"
                        defaultValue={b.tare_weight || 0}
                        onBlur={e => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== b.tare_weight) onTareChange(b, v);
                        }}
                      />
                      <span className="text-gray-400">kg</span>
                      <DelBtn onClick={() => onDeleteBox(b)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Containers list ──────────────────────────────────────────────────────────
function ContainersList({ containers, onDelete }) {
  return (
    <div className="flex flex-wrap gap-2">
      {containers.map(c => (
        <div key={c.id} className="flex items-center gap-1 rounded-full bg-white border border-gray-200 pl-3 pr-1.5 py-1">
          <span className="text-xs font-medium text-gray-700">🏗 {c.name}</span>
          <DelBtn onClick={() => onDelete(c)} />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Pridat() {
  const [materials,  setMaterials]  = useState([]);
  const [types,      setTypes]      = useState([]);
  const [boxes,      setBoxes]      = useState([]);
  const [containers, setContainers] = useState([]);
  const [toast,      setToast]      = useState({ msg: '', type: '' });

  // Form state
  const [matName, setMatName] = useState('');
  const [matAbbr, setMatAbbr] = useState('');
  const [typName, setTypName] = useState('');
  const [typMat,  setTypMat]  = useState('');
  const [boxName, setBoxName] = useState('');
  const [boxMat,  setBoxMat]  = useState('');
  const [boxTare, setBoxTare] = useState('');
  const [conName, setConName] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  const load = useCallback(() => {
    Promise.all([
      api.materials.list(),
      api.types.list(),
      api.boxes.list(),
      api.containers.list(),
    ]).then(([m, t, b, c]) => {
      setMaterials(m);
      setTypes(t);
      setBoxes(b);
      setContainers(c);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMaterial = async (e) => {
    e.preventDefault();
    try {
      await api.materials.create({ name: matName.trim(), abbreviation: matAbbr.trim() });
      showToast(`Materiál ${matAbbr.toUpperCase()} přidán`);
      setMatName(''); setMatAbbr('');
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleType = async (e) => {
    e.preventDefault();
    try {
      await api.types.create({ name: typName.trim(), material_id: parseInt(typMat) });
      showToast(`Typ "${typName}" přidán`);
      setTypName(''); setTypMat('');
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleBox = async (e) => {
    e.preventDefault();
    try {
      await api.boxes.create({ name: boxName.trim(), material_id: parseInt(boxMat), tare_weight: parseFloat(boxTare) || 0 });
      showToast(`Bedna "${boxName}" přidána`);
      setBoxName(''); setBoxMat(''); setBoxTare('');
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleContainer = async (e) => {
    e.preventDefault();
    try {
      await api.containers.create({ name: conName.trim() });
      showToast(`Kontejner "${conName}" přidán`);
      setConName('');
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteMat = async (mat) => {
    if (!confirm(`Smazat materiál ${mat.abbreviation}?`)) return;
    try {
      await api.materials.remove(mat.id);
      showToast(`Materiál ${mat.abbreviation} smazán`);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteType = async (typ) => {
    if (!confirm(`Smazat typ "${typ.name}"?`)) return;
    try {
      await api.types.remove(typ.id);
      showToast(`Typ "${typ.name}" smazán`);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteBox = async (box) => {
    if (!confirm(`Smazat bednu "${box.name}"?`)) return;
    try {
      await api.boxes.remove(box.id);
      showToast(`Bedna "${box.name}" smazána`);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteContainer = async (con) => {
    if (!confirm(`Smazat kontejner "${con.name}"?`)) return;
    try {
      await api.containers.remove(con.id);
      showToast(`Kontejner "${con.name}" smazán`);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleTareChange = async (box, tare) => {
    try {
      await api.boxes.setTare(box.id, tare);
      showToast(`Tára "${box.name}" nastavena na ${tare} kg`);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const matSelect = (value, onChange) => (
    <select className="form-input" value={value} onChange={e => onChange(e.target.value)} required>
      <option value="">— materiál —</option>
      {materials.map(m => (
        <option key={m.id} value={m.id}>{m.abbreviation} – {m.name}</option>
      ))}
    </select>
  );

  return (
    <div className="flex gap-6 h-full">
      {/* ── LEFT: Forms ── */}
      <div className="w-72 shrink-0 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800">Přidat</h1>
          <p className="text-xs text-gray-400">Správa číselníků</p>
        </div>

        <FormSection title="Nový materiál" icon="🔩">
          <form onSubmit={handleMaterial} className="space-y-2">
            <input className="form-input" placeholder="Název (Hliník)" value={matName} onChange={e => setMatName(e.target.value)} required />
            <input className="form-input" placeholder="Zkratka (AL)" value={matAbbr} onChange={e => setMatAbbr(e.target.value)} required />
            <button className="btn-primary w-full text-sm" type="submit">+ Přidat materiál</button>
          </form>
        </FormSection>

        <FormSection title="Nový typ" icon="🏷">
          <form onSubmit={handleType} className="space-y-2">
            {matSelect(typMat, setTypMat)}
            <input className="form-input" placeholder="Typ (Čistá)" value={typName} onChange={e => setTypName(e.target.value)} required />
            <button className="btn-primary w-full text-sm" type="submit">+ Přidat typ</button>
          </form>
        </FormSection>

        <FormSection title="Nová bedna" icon="📦">
          <form onSubmit={handleBox} className="space-y-2">
            {matSelect(boxMat, setBoxMat)}
            <input className="form-input" placeholder="Název (AL6)" value={boxName} onChange={e => setBoxName(e.target.value)} required />
            <div className="relative">
              <input
                className="form-input pr-8"
                type="number" step="0.1" min="0"
                placeholder="Váha bedny – tára (kg)"
                value={boxTare}
                onChange={e => setBoxTare(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
            </div>
            <button className="btn-primary w-full text-sm" type="submit">+ Přidat bednu</button>
          </form>
        </FormSection>

        <FormSection title="Nový kontejner" icon="🏗">
          <form onSubmit={handleContainer} className="space-y-2">
            <input className="form-input" placeholder="Název (Hliník Čistá)" value={conName} onChange={e => setConName(e.target.value)} required />
            <button className="btn-primary w-full text-sm" type="submit">+ Přidat kontejner</button>
          </form>
        </FormSection>
      </div>

      {/* ── RIGHT: Lists ── */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-6">
        {/* Materials + Types + Boxes */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 bg-gray-50 px-5 py-3 border-b border-gray-100">
            <span className="text-base">🔩</span>
            <h3 className="font-bold text-gray-800">Materiály, Typy &amp; Bedny</h3>
            <span className="ml-auto text-xs text-gray-400">{materials.length} materiálů · {boxes.length} beden</span>
          </div>
          <div className="p-4">
            {materials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Žádné materiály</p>
            ) : (
              <MaterialsList
                materials={materials}
                types={types}
                boxes={boxes}
                onDeleteMat={handleDeleteMat}
                onDeleteType={handleDeleteType}
                onDeleteBox={handleDeleteBox}
                onTareChange={handleTareChange}
              />
            )}
          </div>
        </div>

        {/* Containers */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 bg-gray-50 px-5 py-3 border-b border-gray-100">
            <span className="text-base">🏗</span>
            <h3 className="font-bold text-gray-800">Kontejnery</h3>
            <span className="ml-auto text-xs text-gray-400">{containers.length} kontejnerů</span>
          </div>
          <div className="p-4">
            {containers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Žádné kontejnery</p>
            ) : (
              <ContainersList containers={containers} onDelete={handleDeleteContainer} />
            )}
          </div>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
