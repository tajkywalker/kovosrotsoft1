/**
 * Import historických záznamů
 * Spustit: node scripts/import_history.mjs
 */
import sqlite3wasm from 'node-sqlite3-wasm';
import { mkdirSync } from 'fs';

const DB_PATH = process.env.DB_PATH || '/app/data/kovosrot.db';
mkdirSync('/app/data', { recursive: true });
const db = new sqlite3wasm.Database(DB_PATH);
db.exec('PRAGMA foreign_keys=OFF'); // allow flexible import

// ── Helpers ──────────────────────────────────────────────────────────────────
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}

function parseWeight(s) {
  if (!s || s === '#N/A' || s.trim() === '') return 0;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function parseDate(s) {
  // M/D/YYYY → DD.MM.YYYY
  const [m, d, y] = s.trim().split('/');
  return `${d.padStart(2,'0')}.${m.padStart(2,'0')}.${y}`;
}

function isContainerRef(s) {
  if (!s || !s.trim()) return false;
  // If it's a number (like "136,50") → not a container ref
  if (/^[\d,. -]+$/.test(s.trim())) return false;
  return true;
}

// ── Raw data ─────────────────────────────────────────────────────────────────
const RAW = `4/29/2026\tAl\tČistá\tAL1\t385,00\t312,50\t
5/4/2026\tAl\tČistá\tAL2\t309,50\t235,50\t
5/6/2026\tCu\tClasic\tCu1\t247,50\t196,00\tCu001
5/6/2026\tCu\tClasic\tCu2\t243,50\t189,00\tCu001
5/6/2026\tAl\tČistá\tAL3\t251,00\t171,00\t
5/6/2026\tAl\tBarevná\tAL4\t247,50\t173,00\t
5/7/2026\tCu\tVlásenka\tCu3\t94,50\t53,00\tCu002
5/7/2026\tCu\tVlásenka\tCu4\t115,00\t43,00\tCu002
5/11/2026\tAl\tČistá\tAL2\t382,50\t308,50\t
5/13/2026\tAl\tČistá\tAL3\t223,50\t143,50\t
5/13/2026\tAl\tTrubky\tAL5\t120,50\t54,00\tAL001
5/13/2026\tAl\tBarevná\tAL6\t230,00\t150,00\t
5/14/2026\tAl\tČistá\tAL2\t308,00\t234,00\t
5/15/2026\tAl\tBarevná\tAL7\t120,00\t47,00\t
5/15/2026\tAl\tČistá\tAL1\t315,50\t243,00\t
5/15/2026\tCu\tVlásenka\tCu3\t84,00\t42,50\tCu003
5/19/2026\tCu\tClasic\tCu1\t247,00\t195,50\tCu004
5/19/2026\tCu\tClasic\tCu2\t207,50\t153,00\tCu004
5/19/2026\tAl\tBarevná\tAL8\t146,00\t73,50\t
5/21/2026\tAl\tBarevná\tAL4\t306,50\t232,00\t
5/22/2026\tCu\tVlásenka\tCu4\t111,00\t39,00\tCu005
5/22/2026\tCu\tVlásenka\tCu3\t78,00\t36,50\tCu005
5/25/2026\tAl\tČistá\tAL3\t311,00\t231,00\t
5/25/2026\tFe\tŠrouby/Nejty\tFe1\t487,50\t447,00\tFe001
5/26/2026\tAl\tČistá\tAL1\t374,00\t301,50\t
5/26/2026\tAl\tBarevná\tAL6\t152,00\t72,00\t
5/26/2026\tAl\tTrubky\tAL5\t139,50\t73,00\tAL001
5/26/2026\tCu\tDrť\tCu5\t229,50\t184,50\tCu006
5/26/2026\tCu\tClasic\tCu2\t245,00\t190,50\tCu007
5/26/2026\tCu\tClasic\tCu1\t207,00\t155,50\tCu007
5/27/2026\tFe\tŠrot (kov.pásky a jiný typ kovu)\tFe2\t61,00\t31,00\t
5/27/2026\tEw\tMonitory, radia a jiný elektroodpad\tEw1\t114,00\t67,50\tEw001
5/27/2026\tKapalina\t120507\tSud\t232,50\t226,50\tS1
5/27/2026\tFe\tSud\tSud\t6,00\t0,00\tBox
5/27/2026\tFe\tSud\tSud\t6,00\t0,00\tBox
5/28/2026\tAl\tBarevná\tAL4\t244,00\t169,50\t
5/28/2026\tAl\tBarevná\tAL7\t125,50\t52,50\t
5/29/2026\tCu\tVlásenka\tCu3\t88,50\t47,00\tCu005
6/1/2026\tAl\tČistá\tAL1\t414,00\t341,50\t
6/2/2026\tCu\tClasic\tCu1\t255,00\t203,50\tCu008
6/2/2026\tCu\tClasic\tCu2\t209,00\t154,50\tCu008
6/2/2026\tAl\tBarevná\tAL4\t213,00\t138,50\t
6/2/2026\tFe\tŠrot (kov.pásky a jiný typ kovu)\tFe3\t702,00\t617,50\t
6/3/2026\tAl\tČistá\tAL2\t310,50\t236,50\t
6/3/2026\tAl+Cu\tChladiče\tepal\t109,00\t87,00\t
6/3/2026\tAl+Cu\tChladiče\tepal\t89,00\t67,00\t
6/3/2026\tAl+Cu\tChladiče\tepal\t92,00\t70,00\t
6/3/2026\tFe\tŠrot (kov.pásky a jiný typ kovu)\tFe3\t535,50\t451,00\t
6/4/2026\tCu\tVlásenka\tAL7\t80,00\t7,00\tCu009
6/4/2026\tCu\tVlásenka\tAL6\t182,50\t102,50\tCu009
6/4/2026\tAl\tČistá\tAL2\t296,50\t222,50\t
6/4/2026\tCu\tClasic\toepal\t86,00\t55,50\t
6/5/2026\tAl\tBarevná\tAL7\t112,00\t39,00\t
6/5/2026\tAl\tTrubky\tAL5\t122,00\t55,50\tAL002
6/5/2026\tCu\tVlásenka\tCu4\t117,50\t45,50\tCu010
6/5/2026\tCu\tVlásenka\tCu3\t90,00\t48,50\tCu010
6/8/2026\tCu\tClasic\tCu1\t242,00\t190,50\tCu011
6/8/2026\tCu\tClasic\tCu2\t231,50\t177,00\tCu011
6/8/2026\tFe\tŠrot (kov.pásky a jiný typ kovu)\tFe3\t379,00\t294,50\t
6/8/2026\tFe\tŠrot (kov.pásky a jiný typ kovu)\tFe3\t538,50\t454,00\t
6/8/2026\tFe\tŠrot (kov.pásky a jiný typ kovu)\tFe3\t537,50\t453,00\t
6/8/2026\tAl\tČistá\tAL9\t131,50\t59,50\t
6/9/2026\tAl\tČistá\tAL2\t140,50\t66,50\t
6/9/2026\tAl\tČistá\tAL1\t438,00\t365,50\t
6/10/2026\tAl\tBarevná\tAL4\t298,50\t224,00\t
6/11/2026\tCu\tVlásenka\tCu3\t81,00\t39,50\tCu010
6/12/2026\tAl\tČistá\tAL2\t425,50\t351,50\t
6/12/2026\tAl\tBarevná\tAL6\t122,50\t42,50\t
6/15/2026\tAl\tČistá\tAL9\t268,00\t196,00\t
6/15/2026\tAl\tČistá\tAL3\t279,00\t199,00\t
6/15/2026\tAl\tBarevná\tAL7\t132,00\t59,00\t
6/16/2026\tAl\tBarevná\tAL6\t170,50\t90,50\t
6/16/2026\tAl\tBarevná\tAL10\t233,00\t159,00\t
6/17/2026\tAl\tTrubky\tAL5\t130,50\t64,00\tAL002
6/17/2026\tCu\tVlásenka\tCu3\t101,50\t60,00\tCu010
6/18/2026\tAl\tČistá\tAL9\t436,50\t364,50\t
6/18/2026\tCu\tClasic\tCu1\t256,00\t204,50\tCu011
6/18/2026\tCu\tClasic\tCu2\t249,00\t194,50\tCu011
6/19/2026\tAl\tBarevná\tAL10\t170,50\t96,50\t
6/19/2026\tAl\tBarevná\tAL8\t142,50\t70,00\t
6/23/2026\tAl\tČistá\tAL9\t361,00\t289,00\t
6/23/2026\tAl\tBarevná\tAL11\t279,00\t161,50\t
6/23/2026\tCu\tVlásenka\tCu3\t98,00\t56,50\tCu012
6/23/2026\tAl\tČistá\tAL3\t249,00\t169,00\t
6/23/2026\tAl\tBarevná\tAL2\t122,00\t48,00\t
6/24/2026\tAl\tBarevná\tAL6\t151,00\t71,00\t
6/25/2026\tAl\tČistá\tAL12\t299,00\t202,50\t
6/25/2026\tAl\tBarevná\tAL10\t278,00\t204,00\t
6/26/2026\tCu\tClasic\tCu1\t225,00\t173,50\tCu013
6/26/2026\tCu\tClasic\tCu2\t232,00\t177,50\tCu013
6/26/2026\tCu\tVlásenka\tCu4\t162,00\t90,00\tCu012
6/26/2026\tCu\tVlásenka\tCu3\t69,00\t27,50\tCu012
6/26/2026\tAl\tBarevná\tAL8\t139,50\t67,00\t
6/29/2026\tAl\tTrubky\tAL5\t135,00\t68,50\t
6/29/2026\tAl\tČistá\tAL9\t395,00\t323,00\t
6/29/2026\tAl\tBarevná\tAL2\t128,50\t54,50\t
6/30/2026\tAl\tBarevná\tAL4\t231,50\t157,00\t
6/30/2026\tAl\tČistá\tAL3\t215,00\t135,00\t
6/30/2026\tAl\tČistá\tAL7\t209,50\t136,50\t
7/2/2026\tAl\tČistá\tAL13\t209,50\t0\t
7/3/2026\tAl\tBarevná\tAL2\t118,00\t44,00\t
7/3/2026\tAl\tBarevná\tAL8\t108,50\t36,00\t
7/3/2026\tAl\tČistá\tAL9\t405,00\t333,00\t
7/3/2026\tCu\tVlásenka\tCu4\t168,00\t96,00\tCu013
7/3/2026\tCu\tVlásenka\tCu3\t99,00\t57,50\tCu013
7/7/2026\tCu\tClasic\tCu2\t266,00\t211,50\tCu014
7/7/2026\tCu\tClasic\tCu1\t229,00\t177,50\tCu014
7/7/2026\tCu\tDrť\tCu5\t249,00\t204,00\tCu014
7/7/2026\tAl\tČistá\tAL7\t290,50\t217,50\t
7/7/2026\tAl\tČistá\tAL3\t0\t-80,00\t
7/8/2026\tEw\tMonitory, radia a jiný elektroodpad\tEw1\t115,00\t68,50\tEw002
7/8/2026\tFe\tŠrot (kov.pásky a jiný typ kovu)\tFe2\t104,50\t74,50\t
7/10/2026\tAl\tBarevná\tAL2\t119,50\t45,50\t
7/10/2026\tAl\tBarevná\tAL6\t118,00\t38,00\t
7/10/2026\tAl\tBarevná\tAL4\t282,00\t207,50\t
7/10/2026\tAl\tTrubky\tAL5\t136,50\t70,00\tAL003
7/10/2026\tAl\tČistá\tAL9\t99,50\t27,50\t
7/10/2026\tCu\tVlásenka\tCu3\t96,00\t54,50\tCu014`;

// ── Lookup/create helpers ─────────────────────────────────────────────────────
function findOrCreateMaterial(abbr) {
  const normAbbr = abbr.toUpperCase().replace('+', '+');
  let mat = db.get('SELECT * FROM materials WHERE UPPER(abbreviation) = ?', [normAbbr]);
  if (!mat) {
    const names = {
      'AL': 'Hliník', 'CU': 'Měď', 'FE': 'Železo',
      'PB': 'Olovo', 'ZN': 'Zinek', 'NEREZ': 'Nerezová ocel',
      'AL+CU': 'Hliník + Měď', 'EW': 'Elektroodpad', 'KAPALINA': 'Kapalina',
    };
    const name = names[normAbbr] || abbr;
    const r = db.run('INSERT OR IGNORE INTO materials (name, abbreviation) VALUES (?, ?)', [name, abbr]);
    mat = db.get('SELECT * FROM materials WHERE UPPER(abbreviation) = ?', [normAbbr]);
    if (mat) console.log(`  [NEW] Materiál: ${abbr} (${name})`);
  }
  return mat;
}

function findOrCreateType(typeName, materialId) {
  // Normalize for matching
  const n = norm(typeName);
  const all = db.all('SELECT * FROM types WHERE material_id = ?', [materialId]);
  let found = all.find(t => norm(t.name) === n);
  if (!found) {
    db.run('INSERT OR IGNORE INTO types (name, material_id) VALUES (?, ?)', [typeName, materialId]);
    found = db.get('SELECT * FROM types WHERE material_id = ? AND LOWER(name) = LOWER(?)', [materialId, typeName]);
    if (found) console.log(`  [NEW] Typ: "${typeName}" (mat ${materialId})`);
  }
  return found;
}

function findOrCreateBox(boxName, materialId) {
  // Normalize box name (EW1 = Ew1)
  let box = db.get('SELECT * FROM boxes WHERE UPPER(name) = UPPER(?)', [boxName]);
  if (!box) {
    db.run('INSERT OR IGNORE INTO boxes (name, material_id, tare_weight) VALUES (?, ?, 0)', [boxName, materialId]);
    box = db.get('SELECT * FROM boxes WHERE UPPER(name) = UPPER(?)', [boxName]);
    if (box) console.log(`  [NEW] Bedna: ${boxName} (mat ${materialId})`);
  }
  return box;
}

function findOrCreateContainer(name) {
  let con = db.get('SELECT * FROM containers WHERE name = ?', [name]);
  if (!con) {
    db.run('INSERT OR IGNORE INTO containers (name) VALUES (?)', [name]);
    con = db.get('SELECT * FROM containers WHERE name = ?', [name]);
    if (con) console.log(`  [NEW] Kontejner: ${name}`);
  }
  return con;
}

// ── Parse and import ──────────────────────────────────────────────────────────
const lines = RAW.trim().split('\n').filter(l => l.trim());
let imported = 0, skipped = 0;

db.exec('BEGIN');
try {
  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    const [dateRaw, matAbbr, typeName, boxName, bruttoRaw, nettoRaw, locRaw] = cols;

    const date   = parseDate(dateRaw);
    const brutto = parseWeight(bruttoRaw);
    const netto  = parseWeight(nettoRaw);
    const loc    = (locRaw || '').trim();

    // Determine location type and name
    let locType, locName;
    if (loc === 'Box') {
      locType = 'BEDNA'; locName = 'Box';
    } else if (isContainerRef(loc)) {
      findOrCreateContainer(loc);
      locType = 'KONTEJNER'; locName = loc;
    } else {
      locType = 'KONTEJNER'; locName = '–';
    }

    const mat  = findOrCreateMaterial(matAbbr);
    if (!mat) { console.log(`  [SKIP] Materiál "${matAbbr}" nenalezen`); skipped++; continue; }

    const typ  = findOrCreateType(typeName, mat.id);
    if (!typ) { console.log(`  [SKIP] Typ "${typeName}"`); skipped++; continue; }

    const box  = findOrCreateBox(boxName, mat.id);
    if (!box) { console.log(`  [SKIP] Bedna "${boxName}"`); skipped++; continue; }

    db.run(
      `INSERT INTO records (date, material_id, type_id, box_id, brutto_weight, netto_weight, location_type, location_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, mat.id, typ.id, box.id, brutto, netto, locType, locName]
    );
    imported++;
  }
  db.exec('COMMIT');
  console.log(`\n✓ Import hotov: ${imported} záznamů vloženo, ${skipped} přeskočeno.`);
} catch (e) {
  db.exec('ROLLBACK');
  console.error('Import selhal:', e.message);
  process.exit(1);
}
