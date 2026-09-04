// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { getDbConnection } from '../db/connection.js';
import { detectOrCreateProject } from '../context/autoDetect.js';
import { logActivity } from '../db/schema.js';
import { getConfig } from '../config.js';
import { VALID_MEMORY_TYPES, VALID_SCOPES } from '../types.js';
import type { MemoryType, MemoryScope } from '../types.js';

export interface RememberDecisionArgs {
  id?: number | string; // Optional ID for in-place updates of existing entries
  projectName?: string; // Optional explicit project repository name override
  projectPath?: string; // Optional explicit workspace root path override
  type: MemoryType | string;
  title: string;
  content: string;
  tags?: string;
  scope?: MemoryScope | string;
}

export async function handleRememberDecision(args: RememberDecisionArgs): Promise<string> {
  const title = (args.title || '').trim();
  const content = (args.content || '').trim();
  const tags = (args.tags || '').trim();

  if (!title) {
    return '[Error] Parameter "title" is required and cannot be empty.';
  }
  if (!content) {
    return '[Error] Parameter "content" is required and cannot be empty.';
  }

  const rawType = args.type ? String(args.type).toLowerCase().trim() : '';
  if (!VALID_MEMORY_TYPES.includes(rawType as MemoryType)) {
    return `[Error] Invalid memory category "${args.type}". Allowed categories are: ${VALID_MEMORY_TYPES.join(', ')}.`;
  }
  const type = rawType as MemoryType;

  const config = getConfig();
  const { limits } = config;

  if (title.length > limits.maxTitleLength) {
    return `[Error] Parameter "title" length (${title.length} chars) exceeds the maximum allowed limit of ${limits.maxTitleLength} chars. Please provide a more concise title.`;
  }

  if (content.length > limits.maxContentLength) {
    return `[Error] Parameter "content" length (${content.length.toLocaleString('en-US')} chars) exceeds the maximum allowed limit of ${limits.maxContentLength.toLocaleString('en-US')} chars. Please condense your reasoning, split your code into smaller focused modules, or increase "maxContentLength" in ~/.cortexdb/config.json.`;
  }

  if (tags && tags.length > limits.maxTagsLength) {
    return `[Error] Parameter "tags" length (${tags.length} chars) exceeds the maximum allowed limit of ${limits.maxTagsLength} chars.`;
  }

  const rawScope = String(args.scope || 'PROJECT').toUpperCase().trim();
  if (!VALID_SCOPES.includes(rawScope as MemoryScope)) {
    return `[Error] Invalid scope "${args.scope}". Allowed scopes are: ${VALID_SCOPES.join(', ')}.`;
  }
  const scope = rawScope as MemoryScope;

  const db = getDbConnection();
  
  let projectId: number | null = null;
  let projectName = 'GLOBAL';

  if (scope === 'PROJECT') {
    const project = detectOrCreateProject(args.projectPath, args.projectName);
    projectId = project.id;
    projectName = project.name;
  }

  // If ID is specified, perform an in-place update rather than a new insertion
  if (args.id !== undefined && args.id !== null && String(args.id).trim() !== '') {
    const numericId = Number(args.id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return `[Error] Invalid ID "${args.id}". The 'id' parameter must be a valid positive numeric database ID (e.g. 14).`;
    }

    const updateTx = db.transaction(() => {
      const selectStmt = db.prepare('SELECT id FROM memory_entries WHERE id = ?');
      const existing = selectStmt.get(numericId);

      if (!existing) {
        return null;
      }

      const updateStmt = db.prepare(`
        UPDATE memory_entries 
        SET project_id = ?, type = ?, title = ?, content = ?, tags = ?
        WHERE id = ?
      `);

      updateStmt.run(
        projectId,
        type,
        title,
        content,
        tags,
        numericId
      );

      return numericId;
    });

    const updatedId = updateTx();

    if (!updatedId) {
      return `[Error] No existing memory record found with ID #${numericId}. Note: The 'id' parameter is strictly reserved for updating an existing record. If you intended to create a brand new memory entry, please invoke this tool without passing the 'id' parameter.`;
    }

    logActivity('RECORD_UPDATED', `Updated memory entry #${numericId} (${type.toUpperCase()}) [${projectName}]: "${title}"`);

    return `[Success] Memory entry #${numericId} (${type.toUpperCase()}) has been successfully updated in-place and resynchronized with the search index under scope '${projectName}'.`;
  }

  // Otherwise, perform a standard creation of a new memory entry
  let newId: string;

  const insertTx = db.transaction(() => {
    const insertStmt = db.prepare(`
      INSERT INTO memory_entries (project_id, type, title, content, tags)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      projectId,
      type,
      title,
      content,
      tags
    );

    return result.lastInsertRowid.toString();
  });

  newId = insertTx();

  logActivity('RECORD_CREATED', `Created memory entry #${newId} (${type.toUpperCase()}) [${projectName}]: "${title}"`);

  return `[Success] Memory entry #${newId} (${type.toUpperCase()}) recorded under scope '${projectName}' and synchronized to the high-speed search index.`;
}
