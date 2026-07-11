import db from './database.js';

export default function seed() {
  const { c } = db.get('SELECT COUNT(*) as c FROM materials');
  if (c > 0) return;

  const materials = [
    { name: 'Hliník',        abbreviation: 'AL'    },
    { name: 'Měď',           abbreviation: 'Cu'    },
    { name: 'Železo',        abbreviation: 'Fe'    },
    { name: 'Olovo',         abbreviation: 'Pb'    },
    { name: 'Zinek',         abbreviation: 'Zn'    },
    { name: 'Nerezová ocel', abbreviation: 'Nerez' },
  ];

  const typesByAbbr = {
    AL:    ['Čistá', 'Barevná'],
    Cu:    ['Clasic', 'Vlasenka', 'Drť', 'Směs'],
    Fe:    ['Čistý', 'Litina', 'Ocel'],
    Pb:    ['Čistý', 'Baterie'],
    Zn:    ['Čistý', 'Slitina'],
    Nerez: ['304', '316'],
  };

  const boxesByAbbr = {
    AL:    ['AL1', 'AL2', 'AL3', 'AL4', 'AL5'],
    Cu:    ['Cu1', 'Cu2', 'Cu3'],
    Fe:    ['Fe1', 'Fe2', 'Fe3'],
    Pb:    ['Pb1', 'Pb2'],
    Zn:    ['Zn1', 'Zn2'],
    Nerez: ['Nr1', 'Nr2'],
  };

  const containers = [
    'Hliník Čistá', 'Hliník Barevná',
    'Měď Clasic', 'Měď Vlasenka', 'Měď Drť', 'Měď Směs',
    'Železo Čistý', 'Železo Litina', 'Železo Ocel',
    'Olovo Čistý', 'Olovo Baterie',
    'Zinek Čistý', 'Nerez 304', 'Nerez 316',
  ];

  db.exec('BEGIN');
  try {
    for (const m of materials) {
      db.run('INSERT OR IGNORE INTO materials (name, abbreviation) VALUES (?, ?)', [m.name, m.abbreviation]);
    }

    for (const [abbr, types] of Object.entries(typesByAbbr)) {
      const mat = db.get('SELECT id FROM materials WHERE abbreviation = ?', [abbr]);
      if (mat) types.forEach(t => db.run('INSERT OR IGNORE INTO types (name, material_id) VALUES (?, ?)', [t, mat.id]));
    }

    for (const [abbr, boxes] of Object.entries(boxesByAbbr)) {
      const mat = db.get('SELECT id FROM materials WHERE abbreviation = ?', [abbr]);
      if (mat) boxes.forEach(b => db.run('INSERT OR IGNORE INTO boxes (name, material_id) VALUES (?, ?)', [b, mat.id]));
    }

    containers.forEach(c => db.run('INSERT OR IGNORE INTO containers (name) VALUES (?)', [c]));

    db.exec('COMMIT');
    console.log('Database seeded.');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
