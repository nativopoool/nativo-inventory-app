import * as SQLite from 'expo-sqlite';

let _db = null;

export const getDb = () => {
  if (!_db) {
    try {
      console.log('[SQLite]: Opening database synchronously...');
      _db = SQLite.openDatabaseSync('mebot_inventory.db');
    } catch (e) {
      console.error('[SQLite]: FATAL ERROR opening database', e);
      _db = null; // Marcamos como nulo para que el resto de la app sepa que no hay persistencia
      throw e; // Volvemos a lanzar para que SafeBoot lo capture si es necesario
    }
  }
  return _db;
};

// Exporting getter as 'db' proxy for backward compatibility if possible
// or just using getDb() everywhere. For safety, we'll use an initialization function.

export const initDb = () => {
  const db = getDb();
  console.log('[SQLite]: Initializing tables...');
  db.execSync(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      mode TEXT,
      icon TEXT,
      sku TEXT,
      name TEXT,
      stockBefore INTEGER,
      stockAfter INTEGER,
      qty INTEGER,
      action TEXT,
      price REAL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      retries INTEGER DEFAULT 0,
      lastError TEXT
    );
  `);

  // Migration for existing users
  try {
    db.execSync("ALTER TABLE scans ADD COLUMN price REAL;");
  } catch(e) {
    // Column probably exists or table doesn't exist yet (though CREATE TABLE handled it)
  }
};
