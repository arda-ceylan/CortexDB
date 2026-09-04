# CortexDB - Universal AI Developer & Agent Memory Engine (MCP Server)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![MCP Compliant](https://img.shields.io/badge/MCP-100%25%20Compliant-brightgreen.svg)](https://modelcontextprotocol.io)

**CortexDB** is an ultra-fast, universally compatible, zero-configuration memory database engineered for AI coding assistants and autonomous developer agents (including **Google Antigravity, Claude Code, Claude Desktop, Cursor, Windsurf,** and **Zed**).

By blending an enterprise **SQLite storage core** configured with extreme RAM virtual mapping (`mmap_size`) and **Native SQLite FTS5 BM25 Full-Text Search**, CortexDB eradicates AI agent memory loss across coding sessions and seamlessly bridges technical expertise between independent project repositories.

---

## ⚡ Core Superpowers

1. **Sub-Millisecond Search Speed:** Uses SQLite PRAGMAs to map up to 2 GB of virtual database pages directly into RAM alongside a 256 MB memory cache. Native SQLite FTS5 executes BM25 full-text lookups across thousands of complex architectural decisions in milliseconds.
2. **Cross-Project Memory Bridge:** Automatically transfers technical breakthroughs from one workspace to another. If an agent solves an obscure Docker, database, or authentication bug in *Project A*, a totally different agent building *Project B* months later can retrieve and apply the solution instantly.
3. **Zero-Configuration Repository Detection:** Operates entirely without boilerplate setup. The server inspects `process.cwd()` to dynamically detect, create, and manage project context boundaries.
4. **Central Developer Pattern Library:** A shared enterprise repository where proven, secure code templates and reusable utility snippets can be sealed and retrieved by name across any project.
5. **In-Place Memory Editing & Active Purging:** Allows agents to directly edit and update existing memory decisions in-place via their record ID without breaking historical numbering, or permanently erase outdated architectural decisions from both SQLite disk tables and search indexes.
6. **Terminal Administrator CLI (`cortex`):** Empowers human developers with complete supervisory oversight. Inspect stored memories, preview reusable code templates, run instant terminal searches, and cleanly wipe entire project histories from your shell.
7. **Autonomous Deep Maintenance (Defragmentation Engine):** Features automated and command-line maintenance routines (`VACUUM`, `ANALYZE`, and `WAL Truncation`) to reclaim disk fragmentation and maintain peak B-Tree execution velocities.

---

## 💻 Terminal Administrator CLI (`cortex`)

In addition to serving AI agents over standard JSON-RPC Stdio, CortexDB bundles a high-velocity command-line administrator utility named **`cortex`**. Once installed globally (`npm i -g .`), you can manage your enterprise AI memory directly from PowerShell, Bash, or Command Prompt without launching an IDE:

| CLI Command Syntax | Description & Purpose |
| :--- | :--- |
| **`cortex projects`** | Lists all tracked workspaces, directory paths, tech stacks, and total recorded memories per project. |
| **`cortex memories [project-name \| GLOBAL]`** | Displays detailed architectural decisions, bugfixes, and guidelines for a target workspace or enterprise-wide rules. |
| **`cortex patterns [query]`** | Prints the shared code template repository and snippet previews. |
| **`cortex search <query>`** | Executes lightning-fast SQLite FTS5 search across all repositories right from your terminal! |
| **`cortex history [limit]`** | Displays chronological audit log history of memory creation, updates, deletions, and maintenance operations. |
| **`cortex rename-project <target> <name>`** | Renames a tracked workspace project and realigns storage indexes. |
| **`cortex delete-project <name-or-id>`** | **Executive Wipeout:** Permanently deletes a tracked repository and **automatically wipes all associated memory entries** via atomical SQLite CASCADE! |
| **`cortex delete-record <type> <id>`** | Purges a specific decision (`type: memory`) or shared snippet (`type: pattern`) from storage and search indexes using its numeric ID. |
| **`cortex optimize`** | Manually triggers deep storage defragmentation (`VACUUM`, `ANALYZE`, and `WAL Checkpoint Truncate`). |
| **`cortex help`** | Displays the terminal helper guide and command syntax. |

---

## 🚀 Quick Start & Installation

### 1. Clone & Build
```bash
git clone https://github.com/your-username/cortexdb.git
cd cortexdb
npm install
npm run build

# Optional: Link globally to use the 'cortex' CLI command from any terminal
npm link
```

### 2. Connect to Your AI Coding Assistant

Once compiled, CortexDB communicates via standard Stdio JSON-RPC under the Model Context Protocol (MCP). It attaches to your favorite AI workflow in seconds:

#### A. Google Antigravity Configuration (`mcp_config.json`)
Add the following configuration block to your Antigravity MCP settings:

```json
{
  "mcpServers": {
    "cortexdb": {
      "command": "node",
      "args": ["/absolute/path/to/cortexdb/build/index.js"]
    }
  }
}
```
*(On Windows, use forward slashes or escaped backslashes, e.g., `"C:/Projects/cortexdb/build/index.js"`)*

#### B. Claude Code & Claude Desktop Configuration (`claude_desktop_config.json`)
Append the identical configuration block into your Claude setup (`%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/.config/Claude/claude_desktop_config.json` on macOS/Linux):

```json
{
  "mcpServers": {
    "cortexdb": {
      "command": "node",
      "args": ["/absolute/path/to/cortexdb/build/index.js"]
    }
  }
}
```

---

## 🛠️ 7 MCP Super-Tools Exposed to AI Agents

CortexDB provides 7 precision-engineered tools (The 7 Pillars) to the AI agent:

