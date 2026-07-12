/**
 * PDF Converter routes
 *
 * PDF format (Thermo King / Trane "Měsíční přehled Váženek"):
 *   ID  Material_name  [Material kg]  [Box kg]  [Celkem kg]  Date
 *   2472 Hliník barevná pásovina 5/16  71 kg  80 kg  151 kg  24.06.2026
 *
 * Columns:
 *   - id          : numeric row ID
 *   - raw_material: material name (may have lost háček chars via pdf-parse)
 *   - netto       : first  kg value  = "Materiál" column (material weight only)
 *   - box_kg      : second kg value  = "Box" column (box/tare weight)
 *   - brutto      : third  kg value  = "Celkem" column (netto + box = total)
 *   - date        : at the END of the line
 *
 * Note on diacritics:
 *   pdf-parse drops háček characters (ě č ř ž ď š ť ň) when the PDF uses
 *   custom font encoding → "Měď" → "M", "červená" → "ervená".
 *   Mappings use háček-normalised comparison so the user can enter correct
 *   Czech names and they'll still match the garbled PDF text.
 */
import { Router }  from 'express';
import multer      from 'multer';
import pdfParse    from 'pdf-parse/lib/pdf-parse.js';
import db          from '../db/database.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Normalisation helpers ─────────────────────────────────────────────────────

