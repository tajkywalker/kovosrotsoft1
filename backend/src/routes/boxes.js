import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const { material_id } = req.query;
  const rows = material_id
    ? db.all('SELECT * FROM boxes WHERE material_id = ? ORDER BY name', [material_id])
    : db.all('SELECT b.*, m.abbreviation, m.name AS material_name FROM boxes b JOIN materials m ON b.material_id=m.id ORDER BY m.name, b.name');
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, material_id, tare_weight } = req.body;
  if (!name?.trim() || !material_id)
    return res.status(400).json({ error: 'name a material_id jsou povinné' });
  const tare = parseFloat(tare_weight) || 0;
  try {
    const r = db.run(
      'INSERT INTO boxes (name, material_id, tare_weight) VALUES (?, ?, ?)',
      [name.trim(), material_id, tare]
    );
    const box = { id: r.lastInsertRowid, name: name.trim(), material_id, tare_weight: tare };
    db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
      ['CREATE_BOX', JSON.stringify(box)]);
    res.status(201).json(box);
  } catch {
    res.status(409).json({ error: 'Bedna s tímto názvem již existuje' });
  }
});

// PATCH tare weight
router.patch('/:id/tare', (req, res) => {
  const { id } = req.params;
  const tare = parseFloat(req.body.tare_weight);
  if (isNaN(tare)) return res.status(400).json({ error: 'Neplatná tára' });
  db.run('UPDATE boxes SET tare_weight = ? WHERE id = ?', [tare, id]);
  db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
    ['UPDATE_BOX_TARE', JSON.stringify({ id, tare_weight: tare })]);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const box = db.get('SELECT * FROM boxes WHERE id = ?', [id]);
  if (!box) return res.status(404).json({ error: 'Bedna nenalezena' });

  const inUse = db.get('SELECT COUNT(*) as c FROM records WHERE box_id = ?', [id]);
  if (inUse.c > 0)
    return res.status(409).json({ error: `Bedna je použita v ${inUse.c} záznamu/záznámech` });

  db.run('DELETE FROM boxes WHERE id = ?', [id]);
  db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
    ['DELETE_BOX', JSON.stringify(box)]);
  res.json({ ok: true });
});

export default router;
