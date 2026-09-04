// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { getDbConnection } from '../db/connection.js';
import type { MemoryType } from '../types.js';

export interface MemoryIndexItem {
  id?: string;
  dbId: string;
  projectId: string;
  projectName: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string;
}

export interface PatternIndexItem {
  id?: string;
  dbId: string;
  name: string;
  language: string;
  snippet: string;
  description: string;
}

export interface SearchOptions {
  query: string;
  projectName?: string; // Target project name, 'GLOBAL', or 'ALL'
  type?: string;        // 'decision', 'bugfix', etc., or 'ALL'
  limit?: number | string;
}

export interface PatternSearchOptions {
  query: string;
  language?: string;
  limit?: number;
}

/**
 * Sanitizes raw search queries for SQLite FTS5 syntax safety.
 * Strips special operators and converts words to quoted prefix tokens ("word"*).
 */
export function sanitizeFtsQuery(rawQuery: string, operator: 'AND' | 'OR' = 'AND'): string {
  const words = rawQuery
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length === 0) return '""';

  return words.map(w => `"${w}"*`).join(` ${operator} `);
}

/**
 * Native SQLite FTS5 BM25-ranked full-text search across past memories.
 * Operates in sub-milliseconds via SQLite virtual memory-mapped space (mmap_size).
 * Column weights: Title (5.0x), Content (1.0x), Tags (2.5x).
 */
export async function searchMemoryIndex(options: SearchOptions): Promise<MemoryIndexItem[]> {
  const db = getDbConnection();
  const rawQuery = (options.query || '').trim();
  if (!rawQuery) return [];

  const targetLimit = Math.min(Math.max(1, Number(options.limit) || 10), 100);
  const normalizedType = options.type ? (options.type.toUpperCase() === 'ALL' ? 'ALL' : options.type.toLowerCase()) : 'ALL';

  const runQuery = (ftsExpr: string): MemoryIndexItem[] => {
    let sql = `
      SELECT 
        m.id as dbId,
        COALESCE(m.project_id, 'GLOBAL') as projectId,
        m.type,
        m.title,
        m.content,
        m.tags,
        COALESCE(p.name, 'GLOBAL') as projectName,
        bm25(memory_entries_fts, 5.0, 1.0, 2.5) as rank
      FROM memory_entries_fts fts
      JOIN memory_entries m ON fts.rowid = m.id
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE memory_entries_fts MATCH ?
    `;

    const params: (string | number)[] = [ftsExpr];

    // Project Scoping
    if (options.projectName && options.projectName.toUpperCase() === 'GLOBAL') {
      sql += ` AND m.project_id IS NULL`;
    } else if (options.projectName && options.projectName.toUpperCase() !== 'ALL') {
      sql += ` AND (p.name = ? COLLATE NOCASE OR m.project_id IS NULL)`;
      params.push(options.projectName);
    }

    // Memory Category Filtering
    if (normalizedType !== 'ALL') {
      sql += ` AND m.type = ? COLLATE NOCASE`;
      params.push(normalizedType);
    }

    sql += ` ORDER BY rank ASC, m.id DESC LIMIT ?`;
    params.push(targetLimit);

    try {
      const rows = db.prepare(sql).all(...params) as Array<{
        dbId: number;
        projectId: string | number;
        type: MemoryType;
        title: string;
        content: string;
        tags: string;
        projectName: string;
      }>;

      return rows.map(r => ({
        dbId: r.dbId.toString(),
        projectId: r.projectId.toString(),
        type: r.type,
        title: r.title,
        content: r.content,
        tags: r.tags || '',
        projectName: r.projectName
      }));
    } catch (e) {
      return [];
    }
  };

  // 1. Try strict AND prefix search first for highest precision
  let results = runQuery(sanitizeFtsQuery(rawQuery, 'AND'));

  // 2. If no matches, fall back to OR prefix search for broader recall
  if (results.length === 0) {
    results = runQuery(sanitizeFtsQuery(rawQuery, 'OR'));
  }

  return results;
}

/**
 * Native SQLite FTS5 BM25-ranked full-text search across the central code pattern library.
 */
export async function searchPatternIndex(options: PatternSearchOptions): Promise<PatternIndexItem[]> {
  const db = getDbConnection();
  const rawQuery = (options.query || '').trim();
  if (!rawQuery) return [];

  const targetLimit = options.limit || 5;

  const runQuery = (ftsExpr: string): PatternIndexItem[] => {
    let sql = `
      SELECT 
        cp.id as dbId,
        cp.name,
        cp.language,
        cp.snippet,
        cp.description,
        bm25(code_patterns_fts, 10.0, 2.0, 1.0, 3.0) as rank
      FROM code_patterns_fts fts
      JOIN code_patterns cp ON fts.rowid = cp.id
      WHERE code_patterns_fts MATCH ?
    `;

    const params: (string | number)[] = [ftsExpr];

    if (options.language && options.language.toUpperCase() !== 'ALL') {
      sql += ` AND cp.language = ? COLLATE NOCASE`;
      params.push(options.language.toLowerCase());
    }

    sql += ` ORDER BY rank ASC, cp.id DESC LIMIT ?`;
    params.push(targetLimit);

    try {
      const rows = db.prepare(sql).all(...params) as Array<{
        dbId: number;
        name: string;
        language: string;
        snippet: string;
        description: string;
      }>;

      return rows.map(r => ({
        dbId: r.dbId.toString(),
        name: r.name,
        language: r.language,
        snippet: r.snippet,
        description: r.description || ''
      }));
    } catch (e) {
      return [];
    }
  };

  // 1. Try strict AND prefix search first
  let results = runQuery(sanitizeFtsQuery(rawQuery, 'AND'));

  // 2. If no matches, fall back to OR prefix search
  if (results.length === 0) {
    results = runQuery(sanitizeFtsQuery(rawQuery, 'OR'));
  }

  return results;
}
