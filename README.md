# JSAIOS (JavaScript AI Operating System)

Microkernel Architecture featuring **HoneyKernel Core**, Declarative JSON Manifests, and Universal Transport Drivers.

---

## 🏛️ Core Principles

1. **Separation of Code & Configuration (`src/` vs. `config/`)**:
   - `src/` is strictly reserved for generic driver logic and core microkernel code.
   - `config/` contains all declarative JSON manifests (`jsaios.daemon.json`, `jsaios.server.json`, `jsaios.terminal.json`, `jsaios.browser.json`).
2. **Teeny Tiny Single-Purpose Code Files**:
   - Every file is bite-sized, single-purpose, and modular.
3. **Platform-Agnostic HoneyKernel**:
   - Runs identically in Node.js System Terminal CLI, browser contexts, or headless server daemons.

---

## 🚀 Getting Started

```bash
# Start JSAIOS System CLI
npm start

# Start REST Server
npm run start:server

# Start OS Kernel Daemon
npm run start:daemon

# Launch Browser Web Shell
npm run dev:browser

# Launch System Developer Guide
npm run dev:help

# Run Unit Tests
npm test
```
