import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function todayCZ() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function czToIso(cz) {
  const [dd, mm, yyyy] = cz.split('.');
  return `${yyyy}-${mm}-${dd}`;
}

router.get('/', (_req, res) => {
  const rows = db.all(`
    SELECT r.*,
           m.abbreviation AS material_abbr, m.name AS material_name,
           t.name AS type_name,
           b.name AS box_name, b.tare_weight
    FROM records r
    JOIN materials m ON r.material_id = m.id
    JOIN types     t ON r.type_id     = t.id
    JOIN boxes     b ON r.box_id      = b.id
    ORDER BY r.id DESC
  `);
  res.json(rows);
});

router.get('/summary', (_req, res) => {
  const rows = db.all(`
    SELECT m.abbreviation AS material_abbr, m.name AS material_name,
           t.name AS type_name,
           COUNT(*) AS count,
           ROUND(SUM(r.netto_weight),  2) AS total_netto,
           ROUND(SUM(r.brutto_weight), 2) AS total_brutto
    FROM records r
    JOIN materials m ON r.material_id = m.id
    JOIN types     t ON r.type_id     = t.id
    GROUP BY r.material_id, r.type_id
    ORDER BY m.name, t.name
  `);
  res.json(rows);
});

router.get('/verify', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Parametry from a to jsou povinné' });
  const rows = db.all(`
    SELECT m.abbreviation AS material_abbr, m.name AS material_name,
           t.name AS type_name,
           COUNT(*) AS count,
           ROUND(SUM(r.netto_weight),  2) AS total_netto,
           ROUND(SUM(r.brutto_weight), 2) AS total_brutto
    FROM records r
    JOIN materials m ON r.material_id = m.id
    JOIN types     t ON r.type_id     = t.id
    WHERE substr(r.date,7,4)||'-'||substr(r.date,4,2)||'-'||substr(r.date,1,2)
          BETWEEN ? AND ?
    GROUP BY r.material_id, r.type_id
    ORDER BY m.name, t.name
  `, [czToIso(from), czToIso(to)]);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { date, material_id, type_id, box_id, brutto_weight, netto_weight, location_type, location_name } = req.body;
  if (!material_id || !type_id || !box_id || brutto_weight == null || netto_weight == null || !location_type || !location_name)
    return res.status(400).json({ error: 'Všechna pole jsou povinná' });
  if (!['KONTEJNER', 'BEDNA'].includes(location_type))
    return res.status(400).json({ error: 'location_type musí být KONTEJNER nebo BEDNA' });

  const recordDate = date || todayCZ();
  const r = db.run(
    `INSERT INTO records (date, material_id, type_id, box_id, brutto_weight, netto_weight, location_type, location_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [recordDate, material_id, type_id, box_id, brutto_weight, netto_weight, location_type, location_name]
  );

  // Get names for log
  const mat = db.get('SELECT abbreviation FROM materials WHERE id=?', [material_id]);
  const typ = db.get('SELECT name FROM types WHERE id=?', [type_id]);
  const box = db.get('SELECT name FROM boxes WHERE id=?', [box_id]);
  db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`, [
    'CREATE_RECORD',
    JSON.stringify({ id: r.lastInsertRowid, date: recordDate, material: mat?.abbreviation, type: typ?.name, box: box?.name, netto: netto_weight, location: `${location_type} – ${location_name}` })
  ]);

  res.status(201).json({ id: r.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  const rec = db.get(`
    SELECT r.*, m.abbreviation, t.name AS type_name, b.name AS box_name
    FROM records r
    JOIN materials m ON r.material_id=m.id
    JOIN types t ON r.type_id=t.id
    JOIN boxes b ON r.box_id=b.id
    WHERE r.id=?`, [req.params.id]);
  if (!rec) return res.status(404).json({ error: 'Záznam nenalezen' });
  db.run('DELETE FROM records WHERE id = ?', [req.params.id]);
  db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`, [
    'DELETE_RECORD',
    JSON.stringify({ id: rec.id, date: rec.date, material: rec.abbreviation, type: rec.type_name, netto: rec.netto_weight })
  ]);
  res.json({ ok: true });
});

export default router;
