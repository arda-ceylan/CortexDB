#!/usr/bin/env node

// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { getDbConnection, closeDbConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { handleSearchKnowledge } from '../tools/searchKnowledge.js';
import { handleGetPattern } from '../tools/codePatterns.js';
import { handleDeleteRecord } from '../tools/deleteRecord.js';
import { optimizeDatabase } from '../db/optimization.js';
import type { MemoryType, RecordType } from '../types.js';

function printHeader() {
  console.log('====================================================================');
  console.log('      CORTEXDB - TERMINAL ADMINISTRATOR COMMAND CENTER');
  console.log('====================================================================\n');
}

function printHelp() {
  printHeader();
  console.log('Usage: cortex <command> [arguments]\n');
  console.log('Available Commands:');
  console.log('  projects                        List all tracked workspace projects and their total memory records');
  console.log('  memories [project-name|GLOBAL]  View stored architectural decisions, bugfixes, and global rules');
  console.log('  patterns [query]                View or search the central developer code pattern library');
  console.log('  search <query>                  Execute high-speed SQLite FTS5 search across all repositories');
  console.log('  history [limit]                 Display recent audit history of memory and system operations');
  console.log('  rename-project <target> <name>  Rename a tracked project and optionally update its directory path');
  console.log('  delete-project <name-or-id>     Permanently wipe a project and ALL its local memory records');
  console.log('  delete-record <type> <id>       Delete a specific entry or pattern by its numeric ID (type: memory | pattern)');
  console.log('  optimize                        Run deep storage defragmentation (VACUUM, ANALYZE, WAL Truncation)');
  console.log('  help                            Show this help menu\n');
  console.log('Examples:');
  console.log('  cortex projects');
  console.log('  cortex history 25');
  console.log('  cortex patterns jwt');
  console.log('  cortex memories Ecommerce_Platform');
  console.log('  cortex delete-project Ecommerce_Platform');
  console.log('  cortex delete-record memory 14');
  console.log('  cortex delete-record pattern 3');
}

