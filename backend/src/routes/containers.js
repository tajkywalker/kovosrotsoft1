import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.all('SELECT * FROM containers ORDER BY name'));
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je povinný' });
  try {
    const r = db.run('INSERT INTO containers (name) VALUES (?)', [name.trim()]);
    const con = { id: r.lastInsertRowid, name: name.trim() };
    db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
      ['CREATE_CONTAINER', JSON.stringify(con)]);
    res.status(201).json(con);
  } catch {
    res.status(409).json({ error: 'Kontejner s tímto názvem již existuje' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const con = db.get('SELECT * FROM containers WHERE id = ?', [id]);
  if (!con) return res.status(404).json({ error: 'Kontejner nenalezen' });
  db.run('DELETE FROM containers WHERE id = ?', [id]);
  db.run(`INSERT INTO logs (action, details) VALUES (?, ?)`,
    ['DELETE_CONTAINER', JSON.stringify(con)]);
  res.json({ ok: true });
});

export default router;
