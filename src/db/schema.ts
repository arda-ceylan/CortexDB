// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { getDbConnection } from './connection.js';

export function initializeSchema(): void {
  const db = getDbConnection();

  // 1. Projects table: automatically mapped to local directories via zero-config
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE COLLATE NOCASE NOT NULL,
      root_path TEXT UNIQUE COLLATE NOCASE NOT NULL,
      tech_stack TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Memory Entries table: Architectural decisions, bug solutions, lessons learned
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NULL, -- NULL means GLOBAL rule applicable across all projects
      type TEXT NOT NULL CHECK(type IN ('decision', 'bugfix', 'rule', 'architecture', 'lesson')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // 3. Code Patterns table: Shared reusable code snippet library
  db.exec(`
    CREATE TABLE IF NOT EXISTS code_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE COLLATE NOCASE NOT NULL,
      language TEXT NOT NULL,  -- 'typescript', 'python', 'sql', etc.
      snippet TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Activity Log table: Historical tracking of searches and tool invocations
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indices for rapid lookups and analytical optimization
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memory_project_type ON memory_entries(project_id, type);
    CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory_entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_patterns_language ON code_patterns(language);
    CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);
  `);

  // 5. SQLite FTS5 Full-Text Search Virtual Tables (Sub-millisecond BM25 Search Engine)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_entries_fts USING fts5(
      title,
      content,
      tags,
      content='memory_entries',
      content_rowid='id',
      tokenize = 'porter unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS memory_entries_ai AFTER INSERT ON memory_entries BEGIN
      INSERT INTO memory_entries_fts(rowid, title, content, tags) 
      VALUES (new.id, new.title, new.content, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_entries_ad AFTER DELETE ON memory_entries BEGIN
      INSERT INTO memory_entries_fts(memory_entries_fts, rowid, title, content, tags) 
      VALUES('delete', old.id, old.title, old.content, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_entries_au AFTER UPDATE ON memory_entries BEGIN
      INSERT INTO memory_entries_fts(memory_entries_fts, rowid, title, content, tags) 
      VALUES('delete', old.id, old.title, old.content, old.tags);
      INSERT INTO memory_entries_fts(rowid, title, content, tags) 
      VALUES (new.id, new.title, new.content, new.tags);
    END;

    CREATE VIRTUAL TABLE IF NOT EXISTS code_patterns_fts USING fts5(
      name,
      language,
      snippet,
      description,
      content='code_patterns',
      content_rowid='id',
      tokenize = 'porter unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS code_patterns_ai AFTER INSERT ON code_patterns BEGIN
      INSERT INTO code_patterns_fts(rowid, name, language, snippet, description) 
      VALUES (new.id, new.name, new.language, new.snippet, new.description);
    END;

    CREATE TRIGGER IF NOT EXISTS code_patterns_ad AFTER DELETE ON code_patterns BEGIN
      INSERT INTO code_patterns_fts(code_patterns_fts, rowid, name, language, snippet, description) 
      VALUES('delete', old.id, old.name, old.language, old.snippet, old.description);
    END;

    CREATE TRIGGER IF NOT EXISTS code_patterns_au AFTER UPDATE ON code_patterns BEGIN
      INSERT INTO code_patterns_fts(code_patterns_fts, rowid, name, language, snippet, description) 
      VALUES('delete', old.id, old.name, old.language, old.snippet, old.description);
      INSERT INTO code_patterns_fts(rowid, name, language, snippet, description) 
      VALUES (new.id, new.name, new.language, new.snippet, new.description);
    END;
  `);

  // Autonomous log pruning trigger: keeps table bounded at ~5,000 rows, sampled every 100 inserts for near-zero overhead
  // Uses primary key B-Tree range scan (WHERE id <= OFFSET) for sub-millisecond execution
  db.exec(`
    DROP TRIGGER IF EXISTS prune_activity_logs_trigger;
    CREATE TRIGGER IF NOT EXISTS prune_activity_logs_trigger
    AFTER INSERT ON activity_logs
    WHEN (NEW.id % 100 = 0)
    BEGIN
      DELETE FROM activity_logs 
      WHERE id <= (
        SELECT id FROM activity_logs ORDER BY id DESC LIMIT 1 OFFSET 5000
      );
    END;
  `);

  // 6. Ensure FTS5 virtual tables are populated if pre-existing database records exist
  try {
    const memoryCount = (db.prepare('SELECT count(*) as count FROM memory_entries').get() as { count: number }).count;
    let ftsMemoryDocsize = 0;
    try {
      ftsMemoryDocsize = (db.prepare('SELECT count(*) as count FROM memory_entries_fts_docsize').get() as { count: number }).count;
    } catch (e) {}

    if (memoryCount > 0 && ftsMemoryDocsize < memoryCount) {
      db.exec(`INSERT INTO memory_entries_fts(memory_entries_fts) VALUES('rebuild');`);
    }

    const patternCount = (db.prepare('SELECT count(*) as count FROM code_patterns').get() as { count: number }).count;
    let ftsPatternDocsize = 0;
    try {
      ftsPatternDocsize = (db.prepare('SELECT count(*) as count FROM code_patterns_fts_docsize').get() as { count: number }).count;
    } catch (e) {}

    if (patternCount > 0 && ftsPatternDocsize < patternCount) {
      db.exec(`INSERT INTO code_patterns_fts(code_patterns_fts) VALUES('rebuild');`);
    }
  } catch (e) {}
}

export function logActivity(action: string, details?: string): void {
  try {
    const db = getDbConnection();
    db.prepare('INSERT INTO activity_logs (action, details) VALUES (?, ?)').run(action, details || null);
  } catch (err) {
    console.error('[ActivityLog Warning] Failed to record activity log:', err);
  }
}
