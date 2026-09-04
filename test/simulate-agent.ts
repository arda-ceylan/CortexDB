#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { initializeSchema } from '../src/db/schema.js';
import { handleRememberDecision } from '../src/tools/rememberDecision.js';
import { handleSearchKnowledge } from '../src/tools/searchKnowledge.js';
import { handleStorePattern, handleGetPattern } from '../src/tools/codePatterns.js';
import { handleGetProjectSummary } from '../src/tools/projectContext.js';
import { closeDbConnection } from '../src/db/connection.js';

const SIM_DIR = path.resolve('./simulation-demo-db');
process.env.CORTEX_DB_PATH = path.join(SIM_DIR, 'simulated_global_memory.db');

async function runSimulator() {
  console.log('====================================================================');
  console.log('   CORTEXDB - LIVE CROSS-PROJECT AI AGENT SIMULATION');
  console.log('====================================================================\n');

  if (!fs.existsSync(SIM_DIR)) {
    fs.mkdirSync(SIM_DIR, { recursive: true });
  } else {
    const simDbFile = path.join(SIM_DIR, 'simulated_global_memory.db');
    if (fs.existsSync(simDbFile)) {
      try {
        fs.unlinkSync(simDbFile);
        if (fs.existsSync(`${simDbFile}-wal`)) fs.unlinkSync(`${simDbFile}-wal`);
        if (fs.existsSync(`${simDbFile}-shm`)) fs.unlinkSync(`${simDbFile}-shm`);
      } catch (e) {}
    }
  }

  initializeSchema();

  // -------------------------------------------------------------------------
  // SCENARIO 1: AI AGENT WORKING ON "PROJECT A: ECOMMERCE PLATFORM"
  // -------------------------------------------------------------------------
  const projectAPath = path.join(SIM_DIR, 'Ecommerce_Platform');
  if (!fs.existsSync(projectAPath)) fs.mkdirSync(projectAPath, { recursive: true });
  
  process.chdir(projectAPath);
  console.log(`[🚀 SESSION 1] Active working directory: ${process.cwd()}`);
  console.log('AI Agent recording architectural decisions and code patterns for Project A...\n');

  const decisionRes = await handleRememberDecision({
    type: 'decision',
    title: 'JWT Secret and Refresh Token Rotation Strategy',
    content: 'For enhanced security, refresh token lifetime is limited to 7 days with instantaneous Redis blocklist verification.',
    tags: 'auth, jwt, security, redis, token',
    scope: 'PROJECT'
  });
  console.log('   -> ' + decisionRes);

  const patternRes = await handleStorePattern({
    name: 'TypeScript JWT Token Verify Helper',
    language: 'typescript',
    snippet: `export async function verifyToken(token: string): Promise<UserPayload> {
  const verified = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
  return verified.payload as UserPayload;
}`,
    description: 'Standard helper template performing Redis blocklist check and JWT signature verification.'
  });
  console.log('   -> ' + patternRes);

  const globalRuleRes = await handleRememberDecision({
    type: 'rule',
    title: 'Windows PowerShell Terminal Character Compatibility',
    content: 'On Windows environments, terminal character encoding must be initialized to UTF-8 via CHCP 65001 to prevent rendering defects.',
    tags: 'windows, terminal, encoding, powershell',
    scope: 'GLOBAL'
  });
  console.log('   -> ' + globalRuleRes + '\n');

  // -------------------------------------------------------------------------
  // SCENARIO 2: MONTHS LATER, AGENT MIGRATES TO "PROJECT B: MOBILE API"
  // -------------------------------------------------------------------------
  const projectBPath = path.join(SIM_DIR, 'Mobile_API_Service');
  if (!fs.existsSync(projectBPath)) fs.mkdirSync(projectBPath, { recursive: true });
  
  process.chdir(projectBPath);
  console.log('--------------------------------------------------------------------');
  console.log(`[⚡ SESSION 2 - CROSS-PROJECT] Agent migrated to a totally different repository: ${process.cwd()}`);
  console.log('Agent is building Project B, actively querying historical decisions from past workspaces...\n');

  console.log('❓ [Agent Search Request]: "How did we resolve JWT token security in earlier repositories?" (Scope: ALL)');
  const searchRes = await handleSearchKnowledge({
    query: 'JWT Token security redis',
    projectScope: 'ALL'
  });
  console.log('\n--- SEARCH RESULTS ---');
  console.log(searchRes);
  console.log('----------------------\n');

  console.log('📦 [Agent Pattern Request]: Retrieve stored "Token Verify" helper snippet from central library');
  const getPatternRes = await handleGetPattern({ query: 'Token Verify' });
  console.log('\n' + getPatternRes + '\n');

  console.log('📋 [Project B Context Snapshot]: Agent inspects active workspace and enterprise global rules...');
  const summaryRes = await handleGetProjectSummary({
    updateTechStack: 'Fastify, SQLite, React Native',
    updateDescription: 'Lightweight mobile backend service API'
  });
  console.log(summaryRes);

  console.log('\n====================================================================');
  console.log('   ✅ SIMULATION SUCCESSFUL! (Cross-project Memory Bridge Operational)');
  console.log('====================================================================');
  
  closeDbConnection();

  try {
    process.chdir(path.resolve('..'));
    if (fs.existsSync(SIM_DIR)) {
      fs.rmSync(SIM_DIR, { recursive: true, force: true });
    }
  } catch (e) {}
}

runSimulator().catch((e) => {
  console.error('Simulation execution failure:', e);
  process.exit(1);
});
