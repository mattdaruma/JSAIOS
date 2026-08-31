# JSAIOS Project Rules & Guidelines

## Codebase Principles

### 1. Separation of Code & Configuration (`src/` vs. `config/`)
- **Strict Rule**: The `src/` directory is ONLY for generic driving logic, algorithms, and core OS engine code.
- **Zero Data Files in `src/`**: Zero JSON configurations, workflow definitions, system manifests, or static data templates belong inside `src/`.
- **Top-Level `config/` Directory**: All system manifests (`config/jsaios.config.json`), API workflow definitions (`config/workflows/`), and declarative data parameters belong exclusively in top-level `config/`.

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
