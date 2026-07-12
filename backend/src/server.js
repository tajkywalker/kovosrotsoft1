import express from 'express';
import cors from 'cors';
import { join } from 'path';

import db from './db/database.js';
import seed from './db/seed.js';
import { verifyToken } from './middleware/auth.js';

import authRouter       from './routes/auth.js';
import materialsRouter  from './routes/materials.js';
import typesRouter      from './routes/types.js';
import boxesRouter      from './routes/boxes.js';
import containersRouter from './routes/containers.js';
import recordsRouter    from './routes/records.js';
import logsRouter       from './routes/logs.js';

seed();

const app = express();
app.use(cors());
app.use(express.json());

// Public – no auth
app.use('/api/auth', authRouter);

// Protected
app.use('/api/materials',  verifyToken, materialsRouter);
app.use('/api/types',      verifyToken, typesRouter);
app.use('/api/boxes',      verifyToken, boxesRouter);
app.use('/api/containers', verifyToken, containersRouter);
app.use('/api/records',    verifyToken, recordsRouter);
app.use('/api/logs',       verifyToken, logsRouter);

// Serve built frontend (volume mounted at /app/frontend/dist)
const DIST = '/app/frontend/dist';
app.use(express.static(DIST));
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`KovošrotSoft backend running on port ${PORT}`));
