// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import { getDbConnection } from './connection.js';
import { initializeSchema, logActivity } from './schema.js';
import { getConfig } from '../config.js';

export interface OptimizationReport {
  beforeSize: number;
  afterSize: number;
  freedBytes: number;
  details: string[];
}

function getFileSize(filePath: string): number {
  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath).size;
  }
  return 0;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Byte';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Performs SQLite maintenance by checking write-ahead logs (WAL checkpointing),
 * defragmenting disk storage via VACUUM, and calculating query planner statistics via ANALYZE.
 * Automatically initializes tables and schema on first run (day-zero bootstrap).
 */
export function optimizeDatabase(deep: boolean = true): OptimizationReport {
  const config = getConfig();
  const dbPath = config.dbPath;
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  const beforeSize = getFileSize(dbPath) + getFileSize(walPath) + getFileSize(shmPath);
  const details: string[] = [];

  // Open connection and initialize schema if database is totally empty or missing
  const db = getDbConnection();
  initializeSchema();
  if (beforeSize === 0) {
    details.push('[Bootstrap] No existing database detected; initialized a pristine global memory database and sealed all base schema tables.');
  }

  // 1. Checkpoint and merge open Write-Ahead Logs (WAL) into the main database file, resetting .wal storage
  try {
    const walResult = db.pragma('wal_checkpoint(TRUNCATE)');
    details.push(`[WAL Checkpoint] Successfully flushed write logs into primary storage and truncated temporary WAL cache (${JSON.stringify(walResult)}).`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`[WAL Checkpoint Warning] Encountered minor warning during WAL checkpoint: ${msg}`);
  }

  // 2. Housekeeping: Trim historical activity logs if exceeding retention limit (keep latest 5,000 entries)
  try {
    const totalLogs = (db.prepare('SELECT COUNT(*) as count FROM activity_logs').get() as { count: number }).count;
    if (totalLogs > 5000) {
      const deleteResult = db.prepare(`
        DELETE FROM activity_logs 
        WHERE id <= (
          SELECT id FROM activity_logs ORDER BY id DESC LIMIT 1 OFFSET 5000
        )
      `).run();
      details.push(`[Housekeeping] Purged ${deleteResult.changes} historical audit log records (retention limit: 5,000 active entries).`);
    } else {
      details.push(`[Housekeeping] Audit logs within healthy retention bounds (${totalLogs} / 5,000 entries).`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`[Housekeeping Warning] Failed to trim activity logs: ${msg}`);
  }

  // 3. Deep Defragmentation and Query Planner Optimization (VACUUM & ANALYZE)
  if (deep) {
    try {
      db.exec('VACUUM;');
      details.push('[VACUUM] Database file defragmented successfully; reclaimed orphaned storage frames and aligned data blocks sequentially.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      details.push(`[VACUUM Error] VACUUM skipped due to active lock or error: ${msg}`);
    }

    try {
      db.exec('ANALYZE;');
      details.push('[ANALYZE] Updated B-Tree query optimizer histograms. Search execution routes aligned to maximum velocity.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      details.push(`[ANALYZE Error] ANALYZE skipped: ${msg}`);
    }

    try {
      db.exec(`INSERT INTO memory_entries_fts(memory_entries_fts) VALUES('optimize');`);
      db.exec(`INSERT INTO code_patterns_fts(code_patterns_fts) VALUES('optimize');`);
      details.push('[FTS5 Optimize] Merged full-text search index segments into a single unified B-tree.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      details.push(`[FTS5 Optimize Warning] FTS5 optimize skipped: ${msg}`);
    }
  }

  // 4. Routine autonomous SQLite optimization pragma
  db.pragma('optimize');
  details.push('[PRAGMA optimize] Triggered autonomous SQLite index health verification.');

  const afterSize = getFileSize(dbPath) + getFileSize(walPath) + getFileSize(shmPath);
  const freedBytes = Math.max(0, beforeSize - afterSize);

  details.push(`[Summary] Size before: ${formatBytes(beforeSize)}, Size after: ${formatBytes(afterSize)} (Storage savings: ${formatBytes(freedBytes)}).`);

  logActivity('DATABASE_OPTIMIZED', `Maintenance completed (Freed: ${formatBytes(freedBytes)}, Final size: ${formatBytes(afterSize)})`);

  return {
    beforeSize,
    afterSize,
    freedBytes,
    details
  };
}
