#!/usr/bin/env node

// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initializeSchema } from './db/schema.js';
import { closeDbConnection } from './db/connection.js';
import { handleRememberDecision, RememberDecisionArgs } from './tools/rememberDecision.js';
import { handleSearchKnowledge, SearchKnowledgeArgs } from './tools/searchKnowledge.js';
import { handleStorePattern, handleGetPattern, StorePatternArgs, GetPatternArgs } from './tools/codePatterns.js';
import { handleGetProjectSummary, GetProjectSummaryArgs } from './tools/projectContext.js';
import { handleOptimizeDatabase, OptimizeDatabaseArgs } from './tools/optimizeDatabase.js';
import { handleDeleteRecord, DeleteRecordArgs } from './tools/deleteRecord.js';

let isShuttingDown = false;
const gracefulShutdown = (code: number = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    closeDbConnection();
  } catch (e) {}

  process.exit(code);
};

process.on('SIGINT', () => { gracefulShutdown(0); });
process.on('SIGTERM', () => { gracefulShutdown(0); });
process.on('SIGHUP', () => { gracefulShutdown(0); });
process.stdin.on('close', () => { gracefulShutdown(0); });

process.on('unhandledRejection', (reason) => {
  console.error('[CortexDB Fatal] Unhandled promise rejection:', reason);
  gracefulShutdown(1);
});

process.on('uncaughtException', (err) => {
  console.error('[CortexDB Fatal] Uncaught exception:', err);
  gracefulShutdown(1);
});

