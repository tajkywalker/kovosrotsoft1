import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const { material_id } = req.query;
  const rows = material_id
    ? db.all('SELECT * FROM types WHERE material_id = ? ORDER BY name', [material_id])
    : db.all('SELECT t.*, m.abbreviation FROM types t JOIN materials m ON t.material_id=m.id ORDER BY m.name, t.name');
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, material_id } = req.body;
  if (!name?.trim() || !material_id)
    return res.status(400).json({ error: 'name a material_id jsou povinné' });
  try {
    const r = db.run('INSERT INTO types (name, material_id) VALUES (?, ?)', [name.trim(), material_id]);
    res.status(201).json({ id: r.lastInsertRowid, name: name.trim(), material_id });
  } catch {
    res.status(409).json({ error: 'Typ pro tento materiál již existuje' });
  }
});

export default router;
