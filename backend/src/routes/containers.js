import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.all('SELECT * FROM containers ORDER BY name');
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je povinný' });
  try {
    const r = db.run('INSERT INTO containers (name) VALUES (?)', [name.trim()]);
    res.status(201).json({ id: r.lastInsertRowid, name: name.trim() });
  } catch {
    res.status(409).json({ error: 'Kontejner s tímto názvem již existuje' });
  }
});

export default router;
