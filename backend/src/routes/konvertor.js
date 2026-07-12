/**
 * PDF Converter routes
 * POST /api/konvertor/upload   – upload + parse PDF
 * GET  /api/konvertor/imports  – list all imports (accordion data)
 * GET  /api/konvertor/imports/:id/rows – rows of one import
 * DELETE /api/konvertor/imports/:id
 *
 * GET  /api/konvertor/mappings       – get all name mappings
 * POST /api/konvertor/mappings       – add/update a mapping
 * DELETE /api/konvertor/mappings/:id
 */
import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import db from '../db/database.js';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseWeight(s) {
  if (!s) return null;
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function parseDateCZ(s) {
  if (!s) return null;
  // Try DD.MM.YYYY or D.M.YYYY
  const m1 = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m1) {
    const [, d, mo, y] = m1;
    const year = y.length === 2 ? '20' + y : y;
    return `${d.padStart(2,'0')}.${mo.padStart(2,'0')}.${year}`;
  }
  return null;
}

/**
 * Try to parse lines of PDF text into structured rows.
 * This is heuristic – works for common scrap-yard PDF formats.
 * Returns array of { date, raw_material, raw_type, raw_box, brutto, netto, location }
 */
function parsePdfText(text) {
  const rows = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Number pattern
  const numRe = /^-?\d{1,6}[.,]\d{0,3}$/;

  for (const line of lines) {
    // Skip header-like lines
    if (/datum|materiál|typ|bedna|brutto|čistá|váha|material/i.test(line) && line.length < 80) continue;

    // Try to extract a date anywhere in the line
    const dateMatch = line.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
    if (!dateMatch) continue;

    const date = parseDateCZ(dateMatch[0]);

    // Split line into tokens
    const tokens = line.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean);

    // Find number tokens (weights)
    const numTokens = tokens.filter(t => numRe.test(t));
    if (numTokens.length < 2) continue;

    const brutto = parseWeight(numTokens[numTokens.length - 2]);
    const netto  = parseWeight(numTokens[numTokens.length - 1]);

    // Non-number tokens → text fields
    const textTokens = tokens.filter(t => !numRe.test(t) && !t.match(/^\d{1,2}\.\d{1,2}\.\d{2,4}$/));

    // Heuristic assignment
    const raw_material = textTokens[0] || null;
    const raw_type     = textTokens[1] || null;
    const raw_box      = textTokens[2] || null;
    const location     = textTokens[3] || null;

    rows.push({ date, raw_material, raw_type, raw_box, brutto, netto, location });
  }

  return rows;
}

function applyMappings(rows) {
  const mappings = db.all('SELECT * FROM pdf_mappings');
  const mapIndex = {};
  for (const m of mappings) mapIndex[m.pdf_name.toLowerCase()] = m;

  return rows.map(r => {
    const key = [r.raw_material, r.raw_type].filter(Boolean).join(' ').toLowerCase();
    const map = mapIndex[key] || mapIndex[(r.raw_material || '').toLowerCase()] || null;
    return {
      ...r,
      mapped_material_id: map?.material_id ?? null,
      mapped_type_id:     map?.type_id ?? null,
    };
  });
}

function extractDateRange(rows) {
  const dates = rows.map(r => r.date).filter(Boolean).sort((a, b) => {
    const [ad,am,ay] = a.split('.'); const [bd,bm,by] = b.split('.');
    return new Date(`${ay}-${am}-${ad}`) - new Date(`${by}-${bm}-${bd}`);
  });
  return { from: dates[0] || null, to: dates[dates.length - 1] || null };
}

