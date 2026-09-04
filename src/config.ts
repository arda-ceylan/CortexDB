// Copyright (c) 2026 Arda Ceylan.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface CortexLimits {
  maxTitleLength: number;
  maxContentLength: number;
  maxPatternSnippetLength: number;
  maxPatternDescriptionLength: number;
  maxTagsLength: number;
  maxNameLength: number;
  maxSearchQueryLength: number;
}

export type JournalMode = 'WAL' | 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'OFF';
export type SynchronousMode = 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA' | '0' | '1' | '2' | '3';
export type TempStoreMode = 'DEFAULT' | 'FILE' | 'MEMORY' | '0' | '1' | '2';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface CortexConfig {
  dbPath: string;
  pragma: {
    journalMode: JournalMode | string;
    synchronous: SynchronousMode | string;
    cacheSize: number; // Page count or negative KiB (e.g., -262144 = 256 MB)
    mmapSize: number;  // Memory mapping limit in bytes (e.g., 2147483648 = 2 GB)
    tempStore: TempStoreMode | string;
  };
  limits: CortexLimits;
  logLevel: LogLevel;
}

const DEFAULT_DIR = path.join(os.homedir(), '.cortexdb');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_DIR, 'config.json');
const DEFAULT_DB_PATH = path.join(DEFAULT_DIR, 'global_memory.db');

export const DEFAULT_CONFIG: CortexConfig = {
  dbPath: DEFAULT_DB_PATH,
  pragma: {
    journalMode: 'WAL',
    synchronous: 'NORMAL',
    cacheSize: -262144,      // 256 MB RAM cache
    mmapSize: 2147483648,    // 2 GB virtual memory-mapped space
    tempStore: 'MEMORY'
  },
  limits: {
    maxTitleLength: 1000,
    maxContentLength: 500000,
    maxPatternSnippetLength: 500000,
    maxPatternDescriptionLength: 25000,
    maxTagsLength: 5000,
    maxNameLength: 300,
    maxSearchQueryLength: 1000
  },
  logLevel: 'info'
};

let cachedConfig: CortexConfig | null = null;
let lastConfigPath: string | null = null;
let lastMtimeMs: number = -1;
let lastEnvDbPath: string | undefined = undefined;

export function getConfig(): CortexConfig {
  // Support overriding config paths via environment variables for testing or CI
  const configPath = process.env.CORTEX_CONFIG_PATH || DEFAULT_CONFIG_PATH;
  const envDbPath = process.env.CORTEX_DB_PATH;

  try {
    if (!fs.existsSync(path.dirname(configPath))) {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
    }

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
      const freshConfig = {
        ...DEFAULT_CONFIG,
        dbPath: envDbPath || DEFAULT_CONFIG.dbPath
      };
      cachedConfig = freshConfig;
      lastConfigPath = configPath;
      lastMtimeMs = fs.statSync(configPath).mtimeMs;
      lastEnvDbPath = envDbPath;
      return freshConfig;
    }

    const stats = fs.statSync(configPath);
    if (
      cachedConfig &&
      lastConfigPath === configPath &&
      lastMtimeMs === stats.mtimeMs &&
      lastEnvDbPath === envDbPath
    ) {
      return cachedConfig;
    }

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const rawParsed = JSON.parse(fileContent);
    const parsed = (rawParsed && typeof rawParsed === 'object' && !Array.isArray(rawParsed))
      ? rawParsed
      : {};

    const parsedPragma = (parsed.pragma && typeof parsed.pragma === 'object' && !Array.isArray(parsed.pragma))
      ? parsed.pragma
      : {};

    const parsedLimits = (parsed.limits && typeof parsed.limits === 'object' && !Array.isArray(parsed.limits))
      ? parsed.limits
      : {};

    const mergedConfig: CortexConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      pragma: {
        ...DEFAULT_CONFIG.pragma,
        ...parsedPragma
      },
      limits: {
        ...DEFAULT_CONFIG.limits,
        ...parsedLimits
      },
      dbPath: process.env.CORTEX_DB_PATH || (typeof parsed.dbPath === 'string' && parsed.dbPath) || DEFAULT_CONFIG.dbPath
    };

    cachedConfig = mergedConfig;
    lastConfigPath = configPath;
    lastMtimeMs = stats.mtimeMs;
    lastEnvDbPath = envDbPath;

    return mergedConfig;
  } catch (error) {
    console.error('Failed to read config file, falling back to defaults:', error);
    return {
      ...DEFAULT_CONFIG,
      dbPath: process.env.CORTEX_DB_PATH || DEFAULT_CONFIG.dbPath
    };
  }
}
