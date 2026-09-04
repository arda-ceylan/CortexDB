// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { getDbConnection } from '../db/connection.js';
import { detectOrCreateProject, updateProjectMetadata } from '../context/autoDetect.js';
import type { MemoryType } from '../types.js';

export interface GetProjectSummaryArgs {
  projectName?: string;
  projectPath?: string;
  updateTechStack?: string;
  updateDescription?: string;
}

export async function handleGetProjectSummary(args: GetProjectSummaryArgs): Promise<string> {
  const project = detectOrCreateProject(args.projectPath, args.projectName);

  if (args.updateTechStack !== undefined || args.updateDescription !== undefined) {
    updateProjectMetadata(project.id, args.updateTechStack, args.updateDescription);
    if (args.updateTechStack !== undefined) project.tech_stack = args.updateTechStack;
    if (args.updateDescription !== undefined) project.description = args.updateDescription;
  }

  const db = getDbConnection();

  // Retrieve latest decisions and bugfixes specifically for this project
  const projectDecisions = db.prepare(`
    SELECT id, type, title, content, created_at 
    FROM memory_entries 
    WHERE project_id = ? 
    ORDER BY id DESC 
    LIMIT 5
  `).all(project.id) as Array<{ id: number; type: MemoryType; title: string; content: string; created_at: string }>;

  // Retrieve enterprise-wide GLOBAL rules and directives applicable to all workspaces
  const globalRules = db.prepare(`
    SELECT id, type, title, content 
    FROM memory_entries 
    WHERE project_id IS NULL 
    ORDER BY id DESC 
    LIMIT 10
  `).all() as Array<{ id: number; type: MemoryType; title: string; content: string }>;

  const summaryPayload = {
    project: {
      id: project.id,
      name: project.name,
      root_path: project.root_path,
      tech_stack: project.tech_stack || 'Not specified',
      description: project.description || 'Not specified'
    },
    recentProjectMemory: projectDecisions.map(d => ({
      id: d.id,
      type: d.type,
      title: d.title,
      content: d.content,
      date: d.created_at
    })),
    activeGlobalRules: globalRules.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      content: r.content
    }))
  };

  return `CortexDB Project Summary & Active Memory Snapshot:\n\`\`\`json\n${JSON.stringify(summaryPayload, null, 2)}\n\`\`\``;
}
