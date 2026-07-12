import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.all('SELECT * FROM materials ORDER BY name'));
});

router.post('/', (req, res) => {
  const { name, abbreviation } = req.body;
  if (!name?.trim() || !abbreviation?.trim())
    return res.status(400).json({ error: 'name a abbreviation jsou povinné' });
  try {
    const r = db.run(
      'INSERT INTO materials (name, abbreviation) VALUES (?, ?)',
      [name.trim(), abbreviation.trim().toUpperCase()]
    );
    const mat = { id: r.lastInsertRowid, name: name.trim(), abbreviation: abbreviation.trim().toUpperCase() };
    db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
      ['CREATE_MATERIAL', JSON.stringify(mat)]);
    res.status(201).json(mat);
  } catch {
    res.status(409).json({ error: 'Materiál již existuje' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const mat = db.get('SELECT * FROM materials WHERE id = ?', [id]);
  if (!mat) return res.status(404).json({ error: 'Materiál nenalezen' });

  const inUse = db.get('SELECT COUNT(*) as c FROM records WHERE material_id = ?', [id]);
  if (inUse.c > 0)
    return res.status(409).json({ error: `Materiál je použit v ${inUse.c} záznamu/záznámech` });

  db.run('DELETE FROM materials WHERE id = ?', [id]);
  db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
    ['DELETE_MATERIAL', JSON.stringify(mat)]);
  res.json({ ok: true });
});

export default router;