// ── Upload PDF ────────────────────────────────────────────────────────────────
router.post('/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Žádný soubor' });
  if (!req.file.originalname.toLowerCase().endsWith('.pdf'))
    return res.status(400).json({ error: 'Musí být PDF soubor' });

  try {
    const parsed = await pdfParse(req.file.buffer);
    const text   = parsed.text;
    const rows   = parsePdfText(text);
    const mapped = applyMappings(rows);
    const { from, to } = extractDateRange(rows);

    // Build label
    const label = from && to
      ? (from === to ? from : `${from} – ${to}`)
      : req.file.originalname.replace('.pdf', '');

    // Save import
    const impR = db.run(
      `INSERT INTO pdf_imports (filename, date_from, date_to, label, raw_text) VALUES (?,?,?,?,?)`,
      [req.file.originalname, from, to, label, text]
    );
    const importId = impR.lastInsertRowid;

    // Save rows
    for (const row of mapped) {
      db.run(
        `INSERT INTO pdf_rows (import_id,date,raw_material,raw_type,raw_box,brutto,netto,location,mapped_material_id,mapped_type_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [importId, row.date, row.raw_material, row.raw_type, row.raw_box,
         row.brutto, row.netto, row.location, row.mapped_material_id, row.mapped_type_id]
      );
    }

    db.run(`INSERT INTO logs (action, details) VALUES (?,?)`, [
      'PDF_IMPORT', JSON.stringify({ filename: req.file.originalname, rows: rows.length, label })
    ]);

    res.json({ id: importId, label, rows: rows.length, from, to });
  } catch (e) {
    console.error('PDF parse error:', e.message);
    res.status(500).json({ error: 'Chyba při parsování PDF: ' + e.message });
  }
});

// ── List imports ──────────────────────────────────────────────────────────────
router.get('/imports', (_req, res) => {
  const rows = db.all(`
    SELECT i.*, COUNT(r.id) as row_count,
           ROUND(SUM(r.netto),2) as total_netto,
           ROUND(SUM(r.brutto),2) as total_brutto
    FROM pdf_imports i
    LEFT JOIN pdf_rows r ON r.import_id = i.id
    GROUP BY i.id
    ORDER BY i.id DESC
  `);
  res.json(rows);
});

// ── Get rows of one import ────────────────────────────────────────────────────
router.get('/imports/:id/rows', (req, res) => {
  const rows = db.all(`
    SELECT r.*,
           m.abbreviation AS material_abbr, m.name AS material_name,
           t.name AS type_name
    FROM pdf_rows r
    LEFT JOIN materials m ON r.mapped_material_id = m.id
    LEFT JOIN types     t ON r.mapped_type_id     = t.id
    WHERE r.import_id = ?
    ORDER BY r.id
  `, [req.params.id]);
  res.json(rows);
});

// ── Delete import ─────────────────────────────────────────────────────────────
router.delete('/imports/:id', (req, res) => {
  db.run('DELETE FROM pdf_imports WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── Mappings CRUD ─────────────────────────────────────────────────────────────
router.get('/mappings', (_req, res) => {
  const rows = db.all(`
    SELECT pm.*, m.abbreviation AS material_abbr, t.name AS type_name
    FROM pdf_mappings pm
    LEFT JOIN materials m ON pm.material_id = m.id
    LEFT JOIN types     t ON pm.type_id     = t.id
    ORDER BY pm.pdf_name
  `);
  res.json(rows);
});

router.post('/mappings', (req, res) => {
  const { pdf_name, material_id, type_id } = req.body;
  if (!pdf_name?.trim()) return res.status(400).json({ error: 'pdf_name je povinný' });
  try {
    const r = db.run(
      `INSERT INTO pdf_mappings (pdf_name, material_id, type_id) VALUES (?,?,?)
       ON CONFLICT(pdf_name) DO UPDATE SET material_id=excluded.material_id, type_id=excluded.type_id`,
      [pdf_name.trim(), material_id || null, type_id || null]
    );
    res.json({ id: r.lastInsertRowid || db.get('SELECT id FROM pdf_mappings WHERE pdf_name=?',[pdf_name.trim()])?.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/mappings/:id', (req, res) => {
  db.run('DELETE FROM pdf_mappings WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── Re-apply mappings to existing import ─────────────────────────────────────
router.post('/imports/:id/remap', (req, res) => {
  const rows = db.all('SELECT * FROM pdf_rows WHERE import_id = ?', [req.params.id]);
  const mappings = db.all('SELECT * FROM pdf_mappings');
  const idx = {};
  for (const m of mappings) idx[m.pdf_name.toLowerCase()] = m;

  for (const row of rows) {
    const key = [row.raw_material, row.raw_type].filter(Boolean).join(' ').toLowerCase();
    const map = idx[key] || idx[(row.raw_material||'').toLowerCase()] || null;
    db.run(
      'UPDATE pdf_rows SET mapped_material_id=?, mapped_type_id=? WHERE id=?',
      [map?.material_id ?? null, map?.type_id ?? null, row.id]
    );
  }
  res.json({ ok: true, remapped: rows.length });
});

export default router;
