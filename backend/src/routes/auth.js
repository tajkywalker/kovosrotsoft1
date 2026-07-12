import { Router } from 'express';
import { USERS, makeToken } from '../middleware/auth.js';
import db from '../db/database.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Vyplňte uživatelské jméno a heslo' });

  if (USERS[username] === password) {
    const token = makeToken(username);
    db.run(
      `INSERT INTO logs (action, details, user_name) VALUES (?, ?, ?)`,
      ['USER_LOGIN', JSON.stringify({ username }), username]
    );
    return res.json({ token, username });
  }
  res.status(401).json({ error: 'Nesprávné přihlašovací údaje' });
});

export default router;
