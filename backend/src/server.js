import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import db from './db/database.js';
import seed from './db/seed.js';
import materialsRouter   from './routes/materials.js';
import typesRouter       from './routes/types.js';
import boxesRouter       from './routes/boxes.js';
import containersRouter  from './routes/containers.js';
import recordsRouter     from './routes/records.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

seed();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/materials',  materialsRouter);
app.use('/api/types',      typesRouter);
app.use('/api/boxes',      boxesRouter);
app.use('/api/containers', containersRouter);
app.use('/api/records',    recordsRouter);

// Serve built frontend in production
const distPath = join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`KovošrotSoft backend running on port ${PORT}`));
