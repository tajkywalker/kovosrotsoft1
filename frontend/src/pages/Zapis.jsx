import { useState, useEffect } from 'react';
import { api } from '../api/api.js';

const TOTAL_STEPS = 6; // collapsed: step 4 is weight, step 5 is location, step 6 is confirm

function StepDots({ current, total }) {
  return (
    <div className="flex justify-center gap-1.5 pb-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 < current ? 'bg-blue-400 w-2' : i + 1 === current ? 'bg-blue-600 w-5' : 'bg-gray-200 w-2'
          }`}
        />
      ))}
    </div>
  );
}

function CardGrid({ items, selected, onSelect, getKey, getLabel }) {
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

export default function ZapisModal({ onClose }) {
  const [step, setStep]           = useState(1);
  const [materials, setMaterials] = useState([]);
  const [types,     setTypes]     = useState([]);
  const [boxes,     setBoxes]     = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');

  const [material,     setMaterial]     = useState(null);
  const [type,         setType]         = useState(null);
  const [box,          setBox]          = useState(null);
  const [bruttoWeight, setBruttoWeight] = useState('');
  const [nettoWeight,  setNettoWeight]  = useState('');
  const [locationType, setLocationType] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [bednaNumber,  setBednaNumber]  = useState('');

  useEffect(() => {
    api.materials.list().then(setMaterials).catch(() => setError('Nelze načíst materiály'));
  }, []);

  useEffect(() => {
    if (material) {
      api.types.list(material.id).then(setTypes).catch(() => {});
      api.boxes.list(material.id).then(setBoxes).catch(() => {});
    }
  }, [material]);

  useEffect(() => {
    if (step === 5 && locationType === 'KONTEJNER') {
      api.containers.list().then(setContainers).catch(() => {});
    }
  }, [step, locationType]);

  const goBack = () => { setError(''); setStep(s => Math.max(1, s - 1)); };

  // Tare logic: if box has tare_weight > 0, only ask brutto, auto-calc netto
  const hasTare = box && (box.tare_weight ?? 0) > 0;

  const handleWeights = () => {
    const b = parseFloat(bruttoWeight.replace(',', '.'));
    if (isNaN(b) || b < 0) { setError('Zadejte platnou hrubou váhu'); return; }

    if (hasTare) {
      const calcNetto = Math.round((b - box.tare_weight) * 10) / 10;
      setNettoWeight(String(calcNetto).replace('.', ','));
    } else {
      const n = parseFloat(nettoWeight.replace(',', '.'));
      if (isNaN(n)) { setError('Zadejte platnou čistou váhu'); return; }
    }
    setError('');
    setStep(5);
  };

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      await api.records.create({
        material_id:   material.id,
        type_id:       type.id,
        box_id:        box.id,
        brutto_weight: parseFloat(bruttoWeight.replace(',', '.')),
        netto_weight:  parseFloat(nettoWeight.replace(',', '.')),
        location_type: locationType,
        location_name: locationName,
      });
      setSaved(true);
    } catch (e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  const fmtW = (v) => v === '' || v == null ? '—' : `${String(v).replace('.', ',')} kg`;

  const renderStep = () => {
    if (saved) {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-xl font-bold text-green-700">Záznam uložen!</h3>
          <p className="text-sm text-gray-500">
            {material?.abbreviation} · {type?.name} · {box?.name} · {fmtW(nettoWeight)} · {locationType} – {locationName}
          </p>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" onClick={() => {
              setStep(1); setMaterial(null); setType(null); setBox(null);
              setBruttoWeight(''); setNettoWeight(''); setLocationType(null);
              setLocationName(''); setBednaNumber(''); setSaved(false);
            }}>Nový zápis</button>
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
            {materials.length === 0 ? <p className="text-sm text-gray-400">Načítám…</p> : (
              <CardGrid items={materials} selected={material?.id} onSelect={m => { setMaterial(m); setType(null); setBox(null); setStep(2); }}
                getKey={m => m.id}
                getLabel={m => <span><span className="block text-lg font-extrabold">{m.abbreviation}</span><span className="block text-xs text-gray-400 font-normal">{m.name}</span></span>}
              />
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              Vyberte typ
              <span className="ml-2 text-sm font-normal text-blue-600">[{material?.abbreviation}]</span>
            </h3>
            {types.length === 0 ? <p className="text-sm text-gray-400">Načítám…</p> : (
              <CardGrid items={types} selected={type?.id} onSelect={t => { setType(t); setStep(3); }}
                getKey={t => t.id} getLabel={t => t.name}
              />
            )}
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
            {boxes.length === 0 ? <p className="text-sm text-gray-400">Načítám…</p> : (
              <CardGrid items={boxes} selected={box?.id}
                onSelect={b => { setBox(b); setBruttoWeight(''); setNettoWeight(''); setStep(4); }}
                getKey={b => b.id}
                getLabel={b => (
                  <span>
                    <span className="block font-bold">{b.name}</span>
                    {(b.tare_weight ?? 0) > 0 && <span className="block text-xs text-gray-400 font-normal">tára: {b.tare_weight} kg</span>}
                  </span>
                )}
              />
            )}
            <button className="btn-ghost text-xs" onClick={goBack}>← Zpět</button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-gray-800">Zadejte váhu</h3>

            {hasTare && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                Bedna <strong>{box.name}</strong> má táru <strong>{box.tare_weight} kg</strong> – čistá váha se odečte automaticky.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {hasTare ? 'Hrubá váha (bedna + materiál)' : 'Hrubá váha (brutto)'}
                </label>
                <div className="relative">
                  <input
                    type="text" inputMode="decimal"
                    className="form-input pr-12"
                    placeholder="0,0"
                    value={bruttoWeight}
                    onChange={e => {
                      setBruttoWeight(e.target.value);
                      if (hasTare) {
                        const b = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(b)) setNettoWeight(String(Math.round((b - box.tare_weight) * 10) / 10).replace('.', ','));
                        else setNettoWeight('');
                      }
                    }}
                    onKeyDown={e => e.key === 'Enter' && (hasTare ? handleWeights() : document.getElementById('netto-input')?.focus())}
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">kg</span>
                </div>
              </div>

              {hasTare ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                  <p className="text-sm text-gray-500">Čistá váha (vypočteno)</p>
                  <p className="text-2xl font-extrabold text-gray-800 mt-0.5">
                    {nettoWeight ? `${nettoWeight} kg` : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtW(bruttoWeight)} − {box.tare_weight} kg tára</p>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Čistá váha (netto)</label>
                  <div className="relative">
                    <input
                      id="netto-input"
                      type="text" inputMode="decimal"
                      className="form-input pr-12"
                      placeholder="0,0"
                      value={nettoWeight}
                      onChange={e => setNettoWeight(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleWeights()}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">kg</span>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleWeights}>Pokračovat →</button>
              <button className="btn-ghost" onClick={goBack}>← Zpět</button>
            </div>
          </div>
        );

      case 5:
        if (!locationType) {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Kam jste to dali?</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="sel-card py-8 text-base" onClick={() => setLocationType('KONTEJNER')}>
                  <span className="block text-3xl mb-2">🏗</span>KONTEJNER
                </button>
                <button className="sel-card py-8 text-base" onClick={() => setLocationType('BEDNA')}>
                  <span className="block text-3xl mb-2">📦</span>BEDNA
                </button>
              </div>
              <button className="btn-ghost text-xs" onClick={goBack}>← Zpět</button>
            </div>
          );
        }
        if (locationType === 'KONTEJNER') {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Vyberte kontejner</h3>
              {containers.length === 0 ? <p className="text-sm text-gray-400">Načítám…</p> : (
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                  {containers.map(c => (
                    <button key={c.id}
                      className={`sel-card text-left text-sm ${locationName === c.name ? 'selected' : ''}`}
                      onClick={() => { setLocationName(c.name); setStep(6); }}
                    >{c.name}</button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn-ghost text-xs" onClick={() => setLocationType(null)}>← Zpět</button>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-800">Číslo bedny</h3>
              <input
                type="text" className="form-input text-lg" placeholder="např. 42"
                value={bednaNumber} onChange={e => setBednaNumber(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && bednaNumber.trim()) {
                    setLocationName(`Bedna_${bednaNumber.trim()}`); setError(''); setStep(6);
                  }
                }}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button className="btn-primary" onClick={() => {
                  if (!bednaNumber.trim()) { setError('Zadejte číslo bedny'); return; }
                  setLocationName(`Bedna_${bednaNumber.trim()}`); setError(''); setStep(6);
                }}>Pokračovat →</button>
                <button className="btn-ghost" onClick={() => setLocationType(null)}>← Zpět</button>
              </div>
            </div>
          );
        }

      case 6:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-gray-800">Přehled záznamu</h3>
            <div className="rounded-xl bg-gray-50 border border-gray-200 divide-y divide-gray-200">
              {[
                ['Materiál', `${material?.abbreviation} – ${material?.name}`],
                ['Typ',      type?.name],
                ['Bedna',    box?.name + (hasTare ? ` (tára: ${box.tare_weight} kg)` : '')],
                ['Brutto',   fmtW(bruttoWeight)],
                ['Čistá',    fmtW(nettoWeight)],
                ['Umístění', locationType],
                ['Název',    locationName],
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

      default: return null;
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Nový zápis</h2>
            {!saved && <p className="text-xs text-gray-400">Krok {step} z {TOTAL_STEPS}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">✕</button>
        </div>
        {!saved && <div className="px-6 pt-3"><StepDots current={step} total={TOTAL_STEPS} /></div>}
        <div className="px-6 py-5">{renderStep()}</div>
      </div>
    </div>
  );
}
