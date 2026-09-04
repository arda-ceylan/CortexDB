// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

/**
 * CortexDB Unified Domain Types & Constants
 */

export const VALID_MEMORY_TYPES = [
  'decision',
  'bugfix',
  'rule',
  'architecture',
  'lesson'
] as const;

export type MemoryType = typeof VALID_MEMORY_TYPES[number];

export const VALID_SCOPES = ['PROJECT', 'GLOBAL'] as const;
export type MemoryScope = typeof VALID_SCOPES[number];

export const VALID_SEARCH_SCOPES = ['CURRENT', 'GLOBAL', 'ALL'] as const;
export type SearchScope = typeof VALID_SEARCH_SCOPES[number];

export const VALID_RECORD_TYPES = ['memory', 'pattern'] as const;
export type RecordType = typeof VALID_RECORD_TYPES[number];

export interface ProjectContext {
  id: number;
  name: string;
  root_path: string;
  tech_stack: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryEntry {
  id: number;
  project_id: number | null;
  type: MemoryType;
  title: string;
  content: string;
  tags: string;
  created_at: string;
  project_name?: string | null;
}

export interface CodePattern {
  id: number;
  name: string;
  language: string;
  snippet: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  details: string | null;
  created_at: string;
}
