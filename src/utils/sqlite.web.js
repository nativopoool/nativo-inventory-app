/**
 * Web Mock for SQLite
 * Since expo-sqlite doesn't work out of the box in the browser without extra config,
 * we provide a mock that prevents the app from crashing.
 * In a future phase, we could implement this using IndexedDB or AsyncStorage.
 */

const mockDb = {
  execSync: (sql) => {
    console.log('[SQLite-Web-Mock] execSync:', sql);
    return [];
  },
  runSync: (sql, params) => {
    console.log('[SQLite-Web-Mock] runSync:', sql, params);
    return { lastInsertRowId: 0, changes: 0 };
  },
  getFirstSync: (sql, params) => {
    console.log('[SQLite-Web-Mock] getFirstSync:', sql, params);
    return null;
  },
  getAllSync: (sql, params) => {
    console.log('[SQLite-Web-Mock] getAllSync:', sql, params);
    return [];
  },
  closeSync: () => {}
};

export const getDb = () => {
  console.warn('[SQLite] Web environment detected. Using mock database.');
  return mockDb;
};

export const initDb = () => {
  console.log('[SQLite] Web Mock: Initializing tables (noop)...');
};