async function runCli() {
  const args = process.argv.slice(2);
  const command = (args[0] || 'help').toLowerCase();

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  initializeSchema();
  printHeader();
  const db = getDbConnection();

  try {
    if (command === 'history') {
      const limit = Math.min(Math.max(1, Number(args[1]) || 20), 500);
      const rows = db.prepare(`
        SELECT id, action, details, created_at
        FROM activity_logs
        ORDER BY id DESC
        LIMIT ?
      `).all(limit) as Array<{
        id: number;
        action: string;
        details: string | null;
        created_at: string;
      }>;

      if (rows.length === 0) {
        console.log('No activity logs recorded yet.');
        return;
      }

      console.log(`Activity Audit History (Last ${rows.length} operations):\n`);
      rows.forEach(log => {
        console.log(`⏱️ [#${log.id}] [${log.created_at}] - ${log.action}`);
        if (log.details) console.log(`   Details: ${log.details}`);
        console.log('--------------------------------------------------------------------');
      });
    } else if (command === 'projects') {
      const rows = db.prepare(`
        SELECT p.id, p.name, p.root_path, p.tech_stack, p.description, COUNT(m.id) as memory_count
        FROM projects p
        LEFT JOIN memory_entries m ON p.id = m.project_id
        GROUP BY p.id
        ORDER BY p.name ASC
      `).all() as Array<{
        id: number;
        name: string;
        root_path: string;
        tech_stack: string;
        description: string;
        memory_count: number;
      }>;

      if (rows.length === 0) {
        console.log('No projects tracked in CortexDB storage yet.');
        return;
      }

      console.log(`Tracked Projects (${rows.length}):\n`);
      rows.forEach(r => {
        console.log(`📁 [#${r.id}] ${r.name} (${r.memory_count} memories)`);
        console.log(`   Path: ${r.root_path}`);
        if (r.tech_stack) console.log(`   Tech Stack: ${r.tech_stack}`);
        if (r.description) console.log(`   Description: ${r.description}`);
        console.log('--------------------------------------------------------------------');
      });
    } else if (command === 'memories') {
      const filter = args.slice(1).join(' ').trim();
      let sql = `
        SELECT m.id, m.type, m.title, m.content, m.tags, m.created_at, p.name as project_name
        FROM memory_entries m
        LEFT JOIN projects p ON m.project_id = p.id
      `;
      let queryArgs: (string | number)[] = [];

      if (filter && filter.toUpperCase() === 'GLOBAL') {
        sql += ` WHERE m.project_id IS NULL`;
      } else if (filter) {
        sql += ` WHERE p.name LIKE ? OR p.id = ?`;
        queryArgs = [`%${filter}%`, Number(filter) || -1];
      }

      sql += ` ORDER BY m.id DESC LIMIT 50`;

      const rows = db.prepare(sql).all(...queryArgs) as Array<{
        id: number;
        type: MemoryType;
        title: string;
        content: string;
        tags: string;
        created_at: string;
        project_name: string | null;
      }>;

      if (rows.length === 0) {
        console.log(`No memory entries found${filter ? ` matching scope "${filter}"` : ''}.`);
        return;
      }

      console.log(`Memory Records (${rows.length} entries displayed):\n`);
      rows.forEach(m => {
        const scopeName = m.project_name || 'GLOBAL';
        console.log(`🧠 [#${m.id} | ${scopeName} | ${m.type.toUpperCase()}] - ${m.created_at}`);
        console.log(`   Title:   ${m.title}`);
        console.log(`   Content: ${m.content}`);
        if (m.tags) console.log(`   Tags:    ${m.tags}`);
        console.log('--------------------------------------------------------------------');
      });
    } else if (command === 'patterns') {
      const filter = args.slice(1).join(' ');
      
      if (filter) {
        const res = await handleGetPattern({ query: filter });
        console.log(res);
        return;
      }

      const rows = db.prepare(`
        SELECT id, name, language, snippet, description, updated_at
        FROM code_patterns
        ORDER BY name ASC
      `).all() as Array<{
        id: number;
        name: string;
        language: string;
        snippet: string;
        description: string;
        updated_at: string;
      }>;

      if (rows.length === 0) {
        console.log('No code patterns found in central library.');
        return;
      }

      console.log(`Central Code Pattern Library (${rows.length} template${rows.length === 1 ? '' : 's'}):\n`);
      rows.forEach(p => {
        console.log(`📦 [#${p.id}] ${p.name} (${p.language}) - Updated: ${p.updated_at}`);
        if (p.description) console.log(`   Description: ${p.description}`);
        const snippetDisplay = p.snippet.slice(0, 120).replace(/\r?\n/g, ' ') + '...';
        console.log(`   Snippet:\n${snippetDisplay}`);
        console.log('--------------------------------------------------------------------');
      });
    } else if (command === 'search') {
      const query = args.slice(1).join(' ').trim();
      if (!query) {
        console.error('[Error] You must provide a search phrase or keyword (e.g. cortex search jwt).');
        return;
      }
      const res = await handleSearchKnowledge({ query, projectScope: 'ALL' });
      console.log(res);
    } else if (command === 'rename-project') {
      const target = (args[1] || '').trim();
      const newName = (args[2] || '').trim();
      const newPath = (args[3] || '').trim();

      if (!target || !newName) {
        console.error('[Error] Please provide the target project ID or Name and its brand new name.');
        console.error('Example syntax: cortex rename-project antigravity MyRealProjectName "C:/My/Real/Path"');
        return;
      }

      const selectStmt = db.prepare(`SELECT id, name, root_path FROM projects WHERE id = ? OR name = ? COLLATE NOCASE`);
      const project = selectStmt.get(Number(target) || -1, target) as { id: number; name: string; root_path: string } | undefined;

      if (!project) {
        console.error(`[Error] Project "${target}" was not found in CortexDB storage.`);
        return;
      }

      const updatedPath = newPath || project.root_path;
      try {
        db.prepare(`UPDATE projects SET name = ?, root_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newName, updatedPath, project.id);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('UNIQUE constraint failed: projects.name')) {
          console.error(`[Error] A project named "${newName}" already exists in storage. Project names must be unique.`);
          return;
        }
        if (errMsg.includes('UNIQUE constraint failed: projects.root_path')) {
          console.error(`[Error] A project registered with path "${updatedPath}" already exists.`);
          return;
        }
        throw err;
      }

      console.log(`✨ [Success] Project #${project.id} has been successfully renamed from "${project.name}" to "${newName}"!`);
      if (newPath) console.log(`   Directory Path Updated To: ${updatedPath}`);
      console.log(`   All existing memory records remain intact under this newly named project space.`);
    } else if (command === 'delete-project') {
      const target = args[1];
      if (!target) {
        console.error('[Error] Please specify the project ID or exact Name to delete (e.g., cortex delete-project 2).');
        return;
      }

      const selectStmt = db.prepare(`SELECT id, name FROM projects WHERE id = ? OR name = ? COLLATE NOCASE`);
      const project = selectStmt.get(Number(target) || -1, target) as { id: number; name: string } | undefined;

      if (!project) {
        console.error(`[Error] Project "${target}" was not found in CortexDB storage.`);
        return;
      }

      const countStmt = db.prepare(`SELECT COUNT(*) as count FROM memory_entries WHERE project_id = ?`);
      const cntObj = countStmt.get(project.id) as { count: number };

      db.prepare(`DELETE FROM projects WHERE id = ?`).run(project.id);
      
      console.log(`🗑️ [Success] Project #${project.id} ("${project.name}") and its ${cntObj.count} associated local memory records have been permanently deleted from storage!`);
    } else if (command === 'delete-record') {
      const typeArg = (args[1] || '').toLowerCase();
      const target = args[2];

      if (typeArg !== 'memory' && typeArg !== 'pattern') {
        console.error('[Error] First argument to delete-record must be either "memory" or "pattern".');
        console.error('Example: cortex delete-record memory 14  or  cortex delete-record pattern 3');
        return;
      }
      if (!target || !/^\d+$/.test(target)) {
        console.error('[Error] You must provide the numeric database ID of the record to delete (e.g., cortex delete-record memory 14).');
        return;
      }

      const result = await handleDeleteRecord({
        type: typeArg as RecordType,
        id: Number(target)
      });
      console.log(result);
    } else if (command === 'optimize') {
      console.log('Running deep SQLite maintenance routines...');
      const report = optimizeDatabase(true);
      report.details.forEach((line: string) => console.log('  👉 ' + line));
      console.log('\n✨ Maintenance completed successfully!');
    } else {
      console.error(`[Error] Unknown command "${command}". Type "cortex help" for valid syntax.`);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[CLI Failure] An unexpected error occurred:', errMsg);
  } finally {
    closeDbConnection();
  }
}

runCli().catch(e => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