| Tool Name | Purpose |
| :--- | :--- |
| **`cortex_remember_decision`** | Records brand new architectural decisions, bug fixes, coding rules, or lessons learned. Can also **update existing entries in-place** if an optional `id` parameter is supplied! Can be scoped to the local `PROJECT` or applied across all workspaces as a `GLOBAL` rule. |
| **`cortex_search_knowledge`** | Sub-millisecond full-text search across past project decisions, bug solutions, and organizational guidelines powered by SQLite FTS5. Supports `CURRENT`, `GLOBAL`, or `ALL` project scopes. |
| **`cortex_store_pattern`** | Saves or updates reusable, high-quality code templates and snippet functions into the central cross-project developer pattern library. |
| **`cortex_get_pattern`** | Retrieves stored code snippets by name or functional description from the shared library. |
| **`cortex_get_project_summary`** | Generates a high-density JSON snapshot of the current repository, outlining its tech stack, recent design decisions, and mandatory global enterprise rules. |
| **`cortex_delete_record`** | Permanently eradicates obsolete, deprecated, or incorrect decision records and code patterns from SQLite disk tables and search indexes using their exact numeric database ID. |
| **`cortex_optimize_database`** | Executes deep defragmentation (`VACUUM`), updates query planner histograms (`ANALYZE`), and cleanly checkpoints Write-Ahead Logs (`WAL`). |

---

## 🤖 Recommended Agent Rules & Skill Protocol (SKILL.md / AGENTS.md)

While modern AI coding assistants will discover CortexDB tools automatically via MCP, adopting an explicit **Agent Behavior Protocol** guarantees rigorous, proactive memory utilization and prevents AI memory hallucination.

Copy and paste the following markdown block into your workspace's `.agents/rules/cortexdb.md`, `AGENTS.md`, `SKILL.md`, or Claude Custom Instructions:

```markdown
# CortexDB - Universal AI Memory & Knowledge Bridge Protocol

When operating in this repository or workspace, you are equipped with persistent memory via CortexDB. Strictly abide by the following operational workflows to ensure high-velocity, bug-free development:

### 1. Proactive Initialization & Discovery
- **Before implementing complex architectures or resolving obscure bugs:** Always execute `cortex_get_project_summary` to orient yourself with the active tech stack and read mandatory enterprise `GLOBAL` rules.
- **Cross-Project Knowledge Lookup:** Whenever you encounter debugging challenges (e.g., Docker crashes, database locks, JWT auth issues), immediately query `cortex_search_knowledge` with `projectScope: 'ALL'`. Verify if an elegant solution was already discovered in previous workspaces before attempting blind experimentation.
- **Snippet Reusage:** When writing standard utilities or API handlers, check `cortex_get_pattern` first to reuse verified organizational templates.

### 2. Sealing Knowledge & Code Templates
- **Upon solving complex bugs or establishing critical design choices:** Seal your technical insights using `cortex_remember_decision`. Use concise titles, dense explanations, and descriptive tag clusters (e.g., `"postgres, docker, ssl, connection-pool"`).
- **Scope Discipline:** Set `scope: 'PROJECT'` for local repository decisions, or `scope: 'GLOBAL'` ONLY for universal engineering guidelines (e.g., UTC date standards, terminal character encodings) applicable across all workspaces.
- **Pattern Preservation:** When you craft clean, reusable boilerplate or helper scripts, save them to the central library using `cortex_store_pattern`.

### 3. Memory Hygiene & Self-Correction
- **In-Place Editing:** If an existing memory decision needs refining or updating, NEVER duplicate it. Pass its numeric ID directly via `cortex_remember_decision({ id: <id>, ... })` to execute an in-place update.
- **Active Purging:** If a past architectural choice is retracted or a stored code pattern becomes obsolete or insecure, execute `cortex_delete_record` immediately to prevent polluting future agent reasoning.
- **Maintenance Awareness:** If database queries or storage operations experience noticeable drag after heavy refactoring, invoke `cortex_optimize_database` to recalibrate disk B-Trees and RAM virtual mapping.
```

---

## ⚙️ Dynamic PRAGMA & RAM Scaling

Upon execution, CortexDB constructs an autonomous runtime configuration file at **`~/.cortexdb/config.json`** and seals the master storage engine at **`~/.cortexdb/global_memory.db`**.

If your development machine possesses extensive RAM (e.g., 32 GB, 64 GB, or 128 GB), you can dynamically amplify storage velocity without modifying source code simply by adjusting `~/.cortexdb/config.json`:

```json
{
  "dbPath": "~/.cortexdb/global_memory.db",
  "pragma": {
    "journalMode": "WAL",
    "synchronous": "NORMAL",
    "cacheSize": -524288,
    "mmapSize": 8589934592,
    "tempStore": "MEMORY"
  },
  "limits": {
    "maxTitleLength": 1000,
    "maxContentLength": 500000,
    "maxPatternSnippetLength": 500000,
    "maxPatternDescriptionLength": 25000,
    "maxTagsLength": 5000,
    "maxNameLength": 300,
    "maxSearchQueryLength": 1000
  },
  "logLevel": "info"
}
```
*(The above configuration allocates a 512 MB RAM Database Cache, an 8 GB Virtual Memory-Mapped address space, and generous 500,000 character limits for large enterprise code templates!)*

---

## 🧪 Developer CLI & Verification Commands

```bash
# Compile TypeScript source to build directory
npm run build

# Run unit tests (PRAGMAs, SQLite FTS5 BM25 speed benchmarks, cascade deletion, and tool verification)
npm run test

# Run interactive cross-project AI agent simulation in terminal
npm run simulate

# Execute administrator CLI utility
npm run cortex -- help
npm run cortex -- projects

# Execute manual deep storage maintenance & defragmentation (VACUUM & ANALYZE)
npm run optimize
```

---

## 📄 License

Licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for terms and commercial reuse permissions.
