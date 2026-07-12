import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const { material_id } = req.query;
  const rows = material_id
    ? db.all('SELECT * FROM types WHERE material_id = ? ORDER BY name', [material_id])
    : db.all('SELECT t.*, m.abbreviation, m.name AS material_name FROM types t JOIN materials m ON t.material_id=m.id ORDER BY m.name, t.name');
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, material_id } = req.body;
  if (!name?.trim() || !material_id)
    return res.status(400).json({ error: 'name a material_id jsou povinné' });
  try {
    const r = db.run('INSERT INTO types (name, material_id) VALUES (?, ?)', [name.trim(), material_id]);
    const typ = { id: r.lastInsertRowid, name: name.trim(), material_id };
    db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
      ['CREATE_TYPE', JSON.stringify(typ)]);
    res.status(201).json(typ);
  } catch {
    res.status(409).json({ error: 'Typ pro tento materiál již existuje' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const typ = db.get('SELECT t.*, m.abbreviation FROM types t JOIN materials m ON t.material_id=m.id WHERE t.id=?', [id]);
  if (!typ) return res.status(404).json({ error: 'Typ nenalezen' });

  const inUse = db.get('SELECT COUNT(*) as c FROM records WHERE type_id = ?', [id]);
  if (inUse.c > 0)
    return res.status(409).json({ error: `Typ je použit v ${inUse.c} záznamu/záznámech` });

  db.run('DELETE FROM types WHERE id = ?', [id]);
  db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
    ['DELETE_TYPE', JSON.stringify(typ)]);
  res.json({ ok: true });
});

export default router;
