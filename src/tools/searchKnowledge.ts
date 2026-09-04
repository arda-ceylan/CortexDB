// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { searchMemoryIndex } from '../search/memoryIndex.js';
import { detectOrCreateProject } from '../context/autoDetect.js';
import { getConfig } from '../config.js';
import type { SearchScope, MemoryType } from '../types.js';

export interface SearchKnowledgeArgs {
  query: string;
  projectName?: string; // Optional explicit project name override
  projectPath?: string; // Optional explicit workspace root path override
  projectScope?: SearchScope | string;
  typeFilter?: MemoryType | 'ALL' | string;
  limit?: number | string;
}

export async function handleSearchKnowledge(args: SearchKnowledgeArgs): Promise<string> {
  const query = (args.query || '').trim();
  if (!query) {
    return '[Error] Please provide a non-empty search query.';
  }

  const config = getConfig();
  const maxQueryLength = config.limits.maxSearchQueryLength || 1000;
  if (query.length > maxQueryLength) {
    return `[Error] Search query length (${query.length} chars) exceeds the maximum allowed limit of ${maxQueryLength.toLocaleString('en-US')} chars. Please provide concise search keywords.`;
  }

  const scope = String(args.projectScope || 'CURRENT').toUpperCase();
  let targetProjectName = 'ALL';

  if (scope === 'CURRENT') {
    const project = detectOrCreateProject(args.projectPath, args.projectName);
    targetProjectName = project.name; // Triggers lookup in both active project and GLOBAL organizational rules
  } else if (scope === 'GLOBAL') {
    targetProjectName = 'GLOBAL';
  } else {
    targetProjectName = 'ALL';
  }

  const rawType = (args.typeFilter || 'ALL').trim();
  const typeFilter = rawType.toUpperCase() === 'ALL' ? 'ALL' : rawType.toLowerCase();
  const limit = Math.min(Math.max(1, Number(args.limit) || 10), 100);

  const results = await searchMemoryIndex({
    query: args.query.trim(),
    projectName: targetProjectName,
    type: typeFilter,
    limit
  });

  if (results.length === 0) {
    return `No memory entries matched the query "${args.query}" within scope (${scope}).`;
  }

  const formatted = results.map(item => {
    return `[#${item.dbId} | Scope: ${item.projectName} | Type: ${item.type.toUpperCase()}]\nTitle: ${item.title}\nContent: ${item.content}\nTags: ${item.tags || 'None'}`;
  }).join('\n\n--------------------------------------------\n\n');

  return `CortexDB Search Results (${results.length} matches):\n\n${formatted}`;
}
