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
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL UNIQUE,
    material_id  INTEGER NOT NULL,
    tare_weight  REAL NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    action     TEXT NOT NULL,
    details    TEXT NOT NULL,
    user_name  TEXT NOT NULL DEFAULT 'admin'
  );

  -- PDF converter: uploaded PDFs (metadata)
  CREATE TABLE IF NOT EXISTS pdf_imports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    filename   TEXT NOT NULL,
    date_from  TEXT,
    date_to    TEXT,
    label      TEXT NOT NULL,
    raw_text   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- PDF converter: individual parsed rows
  CREATE TABLE IF NOT EXISTS pdf_rows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    import_id   INTEGER NOT NULL,
    date        TEXT,
    raw_material TEXT,
    raw_type    TEXT,
    raw_box     TEXT,
    brutto      REAL,
    netto       REAL,
    location    TEXT,
    mapped_material_id INTEGER,
    mapped_type_id     INTEGER,
    FOREIGN KEY (import_id) REFERENCES pdf_imports(id) ON DELETE CASCADE
  );

  -- PDF converter: user-defined name mappings (raw PDF text → our type)
  CREATE TABLE IF NOT EXISTS pdf_mappings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    pdf_name       TEXT NOT NULL UNIQUE,
    material_id    INTEGER,
    type_id        INTEGER,
    created_at     TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Migrations
const migrations = [
  `ALTER TABLE boxes ADD COLUMN tare_weight REAL NOT NULL DEFAULT 0`,
];
for (const m of migrations) {
  try { db.exec(m); } catch { /* already exists */ }
}

export default db;
