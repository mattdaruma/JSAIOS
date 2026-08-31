# JSAIOS Project Rules & Guidelines

## Codebase Principles

### 1. No Defensive Guard Clauses & Data Integrity Philosophy
- **Strict Rule**: We do not create guard clauses. We write good logic with effective transformations and rely on the user to configure and produce good and valid data.

### 2. Immediate Refactoring of Vestigial & Outdated Code
- **On-the-spot Cleanup**: Clean up vestigial code and obsolete fallback logic immediately on the spot.

### 3. Explicit Triggering Strategy & Direct Event-Coupled Execution
- **Strict Rule**: Functionality, external API calls, and side-effects must ALWAYS be explicitly triggered. No implicit fallback execution.

### 4. Teeny Tiny Code Files Philosophy
- **Strict Rule**: Keep code files bite-sized and modular, almost to the level where each file is a single function or simple class.

### 5. Git Commit & Push Workflow
- **Local Commits Allowed**: Stage and commit changes locally (`git commit`).
- **NO Automatic Git Push**: NEVER execute `git push` automatically. Always wait for explicit user go-ahead before pushing commits to GitHub.
