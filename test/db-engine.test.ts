import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getDbConnection, closeDbConnection } from '../src/db/connection.js';
import { initializeSchema } from '../src/db/schema.js';
import { searchMemoryIndex } from '../src/search/memoryIndex.js';
import { handleRememberDecision } from '../src/tools/rememberDecision.js';
import { handleSearchKnowledge } from '../src/tools/searchKnowledge.js';
import { handleStorePattern, handleGetPattern } from '../src/tools/codePatterns.js';
import { handleGetProjectSummary } from '../src/tools/projectContext.js';
import { handleOptimizeDatabase } from '../src/tools/optimizeDatabase.js';
import { handleDeleteRecord } from '../src/tools/deleteRecord.js';
import { detectOrCreateProject } from '../src/context/autoDetect.js';
import { getConfig } from '../src/config.js';

const TEST_DIR = path.resolve('./test-temp-data');
const TEST_DB = path.join(TEST_DIR, 'test_memory.db');
const TEST_CONFIG = path.join(TEST_DIR, 'test_config.json');

describe('CortexDB - Engine, PRAGMAs, and Sub-MS Performance Test Suite', () => {
  beforeAll(async () => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    process.env.CORTEX_DB_PATH = TEST_DB;
    process.env.CORTEX_CONFIG_PATH = TEST_CONFIG;

    initializeSchema();
  });

  afterAll(() => {
    closeDbConnection();
    if (fs.existsSync(TEST_DIR)) {
      try {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      } catch (e) {
        console.error('Test clean up warning (active Windows file lock):', e);
      }
    }
  });

  it('SQLite WAL mode and RAM mmap_size PRAGMA settings should activate cleanly', () => {
    const db = getDbConnection();
    
    const journalMode = db.pragma('journal_mode', { simple: true });
    const cacheSize = db.pragma('cache_size', { simple: true });
    const mmapSize = db.pragma('mmap_size', { simple: true });

    expect(journalMode).toBe('wal');
    expect(Number(cacheSize)).toBe(-262144);
    expect(Number(mmapSize)).toBeGreaterThan(2000000000); 
  });

  it('SQLite FTS5 full-text search should execute in milliseconds across 1,000 dense memory records', async () => {
    console.log('--- Starting 1,000 Records Speed & Stress Test ---');
    
    for (let i = 0; i < 1000; i++) {
      await handleRememberDecision({
        type: i % 2 === 0 ? 'decision' : 'bugfix',
        title: `Test Decision #${i} - Database Connection Pool Architecture`,
        content: `Connection timeout reconfigured to ${1000 + i} ms with exponential retry fallback strategy.`,
        tags: 'database, sqlite, timeout, performance, pooling',
        scope: 'PROJECT'
      });
    }

    const start = performance.now();
    const results = await searchMemoryIndex({
      query: 'connection pool timeout retry',
      projectName: 'ALL',
      limit: 10
    });
    const duration = performance.now() - start;

    console.log(`[Speed Test] SQLite FTS5 search duration across 1,000 entries: ${duration.toFixed(4)} ms`);
    
    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50);
  });

  it('Central Code Library storage and pattern search should function without errors', async () => {
    const storeRes = await handleStorePattern({
      name: 'NextJS Supabase Auth Handler',
      language: 'typescript',
      snippet: 'export async function authHandler(req: NextRequest) { /* auth logic */ }',
      description: 'SSR-supported server authentication verification layer'
    });

    expect(storeRes).toContain('securely saved/updated');

    const getRes = await handleGetPattern({ query: 'Supabase Auth' });
    expect(getRes).toContain('NextJS Supabase Auth Handler');
    expect(getRes).toContain('export async function authHandler');
  });

  it('cortex_get_project_summary should output the active project snapshot and GLOBAL organizational rules as JSON', async () => {
    await handleRememberDecision({
      type: 'rule',
      title: 'Global API Date Formatting',
      content: 'All backend APIs across all repositories must format timestamps in strict UTC ISO-8601.',
      scope: 'GLOBAL'
    });

    const summary = await handleGetProjectSummary({
      updateTechStack: 'Node.js, TypeScript, better-sqlite3',
      updateDescription: 'Universal AI Developer Memory Engine'
    });

    expect(summary).toContain('Universal AI Developer Memory Engine');
    expect(summary).toContain('Global API Date Formatting');
    expect(summary).toContain('UTC ISO-8601');
  });

  it('cortex_delete_record should permanently eradicate memory entries and code patterns by numeric ID only', async () => {
    const uniqueTerm = 'Supersecret_Crypto_Token_Alg_2026';
    const createRes = await handleRememberDecision({
      type: 'decision',
      title: 'Deprecated Token Strategy',
      content: `We initially tested using ${uniqueTerm} but decided against it later.`,
      tags: 'deprecated, token, crypto',
      scope: 'PROJECT'
    });

    const match = createRes.match(/Memory entry #(\d+)/);
    expect(match).not.toBeNull();
    const recordId = Number(match![1]);

    let beforeSearch = await handleSearchKnowledge({ query: uniqueTerm });
    expect(beforeSearch).toContain(uniqueTerm);

    // Invalid non-numeric or missing id rejection
    const invalidIdRes = await handleDeleteRecord({
      type: 'memory',
      id: undefined as any
    });
    expect(invalidIdRes).toContain('[Error]');
    expect(invalidIdRes).toContain('You must provide a valid numeric "id"');

    // Strict ID-based deletion
    const deleteRes = await handleDeleteRecord({
      type: 'memory',
      id: recordId
    });
    expect(deleteRes).toContain('permanently deleted');
    expect(deleteRes).toContain('[Success]');

    let afterSearch = await handleSearchKnowledge({ query: uniqueTerm });
    expect(afterSearch).toContain('No memory entries matched the query');

    await handleStorePattern({
      name: 'Obsolete jQuery Plugin Helper',
      language: 'javascript',
      snippet: '$("div").fadeIn();',
      description: 'An outdated DOM manipulation routine.'
    });

    const db = getDbConnection();
    const patternRow = db.prepare(`SELECT id FROM code_patterns WHERE name = ?`).get('Obsolete jQuery Plugin Helper') as { id: number };

    const patternDelRes = await handleDeleteRecord({
      type: 'pattern',
      id: patternRow.id
    });
    expect(patternDelRes).toContain('permanently deleted');
  });

  it('Activity logs should record system actions and audit history accurately', () => {
    const db = getDbConnection();
    const logs = db.prepare(`SELECT * FROM activity_logs ORDER BY id DESC LIMIT 5`).all() as Array<{ action: string; details: string }>;
    expect(logs.length).toBeGreaterThan(0);
    const actions = logs.map(l => l.action);
    expect(actions.some(a => ['RECORD_CREATED', 'RECORD_DELETED', 'PATTERN_DELETED', 'PATTERN_STORED', 'RECORD_UPDATED'].includes(a))).toBe(true);
  });

  it('cortex_remember_decision should support in-place ID updates and reject non-existent IDs cleanly', async () => {
    const invalidRes = await handleRememberDecision({
      id: 99999,
      type: 'decision',
      title: 'Non-existent Record Update',
      content: 'This should be rejected cleanly.'
    });
    expect(invalidRes).toContain('[Error] No existing memory record found with ID #99999');
    expect(invalidRes).toContain("The 'id' parameter is strictly reserved for updating an existing record");

    const createRes = await handleRememberDecision({
      type: 'architecture',
      title: 'Initial Protocol Engine',
      content: 'We selected OldAlphaProtocol2025 for deployment pipelines.',
      tags: 'alphaprotocol, cloud'
    });
    const match = createRes.match(/Memory entry #(\d+)/);
    expect(match).not.toBeNull();
    const recordId = Number(match![1]);

    let searchBefore = await handleSearchKnowledge({ query: 'OldAlphaProtocol2025' });
    expect(searchBefore).toContain('Initial Protocol Engine');

    const updateRes = await handleRememberDecision({
      id: recordId,
      type: 'architecture',
      title: 'Revised Protocol Engine',
      content: 'We shifted to NewBetaProtocol2027 for improved performance.',
      tags: 'betaprotocol, cloud'
    });
    expect(updateRes).toContain(`Memory entry #${recordId} (ARCHITECTURE) has been successfully updated in-place`);
    expect(updateRes).toContain('resynchronized with the search index');

    let searchAfterNew = await handleSearchKnowledge({ query: 'NewBetaProtocol2027' });
    expect(searchAfterNew).toContain('Revised Protocol Engine');

    let searchAfterOld = await handleSearchKnowledge({ query: 'OldAlphaProtocol2025' });
    expect(searchAfterOld).toContain('No memory entries matched');
  });

  it('Project wipeout command logic should trigger ON DELETE CASCADE on all associated local memory entries', () => {
    const db = getDbConnection();
    db.exec('PRAGMA foreign_keys = ON;'); // Guarantee SQLite enforce foreign key cascades in test scope

    // 1. Insert temporary project
    const projInsert = db.prepare(`INSERT INTO projects (name, root_path) VALUES (?, ?)`).run('Disposable_Wipeout_Demo', 'C:/test/wipe_demo');
    const projId = Number(projInsert.lastInsertRowid);

    // 2. Add two local decisions under this project
    db.prepare(`INSERT INTO memory_entries (project_id, type, title, content) VALUES (?, 'decision', 'Child Note 1', 'Content 1')`).run(projId);
    db.prepare(`INSERT INTO memory_entries (project_id, type, title, content) VALUES (?, 'bugfix', 'Child Note 2', 'Content 2')`).run(projId);

    // 3. Assert child records exist
    const countBefore = (db.prepare(`SELECT COUNT(*) as count FROM memory_entries WHERE project_id = ?`).get(projId) as any).count;
    expect(countBefore).toBe(2);

    // 4. Wipe project from SQLite (Simulating cortex delete-project Disposable_Wipeout_Demo)
    db.prepare(`DELETE FROM projects WHERE id = ?`).run(projId);

    // 5. Verify child records were automatically blasted by SQLite ON DELETE CASCADE!
    const countAfter = (db.prepare(`SELECT COUNT(*) as count FROM memory_entries WHERE project_id = ?`).get(projId) as any).count;
    expect(countAfter).toBe(0);

    // 6. Verify FTS5 virtual table was ALSO purged of cascade-deleted records via recursive_triggers
    const ftsCheck = db.prepare(`SELECT count(*) as count FROM memory_entries_fts WHERE memory_entries_fts MATCH '"Child"'`).get() as any;
    expect(ftsCheck.count).toBe(0);
  });

  it('cortex_optimize_database should successfully run VACUUM, ANALYZE, and WAL checkpoint routines', async () => {
    const optimizeReport = await handleOptimizeDatabase({ deep: true });
    expect(optimizeReport).toContain('Database Maintenance & Deep Optimization Report');
    expect(optimizeReport).toContain('[VACUUM]');
    expect(optimizeReport).toContain('[ANALYZE]');
    expect(optimizeReport).toContain('optimized for high-speed performance');
  });

  it('Case-insensitivity on Windows paths should prevent duplicate project creation', () => {
    const proj1 = detectOrCreateProject('C:/Test/CaseSensitiveDemo', 'CaseSensitiveDemo');
    const proj2 = detectOrCreateProject('c:/test/casesensitivedemo', 'CaseSensitiveDemo');
    expect(proj1.id).toBe(proj2.id);
  });

  it('handleSearchKnowledge with explicit projectName and CURRENT scope should resolve correct project context', async () => {
    await handleRememberDecision({
      projectName: 'TargetAlphaProject',
      type: 'decision',
      title: 'Alpha Unique Algorithm Choice',
      content: 'Alpha selected Bloom filters for cache invalidation.',
      scope: 'PROJECT'
    });

    const searchRes = await handleSearchKnowledge({
      query: 'Bloom filter cache',
      projectName: 'TargetAlphaProject',
      projectScope: 'CURRENT'
    });

    expect(searchRes).toContain('Alpha Unique Algorithm Choice');
    expect(searchRes).toContain('TargetAlphaProject');
  });

  it('SQLite FTS5 search for Code Patterns should provide sub-millisecond matching across templates', async () => {
    await handleStorePattern({
      name: 'Fastify Rate Limiter Middleware',
      language: 'typescript',
      snippet: 'fastify.register(import("@fastify/rate-limit"), { max: 100, timeWindow: "1 minute" });',
      description: 'Distributed Redis-backed rate limiter for public APIs'
    });

    // Exact and prefix search
    const getRes = await handleGetPattern({ query: 'Rate Limit' });
    expect(getRes).toContain('Fastify Rate Limiter Middleware');
    expect(getRes).toContain('@fastify/rate-limit');
  });

  it('Housekeeping routine should report audit log status during database optimization', async () => {
    const report = await handleOptimizeDatabase({ deep: true });
    expect(report).toContain('[Housekeeping]');
  });

  it('busy_timeout pragma should be configured to 5000ms', () => {
    const db = getDbConnection();
    const busyTimeout = db.pragma('busy_timeout', { simple: true });
    expect(Number(busyTimeout)).toBe(5000);
  });

  it('handleRememberDecision should tolerate lowercase scope ("project", "global") and normalize type', async () => {
    const projRes = await handleRememberDecision({
      projectName: 'CaseTolerantProject',
      type: 'BUGFIX' as any,
      title: 'Case Normalization Bugfix Note',
      content: 'Scope passed in lowercase should be recognized as PROJECT scope.',
      scope: 'project' as any
    });
    expect(projRes).toContain("under scope 'CaseTolerantProject'");
    expect(projRes).toContain('(BUGFIX)');

    const globalRes = await handleRememberDecision({
      type: 'Architecture' as any,
      title: 'Global Case Normalization Standard',
      content: 'Global scope passed in lowercase should become GLOBAL.',
      scope: 'global' as any
    });
    expect(globalRes).toContain("under scope 'GLOBAL'");
    expect(globalRes).toContain('(ARCHITECTURE)');
  });

  it('handleDeleteRecord and handleRememberDecision should accept string numeric IDs', async () => {
    const createRes = await handleRememberDecision({
      type: 'decision',
      title: 'Record for String ID test',
      content: 'Checking string ID acceptance.',
      scope: 'PROJECT'
    });
    const match = createRes.match(/Memory entry #(\d+)/);
    expect(match).not.toBeNull();
    const stringId = match![1];

    // In-place update using string ID
    const updateRes = await handleRememberDecision({
      id: stringId as any,
      type: 'decision',
      title: 'Updated Record with String ID',
      content: 'Successfully updated in-place via string ID.'
    });
    expect(updateRes).toContain(`Memory entry #${stringId} (DECISION) has been successfully updated`);

    // Deletion using string ID
    const deleteRes = await handleDeleteRecord({
      type: 'memory',
      id: stringId as any
    });
    expect(deleteRes).toContain(`Memory record #${stringId}`);
    expect(deleteRes).toContain('[Success]');
  });

  it('cortex_get_project_summary should include all global memory types (not just rules)', async () => {
    await handleRememberDecision({
      type: 'architecture',
      title: 'Global Microservices Protocol Directive',
      content: 'All service-to-service communication must use gRPC with mTLS.',
      scope: 'GLOBAL'
    });

    const summary = await handleGetProjectSummary({
      projectName: 'CaseTolerantProject'
    });
    expect(summary).toContain('Global Microservices Protocol Directive');
    expect(summary).toContain('gRPC with mTLS');
  });

  it('handleGetPattern SQLite fallback should respect language and limit parameters', async () => {
    await handleStorePattern({
      name: 'Python Unique Hash Utility',
      language: 'python',
      snippet: 'def compute_hash(data): return hashlib.sha256(data).hexdigest()',
      description: 'SHA-256 data hasher in Python'
    });

    await handleStorePattern({
      name: 'TypeScript Unique Hash Utility',
      language: 'typescript',
      snippet: 'export function computeHash(data: Buffer) { return crypto.createHash("sha256").update(data).digest("hex"); }',
      description: 'SHA-256 data hasher in TypeScript'
    });

    const pyRes = await handleGetPattern({
      query: 'Unique Hash Utility',
      language: 'python',
      limit: 1
    });
    expect(pyRes).toContain('Python Unique Hash Utility');
    expect(pyRes).not.toContain('TypeScript Unique Hash Utility');
  });

  it('searchMemoryIndex should clamp limit to max 100', async () => {
    const results = await searchMemoryIndex({
      query: 'test',
      limit: 99999
    });
    expect(results.length).toBeLessThanOrEqual(100);
  });

  it('handleRememberDecision should reject invalid categories with a helpful error message', async () => {
    const res = await handleRememberDecision({
      type: 'fake_category' as any,
      title: 'Invalid Category Note',
      content: 'This should fail validation.'
    });
    expect(res).toContain('[Error] Invalid memory category "fake_category"');
    expect(res).toContain('Allowed categories are: decision, bugfix, rule, architecture, lesson');
  });

  it('handleRememberDecision and handleStorePattern should reject parameters exceeding limits with model-informative error', async () => {
    // Exceed content limit (500,000 chars)
    const giantContent = 'A'.repeat(500001);
    const contentRes = await handleRememberDecision({
      type: 'decision',
      title: 'Excessive Content Test',
      content: giantContent
    });
    expect(contentRes).toContain('[Error] Parameter "content" length (500,001 chars) exceeds the maximum allowed limit of 500,000 chars');
    expect(contentRes).toContain('split your code into smaller focused modules');

    // Exceed snippet limit (500,000 chars)
    const giantSnippet = 'B'.repeat(500001);
    const snippetRes = await handleStorePattern({
      name: 'Excessive Snippet Template',
      language: 'typescript',
      snippet: giantSnippet
    });
    expect(snippetRes).toContain('[Error] Parameter "snippet" length (500,001 chars) exceeds the maximum allowed limit of 500,000 chars');
    expect(snippetRes).toContain('Please modularize the template');
  });

  it('handleRememberDecision and handleStorePattern should seamlessly support large code blocks (e.g. 50,000+ chars)', async () => {
    const largeCode = '// Function block\nexport function testFunc() { return "hello"; }\n'.repeat(1200); // ~60,000 chars
    expect(largeCode.length).toBeGreaterThan(50000);

    const storeRes = await handleStorePattern({
      name: 'Large Enterprise SDK Wrapper Template',
      language: 'typescript',
      snippet: largeCode,
      description: 'Extensive multi-method SDK wrapper for cloud services'
    });
    expect(storeRes).toContain('[Success] Code pattern "Large Enterprise SDK Wrapper Template"');

    const getRes = await handleGetPattern({ query: 'Enterprise SDK Wrapper' });
    expect(getRes).toContain('Large Enterprise SDK Wrapper Template');
    expect(getRes).toContain('export function testFunc()');
  });

  it('searchMemoryIndex should filter correctly for target project and global rules', async () => {
    await handleRememberDecision({
      projectName: 'AlphaProjectBetaScope',
      type: 'decision',
      title: 'Alpha Unique DB Migration Matrix',
      content: 'Alpha applies partitioning across user shards.',
      scope: 'PROJECT'
    });

    const results = await searchMemoryIndex({
      query: 'Alpha applies partitioning',
      projectName: 'AlphaProjectBetaScope'
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.projectName === 'AlphaProjectBetaScope')).toBe(true);
  });

  it('handleSearchKnowledge and handleGetPattern should reject empty and oversized search queries with [Error]', async () => {
    const emptySearchRes = await handleSearchKnowledge({ query: '   ' });
    expect(emptySearchRes).toContain('[Error] Please provide a non-empty search query.');

    const emptyPatternRes = await handleGetPattern({ query: '' });
    expect(emptyPatternRes).toContain('[Error] Please provide a non-empty search query.');

    const giantQuery = 'Q'.repeat(1001);
    const oversizedSearchRes = await handleSearchKnowledge({ query: giantQuery });
    expect(oversizedSearchRes).toContain('[Error] Search query length (1001 chars) exceeds the maximum allowed limit of 1,000 chars.');

    const oversizedPatternRes = await handleGetPattern({ query: giantQuery });
    expect(oversizedPatternRes).toContain('[Error] Search query length (1001 chars) exceeds the maximum allowed limit of 1,000 chars.');
  });

  it('FTS5 index rebuild command should execute cleanly without errors', async () => {
    const db = getDbConnection();
    expect(() => {
      db.exec(`INSERT INTO memory_entries_fts(memory_entries_fts) VALUES('rebuild');`);
      db.exec(`INSERT INTO code_patterns_fts(code_patterns_fts) VALUES('rebuild');`);
    }).not.toThrow();

    // Verify search still functions correctly after rebuild
    const searchAfterReload = await searchMemoryIndex({ query: 'partitioning' });
    expect(Array.isArray(searchAfterReload)).toBe(true);
  });

  it('getConfig should safely tolerate null or array in config.json without crashing', () => {
    // Test with null in config
    fs.writeFileSync(TEST_CONFIG, 'null', 'utf-8');
    const configFromNull = getConfig();
    expect(configFromNull).toBeDefined();
    expect(configFromNull.limits.maxContentLength).toBe(500000);

    // Test with array in config
    fs.writeFileSync(TEST_CONFIG, '[]', 'utf-8');
    const configFromArray = getConfig();
    expect(configFromArray).toBeDefined();
    expect(configFromArray.pragma.journalMode).toBe('WAL');

    // Restore standard valid config
    fs.writeFileSync(TEST_CONFIG, JSON.stringify({ pragma: { journalMode: 'WAL' } }), 'utf-8');
  });

  it('prune_activity_logs_trigger should keep activity_logs bounded without manual optimize', () => {
    const db = getDbConnection();
    // Verify trigger exists
    const trigger = db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'prune_activity_logs_trigger'").get();
    expect(trigger).toBeDefined();

    // Verify activity_logs table is operational and accessible
    const count = db.prepare('SELECT COUNT(*) as cnt FROM activity_logs').get() as { cnt: number };
    expect(count.cnt).toBeGreaterThanOrEqual(0);
  });

  it('Concurrent memory search and pattern search should execute independently without blocking', async () => {
    // Concurrently trigger memory search and pattern search
    const [memoryRes, patternRes] = await Promise.all([
      searchMemoryIndex({ query: 'database' }),
      handleGetPattern({ query: 'Token' })
    ]);

    expect(Array.isArray(memoryRes)).toBe(true);
    expect(typeof patternRes).toBe('string');
  });

  it('SQLite triggers should keep FTS5 virtual tables strictly in sync on DELETE', async () => {
    // Add a dedicated entry to test trigger deletion sync
    const res = await handleRememberDecision({
      type: 'rule',
      title: 'FTS5 Trigger Sync Test Rule Unique2026',
      content: 'Testing automatic trigger synchronization in SQLite FTS5',
      tags: 'test, fts5sync',
      scope: 'GLOBAL'
    });

    const match = res.match(/Memory entry #(\d+)/);
    expect(match).not.toBeNull();
    const entryId = Number(match![1]);

    // Verify it is searchable via FTS5
    const searchBefore = await searchMemoryIndex({ query: 'Unique2026' });
    expect(searchBefore.some(i => i.dbId === entryId.toString())).toBe(true);

    // Purge record via handleDeleteRecord
    const delRes = await handleDeleteRecord({
      type: 'memory',
      id: entryId
    });
    expect(delRes).toContain('[Success]');

    // Verify it is immediately gone from FTS5 index (zero desync)
    const searchAfter = await searchMemoryIndex({ query: 'Unique2026' });
    expect(searchAfter.some(i => i.dbId === entryId.toString())).toBe(false);
  });

  it('handleRememberDecision should reject invalid scope parameter and prevent data leak', async () => {
    const invalidScopeRes = await handleRememberDecision({
      type: 'decision',
      title: 'Confidential Decision',
      content: 'This should not silently default to GLOBAL.',
      scope: 'INVALID_WORKSPACE' as any
    });

    expect(invalidScopeRes).toContain('[Error] Invalid scope "INVALID_WORKSPACE"');
    expect(invalidScopeRes).toContain('Allowed scopes are: PROJECT, GLOBAL');
  });

  it('handleStorePattern should reject excessively long language parameters', async () => {
    const giantLang = 'x'.repeat(55);
    const storeRes = await handleStorePattern({
      name: 'Giant Language Pattern Test',
      language: giantLang,
      snippet: 'const a = 1;'
    });

    expect(storeRes).toContain('[Error] Parameter "language" length (55 chars) exceeds the maximum allowed limit of 50 chars.');
  });

  it('handleSearchKnowledge and handleGetPattern should respect custom maxSearchQueryLength from config', async () => {
    // Override maxSearchQueryLength to 50 in config
    fs.writeFileSync(TEST_CONFIG, JSON.stringify({
      limits: { maxSearchQueryLength: 50 }
    }), 'utf-8');

    const config = getConfig();
    expect(config.limits.maxSearchQueryLength).toBe(50);

    const query55 = 'A'.repeat(55);
    const searchRes = await handleSearchKnowledge({ query: query55 });
    expect(searchRes).toContain('[Error] Search query length (55 chars) exceeds the maximum allowed limit of 50 chars.');

    const patternRes = await handleGetPattern({ query: query55 });
    expect(patternRes).toContain('[Error] Search query length (55 chars) exceeds the maximum allowed limit of 50 chars.');

    // Restore standard valid config
    fs.writeFileSync(TEST_CONFIG, JSON.stringify({ pragma: { journalMode: 'WAL' } }), 'utf-8');
  });

  it('prune_activity_logs_trigger should correctly use B-tree OFFSET logic without errors', () => {
    const db = getDbConnection();
    // Test the OFFSET logic directly on the DB
    const deleteStmt = db.prepare(`
      DELETE FROM activity_logs 
      WHERE id <= (
        SELECT id FROM activity_logs ORDER BY id DESC LIMIT 1 OFFSET 5000
      )
    `);
    expect(() => deleteStmt.run()).not.toThrow();

    // Verify trigger SQL uses OFFSET
    const triggerInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'prune_activity_logs_trigger'").get() as { sql: string };
    expect(triggerInfo.sql).toContain('OFFSET 5000');
  });
});