async function runServer() {
  initializeSchema();

  const server = new Server(
    {
      name: 'cortexdb-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'cortex_remember_decision',
          description: 'Creates a brand new memory record OR performs an in-place update on an existing record (if numeric id is provided). Records architectural decisions, bug fixes, rules, or learned lessons scoped to the current project or as an organizational GLOBAL rule.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: "Optional numeric database ID (e.g. 14). Provide this ONLY if you intend to modify/update an existing memory record in-place. Leave blank/omit if creating a brand new record."
              },
              projectName: {
                type: 'string',
                description: "Explicit target repository or project name (e.g. 'e-commerce-portal'). HIGHLY RECOMMENDED to provide your active workspace project name to avoid defaulting to IDE installation folder paths."
              },
              projectPath: {
                type: 'string',
                description: "Optional explicit file system path to the workspace root directory."
              },
              type: {
                type: 'string',
                enum: ['decision', 'bugfix', 'rule', 'architecture', 'lesson'],
                description: 'The category of the memory record'
              },
              title: { type: 'string', description: 'Concise descriptive title or decision summary' },
              content: { type: 'string', description: 'Detailed reasoning, technical context, architectural rationale, or exact debugging steps' },
              tags: { type: 'string', description: 'Comma-separated keyword tags for efficient semantic indexing (e.g., "jwt, security, docker")' },
              scope: {
                type: 'string',
                enum: ['PROJECT', 'GLOBAL'],
                description: 'Set to PROJECT for local repository scoping, or GLOBAL if this rule/guidance should apply to all current and future workspaces (default: PROJECT)'
              }
            },
            required: ['type', 'title', 'content']
          }
        },
        {
          name: 'cortex_search_knowledge',
          description: 'Searches the high-speed SQLite FTS5 index in sub-milliseconds to find relevant past decisions, architectural patterns, and bug resolutions.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Keywords or conceptual search phrase (e.g., "postgres ssl docker connection retry")' },
              projectName: {
                type: 'string',
                description: "Optional explicit repository or project name (e.g. 'e-commerce-portal') to scope CURRENT search when working outside repository root."
              },
              projectPath: {
                type: 'string',
                description: "Optional explicit file system path to the workspace root directory."
              },
              projectScope: {
                type: 'string',
                enum: ['CURRENT', 'GLOBAL', 'ALL'],
                description: 'CURRENT: Search current active project + global rules; GLOBAL: Search global organizational rules only; ALL: Search across all historical repository projects'
              },
              typeFilter: { type: 'string', description: 'Filter by specific memory type (e.g., "bugfix" or "ALL")' },
              limit: { type: 'number', description: 'Maximum number of returned entries (Default: 10)' }
            },
            required: ['query']
          }
        },
        {
          name: 'cortex_store_pattern',
          description: 'Stores or updates a reusable, high-quality code template (snippet/pattern) into the centralized cross-project developer pattern library.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Unique identifier name for the pattern (e.g., "NextJS Google OAuth Handler")' },
              language: { type: 'string', description: 'Programming language (e.g., "typescript", "sql", "python")' },
              snippet: { type: 'string', description: 'The code snippet block' },
              description: { type: 'string', description: 'Instructions, context, and usage rationale for this template' }
            },
            required: ['name', 'language', 'snippet']
          }
        },
        {
          name: 'cortex_get_pattern',
          description: 'Retrieves stored code patterns from the central cross-project library matching the given name or description terms.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Pattern name or search keywords from description' },
              language: { type: 'string', description: "Optional programming language filter (e.g., 'typescript', 'python', 'sql', or 'ALL')" },
              limit: { type: 'number', description: 'Optional maximum number of code templates to return (Default: 5, Max: 50)' }
            },
            required: ['query']
          }
        },
        {
          name: 'cortex_get_project_summary',
          description: 'Inspects active workspace repository to detect project context, returning its tech stack, recent architectural decisions, and active global rules.',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: {
                type: 'string',
                description: "Explicit repository or project name (e.g. 'e-commerce-portal'). HIGHLY RECOMMENDED to pass your active workspace project name."
              },
              projectPath: {
                type: 'string',
                description: "Optional explicit file system path to the workspace root directory."
              },
              updateTechStack: { type: 'string', description: 'Update the project tech stack summary (e.g., "Next.js 14, Prisma, TailwindCSS")' },
              updateDescription: { type: 'string', description: 'Update the short descriptive summary of the project architecture and purpose' }
            }
          }
        },
        {
          name: 'cortex_delete_record',
          description: 'Permanently deletes an outdated, deprecated, or incorrect memory record or shared code pattern from SQLite storage and the active search index using its unique numeric database ID.',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['memory', 'pattern'],
                description: "Specify 'memory' to delete from decision records or 'pattern' to delete from the central code snippet library"
              },
              id: {
                type: 'number',
                description: 'The exact numeric database ID of the record to delete (e.g. 14)'
              }
            },
            required: ['type', 'id']
          }
        },
        {
          name: 'cortex_optimize_database',
          description: 'Performs deep SQLite storage optimization by executing disk defragmentation (VACUUM), B-Tree statistics analysis (ANALYZE), and WAL checkpoint truncation.',
          inputSchema: {
            type: 'object',
            properties: {
              deep: { type: 'boolean', description: 'Whether to run full defragmentation via VACUUM and ANALYZE (Default: true)' }
            }
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments || {}) as Record<string, unknown>;

    try {
      let resultText = '';
      if (name === 'cortex_remember_decision') {
        resultText = await handleRememberDecision(args as unknown as RememberDecisionArgs);
      } else if (name === 'cortex_search_knowledge') {
        resultText = await handleSearchKnowledge(args as unknown as SearchKnowledgeArgs);
      } else if (name === 'cortex_store_pattern') {
        resultText = await handleStorePattern(args as unknown as StorePatternArgs);
      } else if (name === 'cortex_get_pattern') {
        resultText = await handleGetPattern(args as unknown as GetPatternArgs);
      } else if (name === 'cortex_get_project_summary') {
        resultText = await handleGetProjectSummary(args as unknown as GetProjectSummaryArgs);
      } else if (name === 'cortex_delete_record') {
        resultText = await handleDeleteRecord(args as unknown as DeleteRecordArgs);
      } else if (name === 'cortex_optimize_database') {
        resultText = await handleOptimizeDatabase(args as unknown as OptimizeDatabaseArgs);
      } else {
        throw new Error(`Unknown tool name: ${name}`);
      }

      const isErr = resultText.startsWith('[Error]');
      return {
        content: [
          {
            type: 'text',
            text: resultText
          }
        ],
        isError: isErr
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `[Error] Operation failed: ${errorMsg}`
          }
        ],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((err) => {
  console.error('CortexDB Server startup failure:', err);
  process.exit(1);
});
