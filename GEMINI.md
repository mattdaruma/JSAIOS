# JSAIOS Project Rules & Guidelines

> [!IMPORTANT]
> **STRICT GIT PUSH POLICY**: Local `git commit` operations are allowed, but **NEVER execute `git push` automatically.** Pushing to remote GitHub `origin/main` MUST ONLY occur when explicitly instructed by the user.

## Related Projects & Architecture References
- **Architecture Specification**: Refer to [ARCHITECTURE.md](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md) for full Hexagonal Architecture (Ports and Adapters) guidelines.
- **Legacy Codebase (`ollama-chat`)**: Located at `c:\Users\jerry\ollama-chat` (or `~/ollama-chat`). Refer to this repository when checking prior architectural implementations, workflow designs, UI concepts, or feature details being rebuilt into JSAIOS.

## Architectural Concern Trigger Index (Mandatory ARCHITECTURE.md Inspection)
ALWAYS inspect and follow [ARCHITECTURE.md](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md) when working on any of the following tasks:

1. **Storage, Persistence, & Data Models**:
   - *Triggers*: Adding session fields, implementing new persistence drivers, changing storage directories, database integration.
   - *Rule*: Storage MUST implement `IChatSessionStorage`, `IDatabaseAdapter`, or output ports. Core engines (`src/engines/`) must NEVER call `fs` or raw DB drivers directly. Refer to [ARCHITECTURE.md - Output Adapters](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#3-adapters-driving--driven-components).

2. **Service Drivers (AI, Cloud, Workflows, External APIs)**:
   - *Triggers*: Creating/updating service drivers (e.g., `AwsService`, `OllamaService`, `CopilotService`, `ComfyUIService`).
   - *Rule*: Service drivers MUST operate exclusively via pure HTTP REST (`fetch()`). NEVER invoke local OS CLI binaries or spawn `child_process`. Drivers must perform capability discovery and register authorized capabilities. Refer to [ARCHITECTURE.md - Cloud Service Drivers](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#4-cloud-service-drivers--dynamic-capability-discovery).

3. **CLI Commands, Output Formatting, & Frontends**:
   - *Triggers*: Adding CLI subcommands, modifying output formatting/colors, adding HTTP REST or Web Shell adapters.
   - *Rule*: Driving adapters (`src/shell/`) translate user/system actions into engine calls. CLI subcommands MUST be decomposed into single-purpose handler modules (<80 lines). Refer to [ARCHITECTURE.md - Teeny Tiny Command Handlers](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#5-teeny-tiny-single-purpose-command-handlers).

4. **Core Kernel & OS Engines (`src/kernel/`, `src/engines/`)**:
   - *Triggers*: Modifying kernel orchestration (`HoneyKernel`), `BatchEngine`, `ChainEngine`, `DatabaseEngine`, `ContextEngine`.
   - *Rule*: Core domain logic MUST remain 100% platform-agnostic with zero dependencies on process stdout, readline, Express, or DOM APIs. Chat is merely one interaction interface, equal to CLI, cron, REST, or batch. Refer to [ARCHITECTURE.md - Core Kernel Isolation](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md#1-hexagonal-domain-isolation-core-kernel-at-the-center).

## Environment & Terminal Execution Rules
- **Terminal Execution (`cmd /c`)**: On Windows, PowerShell `.ps1` execution is disabled. ALWAYS execute npm and script commands via `cmd /c` (e.g. `cmd /c npm test`, `cmd /c npm start`).

## Codebase Principles

### 1. Headless AI Operating System Identity (`HoneyKernel`)
- **Strict Rule**: JSAIOS is an AI Operating System microkernel, NOT a chatbot. Core domain logic belongs in `HoneyKernel` and generic engines (`BatchEngine`, `ChainEngine`, `DatabaseEngine`, `ContextEngine`).

### 2. Separation of Code & Configuration (`src/` vs. `config/`)
- **Strict Rule**: The `src/` directory is ONLY for generic driving logic, algorithms, and core OS engine code. Zero static data files belong in `src/`.
- **Top-Level `config/` Directory**: System manifests (`config/default.daemon.json`, `config/default.server.json`, `config/default.terminal.json`, `config/terminal.browser.json`, `config/help.browser.json`) belong exclusively in top-level `config/`.

### 3. No Defensive Guard Clauses & Data Integrity Philosophy
- **Strict Rule**: We do not create guard clauses. We write good logic with effective transformations and rely on the user to configure and produce good and valid data.

### 4. Immediate Refactoring of Vestigial & Outdated Code
- **On-the-spot Cleanup**: Clean up vestigial code and obsolete fallback logic immediately on the spot.

### 5. Explicit Triggering Strategy & Direct Event-Coupled Execution
- **Strict Rule**: Functionality, external API calls, and side-effects must ALWAYS be explicitly triggered. No implicit fallback execution.

### 6. Teeny Tiny Code Files Philosophy
- **Strict Rule**: Keep code files bite-sized and modular (<80 lines), almost to the level where each file is a single function or simple class.

### 7. Git Commit & Push Workflow
- **Local Commits Allowed**: Stage and commit changes locally (`git commit`).
- **NO Automatic Git Push**: NEVER execute `git push` automatically. Always wait for explicit user go-ahead before pushing commits to GitHub.

### 8. Pure REST API Architecture for Service Drivers
- **Strict Rule**: All service drivers in `src/services/` MUST operate exclusively via pure HTTP REST API calls (`fetch()`).
- **Zero Local CLI Binary / `child_process` Dependencies**: Service drivers must NEVER invoke local OS CLI binaries or spawn shell child processes (e.g. `aws.exe`, `copilot.exe`, `child_process.exec`). Drivers must remain 100% platform-agnostic and executable across Node, Bun, Web Shells, and Browser environments.

### 9. Strict Module Isolation & No Sibling Imports Rule
- **Shell Isolation (`src/shell/`)**: Driving shells (`src/shell/terminal/`, `src/shell/browser/`, `src/shell/server/`) MUST NEVER import from sibling shell directories.
- **Service Isolation (`src/services/`)**: REST service drivers MUST NEVER import from sibling service drivers.
- **Engine Isolation (`src/engines/`)**: Core domain engines (`src/engines/batch/`, `src/engines/chain/`, `src/engines/database/`) MUST NOT use direct static sibling imports.

### 10. Pragmatic, Zero-Flattery Peer Review Policy
- **Strict Rule**: Maintain a direct, objective, and pragmatic engineering tone. Zero flattery, zero filler praise ("brilliant", "genius", "great idea"), and zero cheerleader commentary.
- **Critical & Realistic Evaluation**: Act as a strict, pragmatic senior staff architect. Always evaluate proposed features against over-engineering risks, local hardware limitations, maintenance burden, readability for other developers, and standard industry conventions before endorsing implementation.

### 11. Protection of User Data in Protected `storage/` Directory
- **Strict Rule**: ALL user-created and runtime data (chat sessions, prompt templates, context packs, user-defined workflow chains, database files, usage logs, terminal history) MUST be stored inside the top-level `storage/` parent directory (e.g. `storage/chat-sessions/`, `storage/database/`, `storage/logs/`).
- **Strict Git Exclusion**: The entire `storage/` parent directory MUST be protected by `.gitignore` so user data is NEVER committed to the git repository.