/** Strip háček diacritics (lost in PDF font encoding) + normalise dashes + lowercase */
function normHacek(s) {
  return (s || '')
    .replace(/[ěčřžďšťňĚČŘŽĎŠŤŇ]/g, '')  // drop háček chars
    .replace(/[–—]/g, '-')                  // em/en dash → hyphen
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateFlexible(s) {
  const m = (s || '').match(/(\d{1,2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{2,4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? '20' + y : y;
  return `${d.padStart(2,'0')}.${mo.padStart(2,'0')}.${year}`;
}

// ── Row parsers ───────────────────────────────────────────────────────────────

/**
 * Strategy TK (Thermo King format):
 *   Line starts with a numeric ID, has ≥3 "NNN kg" tokens, ends with a date.
 *   Returns { date, raw_material, raw_box, brutto, netto, location } or null.
 */
function parseTKRow(line) {
  if (!/^\d{3,6}\s/.test(line.trim())) return null;

  // Date at the END: "24.06.2026" or "23. 6. 2026" or "5. 6. 2026"
  const dateRe = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/;
  const dm = line.match(dateRe);
  if (!dm) return null;

  const date = `${dm[1].padStart(2,'0')}.${dm[2].padStart(2,'0')}.${dm[3]}`;

  // Strip date and ID
  const body = line.slice(0, dm.index).trim().replace(/^\d+\s+/, '');

  // Extract all "NNN kg" or "NNN.N kg" (case-insensitive)
  const wRe  = /(\d+(?:\.\d+)?)\s*kg/gi;
  const wAll = [...body.matchAll(wRe)];
  if (wAll.length < 3) return null;

  // Material name = text before the first "NNN kg"
  const firstKgIdx = body.search(/\d+(?:\.\d+)?\s*kg/i);
  const rawMaterial = body.slice(0, firstKgIdx).replace(/[\s,;.]+$/, '').trim();
  if (!rawMaterial || rawMaterial.length < 2) return null;

  const netto  = parseFloat(wAll[0][1]); // Materiál column
  const boxKg  = parseFloat(wAll[1][1]); // Box column
  const brutto = parseFloat(wAll[2][1]); // Celkem column

  return {
    date,
    raw_material: rawMaterial,
    raw_type:     null,
    raw_box:      boxKg > 0 ? `Tára ${boxKg} kg` : null,
    brutto,
    netto,
    location:     null,
  };
}

/**
 * Strategy A: generic – date anywhere in line, material before first weight.
 */
function parseGenericRow(line) {
  const dm = line.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\b/);
  if (!dm) return null;
  const date = parseDateFlexible(dm[0]);

  const wRe  = /(\d{1,3}(?:[.,]\d{1,3})?)/g;
  const wAll = [...line.matchAll(wRe)]
    .map(m => ({ v: parseFloat(m[0].replace(',', '.')), i: m.index }))
    .filter(n => n.v > 0.5 && n.v < 999999);
  if (wAll.length < 1) return null;

  const textBefore = line.slice(0, wAll[0].i)
    .replace(dm[0], '')
    .replace(/^\d+\s+/, '')
    .trim();
  if (!textBefore || textBefore.length < 2) return null;

  const brutto = wAll.length >= 2 ? wAll[wAll.length - 2].v : wAll[0].v;
  const netto  = wAll[wAll.length - 1].v;

  return {
    date,
    raw_material: textBefore,
    raw_type: null, raw_box: null,
    brutto, netto, location: null,
  };
}

/**
 * Strategy B: no per-line date – use document date, extract name + weights.
 */
function parseNoDateRow(line, docDate) {
  const skipRe = /^(id|materiál|material|druh|popis|typ|název|brutto|netto|čistá|váha|kg|datum|strana|page|celkem|box|\d+\s*$)/i;
  if (line.length < 5 || skipRe.test(line.trim())) return null;

  const wRe  = /\d{1,3}(?:[.,]\d{1,3})?/g;
  const wAll = [...line.matchAll(wRe)]
    .map(m => ({ v: parseFloat(m[0].replace(',', '.')), i: m.index }))
    .filter(n => n.v > 0.5 && n.v < 999999);
  if (wAll.length < 1) return null;

  const rawMaterial = line.slice(0, wAll[0].i).replace(/[\s,;.]+$/, '').trim();
  if (!rawMaterial || rawMaterial.length < 2 || /^\d+$/.test(rawMaterial)) return null;

  const brutto = wAll.length >= 2 ? wAll[wAll.length - 2].v : wAll[0].v;
  const netto  = wAll[wAll.length - 1].v;

  return { date: docDate, raw_material: rawMaterial, raw_type: null, raw_box: null, brutto, netto, location: null };
}

/** Main parse entry – tries TK format first, then generic, then no-date. */
function parsePdfText(text, filename = '') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Try Thermo King (ID-based) format
  const tkRows = lines.map(parseTKRow).filter(Boolean);
  if (tkRows.length >= 3) return tkRows;

  // Try generic (date-per-line)
  const genRows = lines.map(parseGenericRow).filter(Boolean);
  if (genRows.length >= 3) return genRows;

  // Fall back to doc-level date + material rows
  const docDate = (() => {
    const re = /(\d{1,2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{2,4})/g;
    for (const m of text.matchAll(re)) {
      const d = parseDateFlexible(m[0]);
      if (d) return d;
    }
    return parseDateFlexible(filename) || null;
  })();
  return lines.map(l => parseNoDateRow(l, docDate)).filter(Boolean);
}

// ── Apply mappings (with háček-normalised fallback) ───────────────────────────
function applyMappings(rows) {
  const mappings = db.all('SELECT * FROM pdf_mappings');
  const exactIdx = {};
  const normIdx  = {};
  for (const m of mappings) {
    exactIdx[m.pdf_name.toLowerCase().trim()] = m;
    normIdx[normHacek(m.pdf_name)] = m;
  }

  return rows.map(r => {
    const key     = (r.raw_material || '').toLowerCase().trim();
    const normKey = normHacek(r.raw_material);
    const map = exactIdx[key] || normIdx[normKey] || null;
    return {
      ...r,
      mapped_material_id: map?.material_id ?? null,
      mapped_type_id:     map?.type_id     ?? null,
    };
  });
}

function extractDateRange(rows) {
  const dates = rows.map(r => r.date).filter(Boolean).sort((a, b) => {
    const iso = s => { const [d,m,y] = s.split('.'); return `${y}-${m}-${d}`; };
    return iso(a).localeCompare(iso(b));
  });
  return { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null };
}

function saveRows(importId, mapped) {
  db.run('DELETE FROM pdf_rows WHERE import_id = ?', [importId]);
  for (const row of mapped) {
    db.run(
      `INSERT INTO pdf_rows
         (import_id, date, raw_material, raw_type, raw_box, brutto, netto, location, mapped_material_id, mapped_type_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [importId, row.date, row.raw_material, row.raw_type, row.raw_box,
       row.brutto, row.netto, row.location, row.mapped_material_id, row.mapped_type_id]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/konvertor/upload
router.post('/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Žádný soubor' });
  if (!req.file.originalname.toLowerCase().endsWith('.pdf'))
    return res.status(400).json({ error: 'Musí být PDF soubor' });

  try {
    const parsed = await pdfParse(req.file.buffer);
    const text   = parsed.text;
    const rows   = parsePdfText(text, req.file.originalname);
    const mapped = applyMappings(rows);
    const { from, to } = extractDateRange(rows);

    const label = from && to
      ? (from === to ? from : `${from} – ${to}`)
      : req.file.originalname.replace(/\.pdf$/i, '');

    const r = db.run(
      `INSERT INTO pdf_imports (filename, date_from, date_to, label, raw_text) VALUES (?,?,?,?,?)`,
      [req.file.originalname, from, to, label, text]
    );
    const importId = r.lastInsertRowid;
    saveRows(importId, mapped);

    db.run('INSERT INTO logs (action, details) VALUES (?,?)', [
      'PDF_IMPORT',
      JSON.stringify({ filename: req.file.originalname, rows: rows.length, label }),
    ]);

    res.json({ id: importId, label, rows: rows.length, from, to });
  } catch (e) {
    console.error('PDF parse error:', e.message);
    res.status(500).json({ error: 'Chyba při parsování PDF: ' + e.message });
  }
});

// GET /api/konvertor/imports
router.get('/imports', (_req, res) => {
  res.json(db.all(`
    SELECT i.*, COUNT(r.id) as row_count,
           ROUND(SUM(r.netto),2)  as total_netto,
           ROUND(SUM(r.brutto),2) as total_brutto
    FROM pdf_imports i
    LEFT JOIN pdf_rows r ON r.import_id = i.id
    GROUP BY i.id ORDER BY i.id DESC
  `));
});

// GET /api/konvertor/imports/:id/rows
router.get('/imports/:id/rows', (req, res) => {
  res.json(db.all(`
    SELECT r.*, m.abbreviation AS material_abbr, m.name AS material_name, t.name AS type_name
    FROM pdf_rows r
    LEFT JOIN materials m ON r.mapped_material_id = m.id
    LEFT JOIN types     t ON r.mapped_type_id     = t.id
    WHERE r.import_id = ? ORDER BY r.id
  `, [req.params.id]));
});

// GET /api/konvertor/imports/:id/rawtext
router.get('/imports/:id/rawtext', (req, res) => {
  const imp = db.get('SELECT raw_text FROM pdf_imports WHERE id=?', [req.params.id]);
  if (!imp) return res.status(404).json({ error: 'Import nenalezen' });
  res.json({ raw_text: imp.raw_text.slice(0, 6000) });
});

// DELETE /api/konvertor/imports/:id
router.delete('/imports/:id', (req, res) => {
  db.run('DELETE FROM pdf_imports WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// POST /api/konvertor/imports/:id/reparse – re-parse stored raw text with latest algorithm
router.post('/imports/:id/reparse', (req, res) => {
  const imp = db.get('SELECT * FROM pdf_imports WHERE id=?', [req.params.id]);
  if (!imp) return res.status(404).json({ error: 'Import nenalezen' });

  const rows   = parsePdfText(imp.raw_text, imp.filename);
  const mapped = applyMappings(rows);
  const { from, to } = extractDateRange(rows);

  saveRows(imp.id, mapped);

  const label = from && to
    ? (from === to ? from : `${from} – ${to}`)
    : imp.filename.replace(/\.pdf$/i, '');
  db.run('UPDATE pdf_imports SET date_from=?, date_to=?, label=? WHERE id=?', [from, to, label, imp.id]);

  res.json({ ok: true, rows: rows.length, label, from, to });
});

// POST /api/konvertor/imports/:id/remap – re-apply mappings without re-parsing
router.post('/imports/:id/remap', (req, res) => {
  const rows = db.all('SELECT * FROM pdf_rows WHERE import_id = ?', [req.params.id]);
  const mappings = db.all('SELECT * FROM pdf_mappings');
  const exactIdx = {}; const normIdx = {};
  for (const m of mappings) {
    exactIdx[m.pdf_name.toLowerCase().trim()] = m;
    normIdx[normHacek(m.pdf_name)] = m;
  }
  for (const row of rows) {
    const key  = (row.raw_material || '').toLowerCase().trim();
    const norm = normHacek(row.raw_material);
    const map  = exactIdx[key] || normIdx[norm] || null;
    db.run('UPDATE pdf_rows SET mapped_material_id=?, mapped_type_id=? WHERE id=?',
      [map?.material_id ?? null, map?.type_id ?? null, row.id]);
  }
  res.json({ ok: true, remapped: rows.length });
});

// ── Mappings CRUD ─────────────────────────────────────────────────────────────
router.get('/mappings', (_req, res) => {
  res.json(db.all(`
    SELECT pm.*, m.abbreviation AS material_abbr, t.name AS type_name
    FROM pdf_mappings pm
    LEFT JOIN materials m ON pm.material_id = m.id
    LEFT JOIN types     t ON pm.type_id     = t.id
    ORDER BY pm.pdf_name
  `));
});

router.post('/mappings', (req, res) => {
  const { pdf_name, material_id, type_id } = req.body;
  if (!pdf_name?.trim()) return res.status(400).json({ error: 'pdf_name je povinný' });
  try {
    db.run(
      `INSERT INTO pdf_mappings (pdf_name, material_id, type_id) VALUES (?,?,?)
       ON CONFLICT(pdf_name) DO UPDATE SET material_id=excluded.material_id, type_id=excluded.type_id`,
      [pdf_name.trim(), material_id || null, type_id || null]
    );
    res.json(db.get('SELECT * FROM pdf_mappings WHERE pdf_name=?', [pdf_name.trim()]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/mappings/:id', (req, res) => {
  db.run('DELETE FROM pdf_mappings WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
