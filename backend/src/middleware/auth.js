import crypto from 'crypto';

const SECRET = 'kovosrotsoft-salt-2026';
export const USERS = { admin: 'admin123' };

export function makeToken(username) {
  return crypto.createHmac('sha256', SECRET).update(username).digest('hex');
}

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nepřihlášen' });
  }
  const token = auth.slice(7);
  const valid = Object.keys(USERS).some(u => makeToken(u) === token);
  if (!valid) return res.status(401).json({ error: 'Neplatný token' });
  next();
}
