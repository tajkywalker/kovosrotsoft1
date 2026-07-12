/**
 * PDF Converter – Thermo King / Trane "Měsíční přehled Váženek"
 *
 * pdf-parse extracts each table row as a single string with NO column separators:
 *   "2472Hliník barevná pásovina 5/1671 kg80 kg151 kg24.06.2026"
 *    ^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^  ^^^^^  ^^^^^^  ^^^^^^^^^^
 *    id    material name (incl. 5/16) netto  box    celkem  date (at end)
 *
 * Special issues:
 *  1. No space between ID and material name ("2472Hliník")
 *  2. Material name ending in fraction "5/16" merges with weight "71" → "5/1671"
 *  3. Háček characters (ě č ř ž ď š ť ň) become Unicode control chars \u0000–\u001f
 *     e.g. "Měď" → "M\u0001\u0002", "červená" → "\u0003ervená"
 *
 * Parser strategy:
 *  1. Require line to start with 3–6 digit ID
 *  2. Detect date at the END of line (handles "24.06.2026" or "23. 6. 2026")
 *  3. Mask fractions N/M → XXX so they're invisible to the weight regex
 *  4. Find all "N kg" patterns in masked string → take last 3 = (netto, box, celkem)
 *  5. Material name = text before the first weight, strip leading ID digits
 *
 * Mapping normalisation:
 *  - Strip control chars (\u0000–\u001f) AND háček chars from both sides
 *  - "Měď trubičky" → normHacek → "m trubiky"
 *  - "M\u0001\u0002 trubi\u0003ky" → normHacek → "m trubiky"  → MATCH ✓
 */
import { Router } from 'express';
import multer    from 'multer';
import pdfParse  from 'pdf-parse/lib/pdf-parse.js';
import db        from '../db/database.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Normalisation ─────────────────────────────────────────────────────────────
/**
 * Strip PDF font-encoding artifacts (control chars) AND Czech háček diacritics,
 * normalise dashes and whitespace → use for both PDF text AND mapping keys.
 */
