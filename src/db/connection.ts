// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { getConfig, CortexConfig } from '../config.js';

let dbInstance: DatabaseType | null = null;
let currentDbPath: string | null = null;

export function getDbConnection(customConfig?: CortexConfig): DatabaseType {
  if (!customConfig && dbInstance) {
    return dbInstance;
  }

  const config = customConfig || getConfig();

  if (dbInstance && currentDbPath === config.dbPath) {
    return dbInstance;
  }

  if (dbInstance) {
    try {
      // Lightweight routine optimization before closing connection
      dbInstance.pragma('optimize');
    } catch (e) {}
    dbInstance.close();
    dbInstance = null;
  }

  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(config.dbPath, {
    timeout: 5000,
    verbose: config.logLevel === 'debug' ? (msg) => console.error('[SQLite Debug]', msg) : undefined
  });

  currentDbPath = config.dbPath;

  // Apply PRAGMA performance, WAL mode, and RAM mmap settings safely with whitelisting
  const ALLOWED_JOURNALS = ['WAL', 'DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'OFF'];
  const ALLOWED_SYNCHRONOUS = ['OFF', 'NORMAL', 'FULL', 'EXTRA', '0', '1', '2', '3'];
  const ALLOWED_TEMP_STORE = ['DEFAULT', 'FILE', 'MEMORY', '0', '1', '2'];

  const journalModeStr = String(config.pragma.journalMode).toUpperCase();
  const journalMode = ALLOWED_JOURNALS.includes(journalModeStr)
    ? journalModeStr
    : 'WAL';

  const synchronousStr = String(config.pragma.synchronous).toUpperCase();
  const synchronous = ALLOWED_SYNCHRONOUS.includes(synchronousStr)
    ? synchronousStr
    : 'NORMAL';

  const tempStoreStr = String(config.pragma.tempStore).toUpperCase();
  const tempStore = ALLOWED_TEMP_STORE.includes(tempStoreStr)
    ? tempStoreStr
    : 'MEMORY';

  const cacheSize = Number.isInteger(config.pragma.cacheSize) ? config.pragma.cacheSize : -262144;
  const mmapSize = Number.isInteger(config.pragma.mmapSize) ? config.pragma.mmapSize : 2147483648;

  dbInstance.pragma(`journal_mode = ${journalMode}`);
  dbInstance.pragma(`synchronous = ${synchronous}`);
  dbInstance.pragma(`cache_size = ${cacheSize}`);
  dbInstance.pragma(`mmap_size = ${mmapSize}`);
  dbInstance.pragma(`temp_store = ${tempStore}`);
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('recursive_triggers = ON');
  dbInstance.pragma('busy_timeout = 5000');

  // Routine autonomous optimization on connection init
  try {
    dbInstance.pragma('optimize');
  } catch (e) {}

  return dbInstance;
}

export function closeDbConnection(): void {
  if (dbInstance) {
    try {
      dbInstance.pragma('optimize');
    } catch (e) {}
    dbInstance.close();
    dbInstance = null;
    currentDbPath = null;
  }
}
