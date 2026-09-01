# JSAIOS Project Rules & Guidelines

## Related Projects & Architecture References
- **Architecture Specification**: Refer to [ARCHITECTURE.md](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md) for full Hexagonal Architecture (Ports and Adapters) guidelines.
- **Legacy Codebase (`ollama-chat`)**: Located at `c:\Users\jerry\ollama-chat` (or `~/ollama-chat`). Refer to this repository when checking prior architectural implementations, workflow designs, UI concepts, or feature details being rebuilt into JSAIOS.

## Environment & Terminal Execution Rules
- **Terminal Execution (`cmd /c`)**: On Windows, PowerShell `.ps1` execution is disabled. ALWAYS execute npm and script commands via `cmd /c` (e.g. `cmd /c npm test`, `cmd /c npm start`).

## Codebase Principles

### 1. Separation of Code & Configuration (`src/` vs. `config/`)
- **Strict Rule**: The `src/` directory is ONLY for generic driving logic, algorithms, and core OS engine code.
- **Zero Data Files in `src/`**: Zero JSON configurations, workflow definitions, system manifests, or static data templates belong inside `src/`.
- **Top-Level `config/` Directory**: All system manifests (`config/jsaios.config.json`) and declarative data parameters belong exclusively in top-level `config/`.

### 2. No Defensive Guard Clauses & Data Integrity Philosophy
- **Strict Rule**: We do not create guard clauses. We write good logic with effective transformations and rely on the user to configure and produce good and valid data.

### 3. Immediate Refactoring of Vestigial & Outdated Code
- **On-the-spot Cleanup**: Clean up vestigial code and obsolete fallback logic immediately on the spot.

### 4. Explicit Triggering Strategy & Direct Event-Coupled Execution
- **Strict Rule**: Functionality, external API calls, and side-effects must ALWAYS be explicitly triggered. No implicit fallback execution.

### 5. Teeny Tiny Code Files Philosophy
- **Strict Rule**: Keep code files bite-sized and modular, almost to the level where each file is a single function or simple class.

### 6. Git Commit & Push Workflow
- **Local Commits Allowed**: Stage and commit changes locally (`git commit`).
- **NO Automatic Git Push**: NEVER execute `git push` automatically. Always wait for explicit user go-ahead before pushing commits to GitHub.

### 7. Pure REST API Architecture for Service Drivers
- **Strict Rule**: All service drivers in `src/services/` MUST operate exclusively via pure HTTP REST API calls (`fetch()`).
- **Zero Local CLI Binary / `child_process` Dependencies**: Service drivers must NEVER invoke local OS CLI binaries or spawn shell child processes (e.g. `copilot.exe`, `child_process.exec`). Drivers must remain 100% platform-agnostic and executable across Node, Bun, Web Shells, and Browser environments.
