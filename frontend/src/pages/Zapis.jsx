import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api.js';

const TOTAL_STEPS = 7;

// ─── Small helpers ────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex justify-center gap-1.5 pb-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-all ${
            i + 1 < current  ? 'bg-blue-400'
            : i + 1 === current ? 'w-5 bg-blue-600'
            : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function CardGrid({ items, selected, onSelect, getLabel, getKey }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(item => (
        <button
          key={getKey(item)}
          className={`sel-card text-sm ${selected === getKey(item) ? 'selected' : ''}`}
          onClick={() => onSelect(item)}
        >
          {getLabel(item)}
        </button>
      ))}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ZapisModal({ onClose }) {
  const [step, setStep]           = useState(1);
  const [materials, setMaterials] = useState([]);
  const [types, setTypes]         = useState([]);
  const [boxes, setBoxes]         = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  // Selections
  const [material,      setMaterial]      = useState(null);
  const [type,          setType]          = useState(null);
  const [box,           setBox]           = useState(null);
  const [bruttoWeight,  setBruttoWeight]  = useState('');
  const [nettoWeight,   setNettoWeight]   = useState('');
  const [locationType,  setLocationType]  = useState(null); // 'KONTEJNER' | 'BEDNA'
  const [locationName,  setLocationName]  = useState('');
  const [bednaNumber,   setBednaNumber]   = useState('');

  // Load materials on mount
  useEffect(() => {
    api.materials.list().then(setMaterials).catch(() => setError('Nelze načíst materiály'));
  }, []);

  // Load types when material selected
  useEffect(() => {
    if (material) {
      api.types.list(material.id).then(setTypes).catch(() => {});
    }
  }, [material]);

  // Load boxes when material selected
  useEffect(() => {
    if (material) {
      api.boxes.list(material.id).then(setBoxes).catch(() => {});
    }
  }, [material]);

  // Load containers on step 6 (KONTEJNER path)
  useEffect(() => {
    if (step === 6 && locationType === 'KONTEJNER') {
      api.containers.list().then(setContainers).catch(() => {});
    }
  }, [step, locationType]);

  const goBack = () => setStep(s => Math.max(1, s - 1));

  // Step 1 – Material
  const handleMaterial = (m) => { setMaterial(m); setType(null); setBox(null); setStep(2); };

  // Step 2 – Type
  const handleType = (t) => { setType(t); setStep(3); };

  // Step 3 – Box
  const handleBox = (b) => { setBox(b); setStep(4); };

  // Step 4 – Weights
  const handleWeights = () => {
    const b = parseFloat(bruttoWeight.replace(',', '.'));
    const n = parseFloat(nettoWeight.replace(',', '.'));
    if (isNaN(b) || isNaN(n)) { setError('Zadejte platné váhy'); return; }
    if (b < 0 || n < 0)       { setError('Váha musí být kladná'); return; }
    setError('');
    setStep(5);
  };

  // Step 5 – Location type
  const handleLocationType = (lt) => { setLocationType(lt); setStep(6); };

  // Step 6 – Location name
  const handleContainer = (c) => { setLocationName(c.name); setStep(7); };
  const handleBednaNumber = () => {
    if (!bednaNumber.trim()) { setError('Zadejte číslo bedny'); return; }
    setLocationName(`Bedna_${bednaNumber.trim()}`);
    setError('');
    setStep(7);
  };

  // Step 7 – Save
  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await api.records.create({
        material_id:  material.id,
        type_id:      type.id,
        box_id:       box.id,
        brutto_weight: parseFloat(bruttoWeight.replace(',', '.')),
        netto_weight:  parseFloat(nettoWeight.replace(',', '.')),
        location_type: locationType,
        location_name: locationName,
      });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Format weight for display
  const fmtW = (v) => {
    if (v === '' || v == null) return '—';
    return `${String(v).replace('.', ',')} kg`;
  };

  // ─── Render steps ───────────────────────────────────────────────────────────
  const renderStep = () => {
    if (saved) {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-xl font-bold text-green-700">Záznam uložen!</h3>
          <p className="text-sm text-gray-500">
            {material?.abbreviation} · {type?.name} · {box?.name} ·{' '}
            {fmtW(nettoWeight)} · {locationType} – {locationName}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              className="btn-primary"
              onClick={() => {
                setStep(1); setMaterial(null); setType(null); setBox(null);
                setBruttoWeight(''); setNettoWeight(''); setLocationType(null);
                setLocationName(''); setBednaNumber(''); setSaved(false);
              }}
            >
              Nový zápis
            </button>
            <button className="btn-ghost" onClick={onClose}>Zavřít</button>
          </div>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Vyberte materiál</h3>
            {materials.length === 0
              ? <p className="text-sm text-gray-400">Načítám…</p>
              : <CardGrid
                  items={materials}
                  selected={material?.id}
                  onSelect={handleMaterial}
                  getKey={m => m.id}
                  getLabel={m => (
                    <span>
                      <span className="block text-lg font-extrabold">{m.abbreviation}</span>
                      <span className="block text-xs text-gray-400 font-normal">{m.name}</span>
                    </span>
                  )}
                />
            }
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              Vyberte typ
              <span className="ml-2 text-sm font-normal text-blue-600">[{material?.abbreviation}]</span>
            </h3>
            {types.length === 0
              ? <p className="text-sm text-gray-400">Načítám…</p>
              : <CardGrid
                  items={types}
                  selected={type?.id}
                  onSelect={handleType}
                  getKey={t => t.id}
                  getLabel={t => t.name}
                />
            }
            <button className="btn-ghost text-xs" onClick={goBack}>← Zpět</button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              Vyberte bednu
              <span className="ml-2 text-sm font-normal text-blue-600">[{material?.abbreviation} · {type?.name}]</span>
            </h3>
            {boxes.length === 0
              ? <p className="text-sm text-gray-400">Načítám…</p>
              : <CardGrid
                  items={boxes}
                  selected={box?.id}
                  onSelect={handleBox}
                  getKey={b => b.id}
                  getLabel={b => b.name}
                />
            }
            <button className="btn-ghost text-xs" onClick={goBack}>← Zpět</button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-gray-800">Zadejte váhy</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Hrubá váha <span className="text-gray-400 font-normal">(brutto)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-input pr-12"
                    placeholder="124,5"
                    value={bruttoWeight}
                    onChange={e => setBruttoWeight(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && document.getElementById('netto-input').focus()}
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">kg</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Čistá váha <span className="text-gray-400 font-normal">(netto)</span>
                </label>
                <div className="relative">
                  <input
                    id="netto-input"
                    type="text"
                    inputMode="decimal"
                    className="form-input pr-12"
                    placeholder="110,5"
                    value={nettoWeight}
                    onChange={e => setNettoWeight(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleWeights()}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">kg</span>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleWeights}>Pokračovat →</button>
              <button className="btn-ghost" onClick={goBack}>← Zpět</button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Kam jste to dali?</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                className="sel-card py-8 text-base"
                onClick={() => handleLocationType('KONTEJNER')}
              >
                <span className="block text-3xl mb-2">🏗</span>
                KONTEJNER
              </button>
              <button
                className="sel-card py-8 text-base"
                onClick={() => handleLocationType('BEDNA')}
              >
                <span className="block text-3xl mb-2">📦</span>
                BEDNA
              </button>
            </div>
            <button className="btn-ghost text-xs" onClick={goBack}>← Zpět</button>
          </div>
        );

      case 6:
        if (locationType === 'KONTEJNER') {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Vyberte kontejner</h3>
              {containers.length === 0
                ? <p className="text-sm text-gray-400">Načítám…</p>
                : <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {containers.map(c => (
                      <button
                        key={c.id}
                        className={`sel-card text-left text-sm ${locationName === c.name ? 'selected' : ''}`}
                        onClick={() => handleContainer(c)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
              }
              <button className="btn-ghost text-xs" onClick={goBack}>← Zpět</button>
            </div>
          );
        } else {
          return (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-800">Číslo bedny</h3>
              <div className="relative">
                <input
                  type="text"
                  className="form-input text-lg"
                  placeholder="např. 42"
                  value={bednaNumber}
                  onChange={e => setBednaNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBednaNumber()}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button className="btn-primary" onClick={handleBednaNumber}>Pokračovat →</button>
                <button className="btn-ghost" onClick={goBack}>← Zpět</button>
              </div>
            </div>
          );
        }

      case 7:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-gray-800">Přehled záznamu</h3>
            <div className="rounded-xl bg-gray-50 border border-gray-200 divide-y divide-gray-200">
              {[
                ['Materiál',  `${material?.abbreviation} – ${material?.name}`],
                ['Typ',       type?.name],
                ['Bedna',     box?.name],
                ['Brutto',    fmtW(bruttoWeight)],
                ['Čistá',     fmtW(nettoWeight)],
                ['Umístění',  locationType],
                ['Název',     locationName],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Ukládám…' : '✓ Uložit záznam'}
              </button>
              <button className="btn-ghost" onClick={goBack}>← Zpět</button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-card w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Nový zápis</h2>
            {!saved && (
              <p className="text-xs text-gray-400">Krok {step} z {TOTAL_STEPS}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Progress dots */}
        {!saved && (
          <div className="px-6 pt-3">
            <StepDots current={step} total={TOTAL_STEPS} />
          </div>
        )}

        {/* Step content */}
        <div className="px-6 py-5">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
