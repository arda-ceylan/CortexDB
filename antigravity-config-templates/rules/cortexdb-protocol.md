# CortexDB - Universal AI Memory & Knowledge Bridge Protocol

When operating in this repository or workspace, you are equipped with persistent memory via CortexDB. Strictly abide by the following operational workflows to ensure high-velocity, bug-free development:

### 1. Proactive Initialization & Discovery
- **Before implementing complex architectures or resolving obscure bugs:** Always execute `cortex_get_project_summary` to orient yourself with the active tech stack and read mandatory enterprise `GLOBAL` rules.
- **Workspace Explicit Scoping:** When calling `cortex_get_project_summary` or `cortex_remember_decision`, ALWAYS explicitly pass your current repository or workspace name via `projectName` (and optionally `projectPath`). Do not rely solely on default working directories, as MCP servers may execute from application installation root folders.
- **Cross-Project Knowledge Lookup:** Whenever you encounter debugging challenges (e.g., Docker crashes, database locks, JWT auth issues), immediately query `cortex_search_knowledge` with `projectScope: 'ALL'`. Verify if an elegant solution was already discovered in previous workspaces before attempting blind experimentation.
- **Snippet Reusage:** When writing standard utilities or API handlers, check `cortex_get_pattern` first to reuse verified organizational templates.

### 2. Sealing Knowledge & Code Templates
- **Upon solving complex bugs or establishing critical design choices:** Seal your technical insights using `cortex_remember_decision`. Use concise titles, dense explanations, and descriptive tag clusters (e.g., `"postgres, docker, ssl, connection-pool"`). Always provide your active repository name in `projectName`.
- **Scope Discipline:** Set `scope: 'PROJECT'` for local repository decisions, or `scope: 'GLOBAL'` ONLY for universal engineering guidelines (e.g., UTC date standards, terminal character encodings) applicable across all workspaces.
- **Pattern Preservation:** When you craft clean, reusable boilerplate or helper scripts, save them to the central library using `cortex_store_pattern`.

### 3. Memory Hygiene & Self-Correction
- **In-Place Editing:** If an existing memory decision needs refining or updating, NEVER duplicate it. Pass its numeric ID directly via `cortex_remember_decision({ id: <id>, ... })` to execute an in-place update.
- **Active Purging:** If a past architectural choice is retracted or a stored code pattern becomes obsolete or insecure, execute `cortex_delete_record` with its numeric database ID immediately to prevent polluting future agent reasoning.
- **Maintenance Awareness:** If database queries or storage operations experience noticeable drag after heavy refactoring, invoke `cortex_optimize_database` to recalibrate disk B-Trees and RAM virtual mapping.
