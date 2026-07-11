import { useState, useEffect } from 'react';
import { api } from '../api/api.js';

function Section({ title, icon, children }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition ${
      type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`}>
      {type === 'error' ? '✕ ' : '✓ '}{msg}
    </div>
  );
}

export default function Pridat() {
  const [materials, setMaterials] = useState([]);
  const [toast, setToast] = useState({ msg: '', type: '' });

  // Form state
  const [matName,  setMatName]  = useState('');
  const [matAbbr,  setMatAbbr]  = useState('');
  const [typName,  setTypName]  = useState('');
  const [typMat,   setTypMat]   = useState('');
  const [boxName,  setBoxName]  = useState('');
  const [boxMat,   setBoxMat]   = useState('');
  const [conName,  setConName]  = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  };

  const loadMaterials = () => api.materials.list().then(setMaterials);
  useEffect(() => { loadMaterials(); }, []);

  const handleMaterial = async (e) => {
    e.preventDefault();
    try {
      await api.materials.create({ name: matName.trim(), abbreviation: matAbbr.trim() });
      showToast(`Materiál ${matAbbr.toUpperCase()} přidán`);
      setMatName(''); setMatAbbr('');
      loadMaterials();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleType = async (e) => {
    e.preventDefault();
    try {
      await api.types.create({ name: typName.trim(), material_id: parseInt(typMat) });
      showToast(`Typ "${typName}" přidán`);
      setTypName(''); setTypMat('');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleBox = async (e) => {
    e.preventDefault();
    try {
      await api.boxes.create({ name: boxName.trim(), material_id: parseInt(boxMat) });
      showToast(`Bedna "${boxName}" přidána`);
      setBoxName(''); setBoxMat('');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleContainer = async (e) => {
    e.preventDefault();
    try {
      await api.containers.create({ name: conName.trim() });
      showToast(`Kontejner "${conName}" přidán`);
      setConName('');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const matSelect = (value, onChange, name) => (
    <select
      className="form-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      required
      name={name}
    >
      <option value="">— vyberte materiál —</option>
      {materials.map(m => (
        <option key={m.id} value={m.id}>{m.abbreviation} – {m.name}</option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold text-gray-800">Přidat</h1>
        <p className="text-sm text-gray-400">Správa číselníků – materiály, typy, bedny, kontejnery</p>
      </div>

      {/* Nový materiál */}
      <Section title="Nový materiál" icon="🔩">
        <form onSubmit={handleMaterial} className="flex gap-3 flex-wrap">
          <input
            className="form-input flex-1 min-w-32"
            placeholder="Název  (např. Hliník)"
            value={matName}
            onChange={e => setMatName(e.target.value)}
            required
          />
          <input
            className="form-input w-28"
            placeholder="Zkratka (AL)"
            value={matAbbr}
            onChange={e => setMatAbbr(e.target.value)}
            required
          />
          <button className="btn-primary whitespace-nowrap" type="submit">Přidat materiál</button>
        </form>
      </Section>

      {/* Nový typ */}
      <Section title="Nový typ" icon="🏷">
        <form onSubmit={handleType} className="space-y-3">
          {matSelect(typMat, setTypMat, 'typ-mat')}
          <div className="flex gap-3">
            <input
              className="form-input flex-1"
              placeholder="Název typu  (např. Čistá)"
              value={typName}
              onChange={e => setTypName(e.target.value)}
              required
            />
            <button className="btn-primary whitespace-nowrap" type="submit">Přidat typ</button>
          </div>
        </form>
      </Section>

      {/* Nová bedna */}
      <Section title="Nová bedna" icon="📦">
        <form onSubmit={handleBox} className="space-y-3">
          {matSelect(boxMat, setBoxMat, 'box-mat')}
          <div className="flex gap-3">
            <input
              className="form-input flex-1"
              placeholder="Název bedny  (např. AL6)"
              value={boxName}
              onChange={e => setBoxName(e.target.value)}
              required
            />
            <button className="btn-primary whitespace-nowrap" type="submit">Přidat bednu</button>
          </div>
        </form>
      </Section>

      {/* Nový kontejner */}
      <Section title="Nový kontejner" icon="🏗">
        <form onSubmit={handleContainer} className="flex gap-3">
          <input
            className="form-input flex-1"
            placeholder="Název kontejneru  (např. Měď Clasic)"
            value={conName}
            onChange={e => setConName(e.target.value)}
            required
          />
          <button className="btn-primary whitespace-nowrap" type="submit">Přidat kontejner</button>
        </form>
      </Section>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
