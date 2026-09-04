// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { getDbConnection } from '../db/connection.js';
import { logActivity } from '../db/schema.js';
import type { RecordType, MemoryType } from '../types.js';

export interface DeleteRecordArgs {
  type: RecordType | string;
  id: number | string;
}

export async function handleDeleteRecord(args: DeleteRecordArgs): Promise<string> {
  if (args.id === undefined || args.id === null || String(args.id).trim() === '') {
    return '[Error] You must provide a valid numeric "id" to delete a record. Name-based wildcard deletion has been removed to prevent accidental data loss.';
  }

  const numericId = Number(args.id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return `[Error] You must provide a valid positive numeric "id" to delete a record (received: "${args.id}").`;
  }

  const normalizedType = (args.type || '').trim().toLowerCase();
  const db = getDbConnection();

  if (normalizedType === 'memory') {
    const selectStmt = db.prepare('SELECT title, type FROM memory_entries WHERE id = ?');
    const row = selectStmt.get(numericId) as { title: string; type: MemoryType } | undefined;
    
    if (!row) {
      return `[Warning] Memory record #${numericId} was not found in SQLite storage. Nothing deleted.`;
    }

    const deleteStmt = db.prepare('DELETE FROM memory_entries WHERE id = ?');
    deleteStmt.run(numericId);

    logActivity('RECORD_DELETED', `Deleted memory entry #${numericId} (${row.type.toUpperCase()}): "${row.title}"`);

    return `🗑️ [Success] Memory record #${numericId} ("${row.title}") has been permanently deleted from SQLite storage and purged from the search index.`;
  } else if (normalizedType === 'pattern') {
    const selectStmt = db.prepare('SELECT name, language FROM code_patterns WHERE id = ?');
    const row = selectStmt.get(numericId) as { name: string; language: string } | undefined;

    if (!row) {
      return `[Warning] Code pattern #${numericId} not found in central repository library.`;
    }

    db.prepare('DELETE FROM code_patterns WHERE id = ?').run(numericId);

    logActivity('PATTERN_DELETED', `Deleted code pattern #${numericId}: "${row.name}" (${row.language})`);

    return `🗑️ [Success] Code pattern #${numericId} ("${row.name}" - ${row.language}) permanently deleted from the central repository library and purged from search index.`;
  }

  return `[Error] Invalid deletion parameters specified. 'type' must be 'memory' or 'pattern'.`;
}
