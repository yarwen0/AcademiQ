/**
 * storage.ts — sql.js SQLite wrapper for local draft persistence.
 *
 * Why sql.js + IndexedDB?
 *   - sql.js runs SQLite entirely in the browser as a WASM binary.
 *   - The in-memory database is serialised to IndexedDB on every save so that
 *     drafts survive page reloads without requiring a network round-trip.
 *   - This is purely local — no draft content is sent to the server.
 *   - The database is NOT encrypted; it is a UX feature, not a security store.
 *     Users should not rely on drafts for sensitive content.
 *
 * SECURITY NOTE:
 *   - We never store JWT tokens, passwords, or any auth material here.
 *   - Draft content is user-typed text; XSS sanitization happens at render time,
 *     not at storage time. Raw content is stored and sanitized on display.
 */

import * as sqlModule from 'sql.js';
const initSqlJs = sqlModule.default;
import { type Database, type SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const IDB_DB_NAME = 'academiq_drafts';
const IDB_STORE_NAME = 'sqlite_db';
const IDB_KEY = 'db_bytes';

let _SQL: SqlJsStatic | null = null;
let _db: Database | null = null;

// ---- Initialise sql.js ----
async function getSql(): Promise<SqlJsStatic> {
  if (_SQL) return _SQL;
  _SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  return _SQL;
}

// ---- IndexedDB helpers ----
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBytesFromIDB(): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE_NAME, 'readonly');
    const store = tx.objectStore(IDB_STORE_NAME);
    const req = store.get(IDB_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveBytesToIDB(bytes: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    const req = store.put(bytes, IDB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---- Database initialisation ----
async function getDb(): Promise<Database> {
  if (_db) return _db;

  const SQL = await getSql();
  const existing = await loadBytesFromIDB();

  if (existing) {
    _db = new SQL.Database(existing);
  } else {
    _db = new SQL.Database();
  }

  // Ensure the drafts table exists.
  _db.run(`
    CREATE TABLE IF NOT EXISTS drafts (
      key       TEXT PRIMARY KEY,
      content   TEXT NOT NULL,
      saved_at  INTEGER NOT NULL
    );
  `);

  return _db;
}

// ---- Public API ----

/** Persist the current in-memory SQLite state to IndexedDB. */
async function flush(): Promise<void> {
  if (!_db) return;
  const bytes = _db.export();
  await saveBytesToIDB(bytes);
}

/** Save or update a draft. Auto-flushes to IndexedDB. */
export async function saveDraft(key: string, content: string): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO drafts (key, content, saved_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET content=excluded.content, saved_at=excluded.saved_at`,
    [key, content, Date.now()],
  );
  await flush();
}

/** Load a draft by key. Returns null if none exists. */
export async function loadDraft(key: string): Promise<string | null> {
  const db = await getDb();
  const results = db.exec(
    'SELECT content FROM drafts WHERE key = ? LIMIT 1',
    [key],
  );
  if (results.length === 0 || results[0].values.length === 0) return null;
  return results[0].values[0][0] as string;
}

/** Delete a draft (call after successful submission). */
export async function deleteDraft(key: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM drafts WHERE key = ?', [key]);
  await flush();
}

/** List all stored draft keys and their timestamps. */
export async function listDrafts(): Promise<Array<{ key: string; savedAt: number }>> {
  const db = await getDb();
  const results = db.exec('SELECT key, saved_at FROM drafts ORDER BY saved_at DESC');
  if (results.length === 0) return [];
  return results[0].values.map(([key, savedAt]) => ({
    key: key as string,
    savedAt: savedAt as number,
  }));
}
