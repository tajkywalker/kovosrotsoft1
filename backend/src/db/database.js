import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import sqlite3wasm from 'node-sqlite3-wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../../data/kovosrot.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new sqlite3wasm.Database(DB_PATH);

db.exec(`PRAGMA journal_mode=WAL`);
db.exec(`PRAGMA foreign_keys=ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS materials (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL UNIQUE,
    abbreviation TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS types (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    material_id INTEGER NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    UNIQUE(name, material_id)
  );

  CREATE TABLE IF NOT EXISTS boxes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    material_id INTEGER NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS containers (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS records (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    date          TEXT NOT NULL,
    material_id   INTEGER NOT NULL,
    type_id       INTEGER NOT NULL,
    box_id        INTEGER NOT NULL,
    brutto_weight REAL NOT NULL,
    netto_weight  REAL NOT NULL,
    location_type TEXT NOT NULL CHECK(location_type IN ('KONTEJNER','BEDNA')),
    location_name TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (type_id)     REFERENCES types(id),
    FOREIGN KEY (box_id)      REFERENCES boxes(id)
  );
`);

export default db;
