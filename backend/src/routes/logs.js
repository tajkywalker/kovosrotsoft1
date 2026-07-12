import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  const rows = db.all(
    `SELECT * FROM logs ORDER BY id DESC LIMIT ?`,
    [limit]
  );
  res.json(rows);
});

export default router;
