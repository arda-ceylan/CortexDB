#!/usr/bin/env node

// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { optimizeDatabase } from '../db/optimization.js';
import { closeDbConnection } from '../db/connection.js';

console.log('====================================================================');
console.log('   CORTEXDB - DEEP DATABASE MAINTENANCE & OPTIMIZATION ENGINE');
console.log('====================================================================\n');

try {
  console.log('Executing database maintenance routines (VACUUM, ANALYZE, WAL Checkpoint)...\n');
  const report = optimizeDatabase(true);

  report.details.forEach((line: string) => {
    console.log('  👉 ' + line);
  });

  console.log('\n====================================================================');
  console.log('   ✨ MAINTENANCE COMPLETE! (Database optimized for speed)');
  console.log('====================================================================\n');
} catch (err: unknown) {
  const errMsg = err instanceof Error ? err.message : String(err);
  console.error('Error encountered during maintenance:', errMsg);
  process.exit(1);
} finally {
  closeDbConnection();
}