function normHacek(s) {
  return (s || '')
    .replace(/[\u0000-\u001f]/g, '')     // drop PDF control chars (lost háček chars)
    .replace(/[ěčřžďšťňĚČŘŽĎŠŤŇ]/g, '') // drop proper háček chars too
    .replace(/[–—]/g, '-')               // em/en dash → hyphen
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateFlexible(s) {
  const m = (s || '').match(/(\d{1,2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${m[1].padStart(2,'0')}.${m[2].padStart(2,'0')}.${y}`;
}

// ── Thermo King row parser ────────────────────────────────────────────────────
/**
 * Parse one line from the "Měsíční přehled Váženek" PDF.
 * Returns { date, raw_material, raw_box, brutto, netto, raw_type, location } or null.
 */
function parseTKRow(line) {
  // Must start with a 3–6 digit ID (immediately followed by material name or space)
  if (!/^\d{3,6}/.test(line.trim())) return null;

  // Date at the END of line (handles "24.06.2026" or "23. 6. 2026" with spaces)
  const dm = line.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/);
  if (!dm) return null;

  const date = `${dm[1].padStart(2,'0')}.${dm[2].padStart(2,'0')}.${dm[3]}`;
  const withoutDate = line.slice(0, dm.index).trim();

  // MASK fractions like "5/16" or "3/8" so they don't swallow the weight.
  // Problem: "5/1671 kg" → naive replace gives "XXXXXX kg" (masks weight too)
  // Fix: denominator starts with a standard fraction size (32, 16, 8, 4, 2)
  //   "5/1671" → denom="1671" starts with "16" → mask "5/16", keep "71"  → "XXXX71"
  //   "3/856"  → denom="856"  starts with "8"  → mask "3/8",  keep "56"  → "XXX56"
  const FRAC = ['32','16','8','4','2'];
  const masked = withoutDate.replace(/(\d+)\/(\d+)/g, (full, num, den) => {
    for (const d of FRAC) {
      if (den.startsWith(d)) {
        return 'X'.repeat(`${num}/${d}`.length) + den.slice(d.length);
      }
    }
    return 'X'.repeat(full.length); // unknown fraction → mask whole thing
  });

  // Find all "N kg" or "N.N kg" weight patterns in the masked string
  const wRe   = /(\d+(?:\.\d+)?)\s+kg/gi;
  const wMatches = [...masked.matchAll(wRe)];
  if (wMatches.length < 3) return null;

  // Take the LAST 3 matches: (netto/materiál, box/tára, celkem/brutto)
  const last3 = wMatches.slice(-3);

  // Extract weight values from the ORIGINAL string at the same positions
  const getVal = (match) => {
    const orig = withoutDate.slice(match.index, match.index + match[0].length);
    const n = parseFloat(orig.match(/[\d.]+/)[0]);
    return isNaN(n) ? 0 : n;
  };

  const netto  = getVal(last3[0]); // "Materiál" column = material weight = netto
  const boxKg  = getVal(last3[1]); // "Box" column = tare weight
  const brutto = getVal(last3[2]); // "Celkem" column = total = brutto

  // Material name = text before the first of the last-3 weights
  const nameEndIdx  = last3[0].index;
  const idAndName   = withoutDate.slice(0, nameEndIdx).trim();
  const rawMaterial = idAndName.replace(/^\d+/, '').trim(); // strip leading ID digits

  if (!rawMaterial || rawMaterial.length < 2) return null;

  return {
    date,
    raw_material: rawMaterial,
    raw_type:     null,
    raw_box:      boxKg > 0 ? `${boxKg} kg` : null,
    brutto,
    netto,
    location:     null,
  };
}

// ── Generic strategy A: date on every line ────────────────────────────────────
function parseGenericRow(line) {
  const dm = line.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\b/);
  if (!dm) return null;
  const date = parseDateFlexible(dm[0]);
  const wAll = [...line.matchAll(/\d{1,3}(?:[.,]\d{1,3})?/g)]
    .map(m => ({ v: parseFloat(m[0].replace(',', '.')), i: m.index }))
    .filter(n => n.v > 0.5 && n.v < 999999);
  if (wAll.length < 1) return null;
  const textBefore = line.slice(0, wAll[0].i).replace(dm[0], '').replace(/^\d+\s+/, '').trim();
  if (!textBefore || textBefore.length < 2) return null;
  return {
    date,
    raw_material: textBefore,
    raw_type: null, raw_box: null,
    brutto: wAll.length >= 2 ? wAll[wAll.length - 2].v : wAll[0].v,
    netto:  wAll[wAll.length - 1].v,
    location: null,
  };
}

// ── Generic strategy B: doc-level date + material rows ────────────────────────
function parseNoDateRow(line, docDate) {
  const skipRe = /^(id|materiál|material|druh|popis|typ|název|brutto|netto|čistá|váha|kg|datum|strana|page|celkem|box|\d+\s*$)/i;
  if (line.length < 5 || skipRe.test(line.trim())) return null;
  const wAll = [...line.matchAll(/\d{1,3}(?:[.,]\d{1,3})?/g)]
    .map(m => ({ v: parseFloat(m[0].replace(',', '.')), i: m.index }))
    .filter(n => n.v > 0.5 && n.v < 999999);
  if (wAll.length < 1) return null;
  const raw = line.slice(0, wAll[0].i).replace(/[\s,;.]+$/, '').trim();
  if (!raw || raw.length < 2 || /^\d+$/.test(raw)) return null;
  return {
    date: docDate, raw_material: raw, raw_type: null, raw_box: null,
    brutto: wAll.length >= 2 ? wAll[wAll.length - 2].v : wAll[0].v,
    netto:  wAll[wAll.length - 1].v,
    location: null,
  };
}

/** Main entry – tries TK format first, then generic, then no-date. */
function parsePdfText(text, filename = '') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const tkRows = lines.map(parseTKRow).filter(Boolean);
  if (tkRows.length >= 3) return tkRows;

  const genRows = lines.map(parseGenericRow).filter(Boolean);
  if (genRows.length >= 3) return genRows;

  const docDate = (() => {
    for (const m of text.matchAll(/(\d{1,2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{2,4})/g)) {
      const d = parseDateFlexible(m[0]); if (d) return d;
    }
    return parseDateFlexible(filename) || null;
  })();
  return lines.map(l => parseNoDateRow(l, docDate)).filter(Boolean);
}

// ── Apply mappings (háček-normalised matching) ────────────────────────────────
function applyMappings(rows) {
  const mappings = db.all('SELECT * FROM pdf_mappings');
  const exactIdx = {};
  const normIdx  = {};
  for (const m of mappings) {
    exactIdx[m.pdf_name.toLowerCase().trim()] = m;
    normIdx[normHacek(m.pdf_name)] = m;
  }
  return rows.map(r => {
    const map = exactIdx[(r.raw_material || '').toLowerCase().trim()]
             || normIdx[normHacek(r.raw_material)]
             || null;
    return { ...r, mapped_material_id: map?.material_id ?? null, mapped_type_id: map?.type_id ?? null };
  });
}

function extractDateRange(rows) {
  const toIso = s => { const [d,m,y] = s.split('.'); return `${y}-${m}-${d}`; };
  const dates = rows.map(r => r.date).filter(Boolean).sort((a, b) => toIso(a).localeCompare(toIso(b)));
  return { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null };
}

function saveRows(importId, mapped) {
  db.run('DELETE FROM pdf_rows WHERE import_id = ?', [importId]);
  for (const row of mapped) {
    db.run(
      `INSERT INTO pdf_rows
         (import_id,date,raw_material,raw_type,raw_box,brutto,netto,location,mapped_material_id,mapped_type_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [importId, row.date, row.raw_material, row.raw_type, row.raw_box,
       row.brutto, row.netto, row.location, row.mapped_material_id, row.mapped_type_id]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.post('/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Žádný soubor' });
  if (!req.file.originalname.toLowerCase().endsWith('.pdf'))
    return res.status(400).json({ error: 'Musí být PDF soubor' });
  try {
    const text   = (await pdfParse(req.file.buffer)).text;
    const rows   = parsePdfText(text, req.file.originalname);
    const mapped = applyMappings(rows);
    const { from, to } = extractDateRange(rows);
    const label = from && to ? (from === to ? from : `${from} – ${to}`) : req.file.originalname.replace(/\.pdf$/i, '');
    const r = db.run(
      `INSERT INTO pdf_imports (filename, date_from, date_to, label, raw_text) VALUES (?,?,?,?,?)`,
      [req.file.originalname, from, to, label, text]
    );
    saveRows(r.lastInsertRowid, mapped);
    db.run('INSERT INTO logs (action,details) VALUES (?,?)',
      ['PDF_IMPORT', JSON.stringify({ filename: req.file.originalname, rows: rows.length, label })]);
    res.json({ id: r.lastInsertRowid, label, rows: rows.length, from, to });
  } catch (e) {
    console.error('PDF error:', e.message);
    res.status(500).json({ error: 'Chyba parsování PDF: ' + e.message });
  }
});

router.get('/imports', (_req, res) => {
  res.json(db.all(`
    SELECT i.*, COUNT(r.id) as row_count,
           ROUND(SUM(r.netto),2) as total_netto, ROUND(SUM(r.brutto),2) as total_brutto
    FROM pdf_imports i LEFT JOIN pdf_rows r ON r.import_id=i.id
    GROUP BY i.id ORDER BY i.id DESC
  `));
});

router.get('/imports/:id/rows', (req, res) => {
  res.json(db.all(`
    SELECT r.*, m.abbreviation AS material_abbr, m.name AS material_name, t.name AS type_name
    FROM pdf_rows r
    LEFT JOIN materials m ON r.mapped_material_id=m.id
    LEFT JOIN types     t ON r.mapped_type_id=t.id
    WHERE r.import_id=? ORDER BY r.id
  `, [req.params.id]));
});

router.get('/imports/:id/rawtext', (req, res) => {
  const imp = db.get('SELECT raw_text FROM pdf_imports WHERE id=?', [req.params.id]);
  if (!imp) return res.status(404).json({ error: 'Import nenalezen' });
  res.json({ raw_text: imp.raw_text.slice(0, 8000) });
});

router.delete('/imports/:id', (req, res) => {
  db.run('DELETE FROM pdf_imports WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/imports/:id/reparse', (req, res) => {
  const imp = db.get('SELECT * FROM pdf_imports WHERE id=?', [req.params.id]);
  if (!imp) return res.status(404).json({ error: 'Import nenalezen' });
  const rows   = parsePdfText(imp.raw_text, imp.filename);
  const mapped = applyMappings(rows);
  const { from, to } = extractDateRange(rows);
  saveRows(imp.id, mapped);
  const label = from && to ? (from === to ? from : `${from} – ${to}`) : imp.filename.replace(/\.pdf$/i, '');
  db.run('UPDATE pdf_imports SET date_from=?,date_to=?,label=? WHERE id=?', [from, to, label, imp.id]);
  res.json({ ok: true, rows: rows.length, label, from, to });
});

router.post('/imports/:id/remap', (req, res) => {
  const rows = db.all('SELECT * FROM pdf_rows WHERE import_id=?', [req.params.id]);
  const mappings = db.all('SELECT * FROM pdf_mappings');
  const exactIdx = {}; const normIdx = {};
  for (const m of mappings) {
    exactIdx[m.pdf_name.toLowerCase().trim()] = m;
    normIdx[normHacek(m.pdf_name)] = m;
  }
  for (const row of rows) {
    const map = exactIdx[(row.raw_material||'').toLowerCase().trim()]
             || normIdx[normHacek(row.raw_material)] || null;
    db.run('UPDATE pdf_rows SET mapped_material_id=?,mapped_type_id=? WHERE id=?',
      [map?.material_id ?? null, map?.type_id ?? null, row.id]);
  }
  res.json({ ok: true, remapped: rows.length });
});

router.get('/mappings', (_req, res) => {
  res.json(db.all(`
    SELECT pm.*, m.abbreviation AS material_abbr, t.name AS type_name
    FROM pdf_mappings pm
    LEFT JOIN materials m ON pm.material_id=m.id
    LEFT JOIN types t ON pm.type_id=t.id
    ORDER BY pm.pdf_name
  `));
});

router.post('/mappings', (req, res) => {
  const { pdf_name, material_id, type_id } = req.body;
  if (!pdf_name?.trim()) return res.status(400).json({ error: 'pdf_name je povinný' });
  try {
    db.run(
      `INSERT INTO pdf_mappings (pdf_name,material_id,type_id) VALUES (?,?,?)
       ON CONFLICT(pdf_name) DO UPDATE SET material_id=excluded.material_id,type_id=excluded.type_id`,
      [pdf_name.trim(), material_id || null, type_id || null]
    );
    res.json(db.get('SELECT * FROM pdf_mappings WHERE pdf_name=?', [pdf_name.trim()]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/mappings/:id', (req, res) => {
  db.run('DELETE FROM pdf_mappings WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
