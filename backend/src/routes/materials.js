import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.all('SELECT * FROM materials ORDER BY name');
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, abbreviation } = req.body;
  if (!name?.trim() || !abbreviation?.trim())
    return res.status(400).json({ error: 'name a abbreviation jsou povinné' });
  try {
    const r = db.run('INSERT INTO materials (name, abbreviation) VALUES (?, ?)', [name.trim(), abbreviation.trim().toUpperCase()]);
    res.status(201).json({ id: r.lastInsertRowid, name: name.trim(), abbreviation: abbreviation.trim().toUpperCase() });
  } catch {
    res.status(409).json({ error: 'Materiál již existuje' });
  }
});

export default router;
