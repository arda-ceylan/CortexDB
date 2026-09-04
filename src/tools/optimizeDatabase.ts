// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { optimizeDatabase } from '../db/optimization.js';

export interface OptimizeDatabaseArgs {
  deep?: boolean;
}

export async function handleOptimizeDatabase(args: OptimizeDatabaseArgs): Promise<string> {
  const isDeep = args.deep !== undefined ? args.deep : true;
  const report = optimizeDatabase(isDeep);

  return `CortexDB Database Maintenance & Deep Optimization Report:\n\n${report.details.map(d => `✅ ${d}`).join('\n')}\n\n✨ Your SQLite storage engine is optimized for high-speed performance!`;
}
