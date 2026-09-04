// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import os from 'node:os';
import path from 'node:path';
import { getDbConnection } from '../db/connection.js';
import type { ProjectContext } from '../types.js';

export type { ProjectContext };

/**
 * Enhanced Project Detection Engine.
 * Resolves repository context by prioritizing explicit agent override parameters (customName, customPath),
 * standard environment workspace variables, and fallback to process.cwd().
 */
export function detectOrCreateProject(customPath?: string, customName?: string): ProjectContext {
  const trimmedName = customName?.trim() || undefined;
  const trimmedPath = customPath?.trim() || undefined;
  const rawPath = trimmedPath || process.env.WORKSPACE_DIR || process.env.INIT_CWD || process.env.PROJECT_CWD || process.cwd();
  let resolvedPath = path.resolve(rawPath);
  if (os.platform() === 'win32') {
    resolvedPath = resolvedPath.replace(/\\/g, '/');
  }
  const derivedName = trimmedName || path.basename(resolvedPath) || 'root-workspace';

  const db = getDbConnection();

  // 1. If explicit customName is provided, search primarily by name first
  if (trimmedName) {
    const byNameStmt = db.prepare(`SELECT * FROM projects WHERE name = ? COLLATE NOCASE`);
    const existingByName = byNameStmt.get(trimmedName) as ProjectContext | undefined;
    if (existingByName) {
      // If path changed or was updated explicitly, align root_path in storage safely
      if (trimmedPath && existingByName.root_path.toLowerCase() !== resolvedPath.toLowerCase()) {
        try {
          db.prepare(`UPDATE projects SET root_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(resolvedPath, existingByName.id);
          existingByName.root_path = resolvedPath;
        } catch (e) {
          // If another project already holds this path, prioritize existing record
        }
      }
      return existingByName;
    }
  }

  // 2. Otherwise, check if project already exists by directory root_path (Case-Insensitive for Windows)
  const selectStmt = db.prepare(`SELECT * FROM projects WHERE root_path = ? COLLATE NOCASE`);
  const existingByPath = selectStmt.get(resolvedPath) as ProjectContext | undefined;

  if (existingByPath) {
    if (trimmedName && existingByPath.name.toLowerCase() !== trimmedName.toLowerCase()) {
      try {
        db.prepare(`UPDATE projects SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(trimmedName, existingByPath.id);
        existingByPath.name = trimmedName;
      } catch (e) {}
    }
    return existingByPath;
  }

  // 3. If neither name nor path matched, automatically register a brand new project record
  let suffix = 0;
  while (suffix < 1000) {
    const finalName = suffix === 0 ? derivedName : `${derivedName}-${suffix}`;
    try {
      const insertStmt = db.prepare(`
        INSERT INTO projects (name, root_path, tech_stack, description)
        VALUES (?, ?, ?, ?)
      `);

      const result = insertStmt.run(finalName, resolvedPath, '', '');

      return {
        id: Number(result.lastInsertRowid),
        name: finalName,
        root_path: resolvedPath,
        tech_stack: '',
        description: ''
      };
    } catch (err: unknown) {
      // Fallback in case of a race condition on unique root_path
      const fallback = selectStmt.get(resolvedPath) as ProjectContext | undefined;
      if (fallback) return fallback;
      
      const errMsg = err instanceof Error ? err.message : String(err);
      // If error is due to UNIQUE constraint on 'name', try appending a suffix
      if (errMsg.includes('UNIQUE constraint failed: projects.name')) {
        suffix++;
        continue;
      }
      
      throw err;
    }
  }

  throw new Error(`Failed to register unique project name after 1,000 attempts for: ${derivedName}`);
}

export function updateProjectMetadata(projectId: number, techStack?: string, description?: string): void {
  const db = getDbConnection();
  if (techStack !== undefined) {
    db.prepare(`UPDATE projects SET tech_stack = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(String(techStack).trim(), projectId);
  }
  if (description !== undefined) {
    db.prepare(`UPDATE projects SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(String(description).trim(), projectId);
  }
}
