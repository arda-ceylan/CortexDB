// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { getDbConnection } from '../db/connection.js';
import { logActivity } from '../db/schema.js';
import { searchPatternIndex } from '../search/memoryIndex.js';
import { getConfig } from '../config.js';
import type { CodePattern } from '../types.js';

export interface StorePatternArgs {
  name: string;
  language: string;
  snippet: string;
  description?: string;
}

export async function handleStorePattern(args: StorePatternArgs): Promise<string> {
  if (!args.name || !args.name.trim()) {
    return '[Error] Parameter "name" is required and cannot be empty.';
  }
  if (!args.snippet || !args.snippet.trim()) {
    return '[Error] Parameter "snippet" is required and cannot be empty.';
  }

  const config = getConfig();
  const { limits } = config;

  if (args.name.length > limits.maxNameLength) {
    return `[Error] Parameter "name" length (${args.name.length} chars) exceeds the maximum allowed limit of ${limits.maxNameLength} chars.`;
  }

  if (args.snippet.length > limits.maxPatternSnippetLength) {
    return `[Error] Parameter "snippet" length (${args.snippet.length.toLocaleString('en-US')} chars) exceeds the maximum allowed limit of ${limits.maxPatternSnippetLength.toLocaleString('en-US')} chars. Please modularize the template or increase "maxPatternSnippetLength" in ~/.cortexdb/config.json.`;
  }

  if (args.description && args.description.length > limits.maxPatternDescriptionLength) {
    return `[Error] Parameter "description" length (${args.description.length.toLocaleString('en-US')} chars) exceeds the maximum allowed limit of ${limits.maxPatternDescriptionLength.toLocaleString('en-US')} chars.`;
  }

  if (args.language && args.language.length > 50) {
    return `[Error] Parameter "language" length (${args.language.length} chars) exceeds the maximum allowed limit of 50 chars.`;
  }

  const db = getDbConnection();
  const normalizedLanguage = (args.language || 'text').trim().toLowerCase();

  const saveTx = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO code_patterns (name, language, snippet, description)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        language = excluded.language,
        snippet = excluded.snippet,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(args.name.trim(), normalizedLanguage, args.snippet, args.description || '');

    const row = db.prepare('SELECT id FROM code_patterns WHERE name = ? COLLATE NOCASE').get(args.name.trim()) as { id: number };
    return row.id;
  });

  saveTx();

  logActivity('PATTERN_STORED', `Stored/updated pattern "${args.name}" (${normalizedLanguage})`);

  return `[Success] Code pattern "${args.name}" (${normalizedLanguage}) has been securely saved/updated in the shared global pattern library.`;
}

export interface GetPatternArgs {
  query: string; // Template name, language, or search query
  language?: string;
  limit?: number | string;
}

export async function handleGetPattern(args: GetPatternArgs): Promise<string> {
  const query = (args.query || '').trim();
  if (!query) {
    return '[Error] Please provide a non-empty search query.';
  }

  const config = getConfig();
  const maxQueryLength = config.limits.maxSearchQueryLength || 1000;
  if (query.length > maxQueryLength) {
    return `[Error] Search query length (${query.length} chars) exceeds the maximum allowed limit of ${maxQueryLength.toLocaleString('en-US')} chars.`;
  }

  const limit = Math.min(Math.max(1, Number(args.limit) || 5), 50);

  // 1. First, attempt ultra-fast SQLite FTS5 search
  const ftsResults = await searchPatternIndex({
    query: args.query,
    language: args.language,
    limit
  });

  if (ftsResults.length > 0) {
    const formatted = ftsResults.map(r => {
      return `### [Pattern #${r.dbId}: ${r.name}] (${r.language})\nDescription: ${r.description || 'No description provided.'}\n\`\`\`${r.language}\n${r.snippet}\n\`\`\``;
    }).join('\n\n');

    return `Retrieved Central Code Patterns:\n\n${formatted}`;
  }

  // 2. Fallback to SQLite query if RAM search returned empty
  const db = getDbConnection();
  let sql = `
    SELECT * FROM code_patterns 
    WHERE (name LIKE ? OR language LIKE ? OR description LIKE ? OR snippet LIKE ?)
  `;
  const q = `%${args.query}%`;
  const queryParams: (string | number)[] = [q, q, q, q];

  if (args.language && args.language.trim() !== '' && args.language.toUpperCase() !== 'ALL') {
    sql += ` AND language = ? COLLATE NOCASE`;
    queryParams.push(args.language.trim().toLowerCase());
  }

  sql += ` LIMIT ?`;
  queryParams.push(limit);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...queryParams) as CodePattern[];

  if (rows.length === 0) {
    return `No matching code pattern found in the central library for query: "${args.query}".`;
  }

  const formatted = rows.map(r => {
    return `### [Pattern #${r.id}: ${r.name}] (${r.language})\nDescription: ${r.description || 'No description provided.'}\n\`\`\`${r.language}\n${r.snippet}\n\`\`\``;
  }).join('\n\n');

  return `Retrieved Central Code Patterns:\n\n${formatted}`;
}
