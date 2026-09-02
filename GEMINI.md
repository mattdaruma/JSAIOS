# JSAIOS Project Rules & Guidelines

## Related Projects & Architecture References
- **Architecture Specification**: Refer to [ARCHITECTURE.md](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md) for full Hexagonal Architecture (Ports and Adapters) guidelines.
- **Legacy Codebase (`ollama-chat`)**: Located at `c:\Users\jerry\ollama-chat` (or `~/ollama-chat`). Refer to this repository when checking prior architectural implementations, workflow designs, UI concepts, or feature details being rebuilt into JSAIOS.

## Architectural Concern Trigger Index (Mandatory ARCHITECTURE.md Inspection)
ALWAYS inspect and follow [ARCHITECTURE.md](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md) when working on any of the following tasks:

1. **Storage, Persistence, & Data Models**:
   - *Triggers*: Adding session fields, implementing new persistence drivers, changing storage directories.
   - *Rule*: Storage MUST implement `IChatSessionStorage` or output ports. Core engines (`src/engines/`) must NEVER call `fs` or database APIs directly. Refer to [ARCHITECTURE.md - Output Adapters](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#3-adapters-driving--driven-components).

2. **Service Drivers (AI, Workflows, External APIs)**:
   - *Triggers*: Creating/updating service drivers (e.g., `OllamaService`, `CopilotService`, `ComfyUIService`).
   - *Rule*: Service drivers MUST operate exclusively via pure HTTP REST (`fetch()`). NEVER invoke local OS CLI binaries or spawn `child_process`. Refer to [ARCHITECTURE.md - Output Ports & Adapters](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#3-adapters-driving--driven-components).

3. **CLI Commands, Output Formatting, & Frontends**:
   - *Triggers*: Adding CLI subcommands, modifying output formatting/colors, adding HTTP REST or Web Shell adapters.
   - *Rule*: Driving adapters (`src/shell/`) translate user/system actions into engine calls. CLI subcommands MUST be decomposed into single-purpose handler modules (<50 lines) under `src/shell/terminal/commands/`. Refer to [ARCHITECTURE.md - Teeny Tiny Command Handlers](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#4-teeny-tiny-single-purpose-command-handlers).

4. **Core Kernel & OS Engines (`src/kernel/`, `src/engines/`)**:
   - *Triggers*: Modifying kernel orchestration, event bus, engine turn logic, or session state.
   - *Rule*: Core domain logic MUST remain 100% platform-agnostic, with zero dependencies on process stdout, readline, Express, or DOM APIs. Refer to [ARCHITECTURE.md - Core Kernel Isolation](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#1-hexagonal-domain-isolation-core-kernel-at-the-center).

## Environment & Terminal Execution Rules
- **Terminal Execution (`cmd /c`)**: On Windows, PowerShell `.ps1` execution is disabled. ALWAYS execute npm and script commands via `cmd /c` (e.g. `cmd /c npm test`, `cmd /c npm start`).

## Codebase Principles

### 1. Separation of Code & Configuration (`src/` vs. `config/`)
- **Strict Rule**: The `src/` directory is ONLY for generic driving logic, algorithms, and core OS engine code.
- **Zero Data Files in `src/`**: Zero JSON configurations, workflow definitions, system manifests, or static data templates belong inside `src/`.
- **Top-Level `config/` Directory**: System manifests (`config/jsaios.daemon.json`, `config/jsaios.server.json`, `config/jsaios.terminal.json`, `config/jsaios.browser.json`) belong exclusively in top-level `config/`.

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

### 8. Strict Module Isolation & No Sibling Imports Rule
- **Shell Isolation (`src/shell/`)**: Driving shells (`src/shell/terminal/`, `src/shell/browser/`, `src/shell/server/`) MUST NEVER import from sibling shell directories. Shells live in different execution environments (Node vs Browser vs Express) and cross-shell imports break web bundling.
- **Service Isolation (`src/services/`)**: AI REST service drivers MUST NEVER import from sibling service drivers.
- **Engine Isolation (`src/engines/`)**: Core domain engines (`src/engines/chat/`, `src/engines/context/`) MUST NOT use direct static sibling imports. Use constructor dependency injection of output interfaces/ports, or orchestrate via `HoneyKernel` / driving shells.
