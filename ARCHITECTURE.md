# JSAIOS Architectural Philosophy: Hexagonal Architecture (Ports & Adapters)

## Overview & Reference
JSAIOS follows **Hexagonal Architecture** (also known as the **Ports and Adapters Architecture**), originally formulated by Alistair Cockburn.

- **Primary Reference & Documentation**: [Alistair Cockburn - Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- **Martin Fowler Architecture Reference**: [Hexagonal Architecture Patterns](https://martinfowler.com/bliki/CircuitBreaker.html)

---

## Core Architecture Principles in JSAIOS

```
                       +---------------------------------------+
                       |             INPUT ADAPTERS            |
                       |  (CLI Terminal, HTTP API, Web App)    |
                       +-------------------+-------------------+
                                           |
                                           v
                             +-------------+-------------+
                             |       INPUT PORTS         |
                             |  (TerminalInterpreter,    |
                             |   Engine Dispatchers)     |
                             +-------------+-------------+
                                           |
                                           v
                       +-------------------+-------------------+
                       |           HONEYKERNEL CORE            |
                       |   ChatEngine, WorkflowEngine, etc.    |
                       +-------------------+-------------------+
                                           |
                                           v
                             +-------------+-------------+
                             |       OUTPUT PORTS        |
                             |  (IChatSessionStorage,    |
                             |   AIService Interfaces)   |
                             +-------------+-------------+
                                           |
                                           v
                       +-------------------+-------------------+
                       |            OUTPUT ADAPTERS            |
                       | (FileSessionStorage, OllamaService,   |
                       |  CopilotService, BrowserStorage)      |
                       +---------------------------------------+
```

### 1. Hexagonal Domain Isolation (Core Kernel at the Center)
The inner hexagon (`src/kernel/`, `src/engines/`, `src/services/`) contains generic operating system and AI orchestration logic. Inner domain logic MUST remain 100% platform-agnostic with zero dependencies on specific UI platforms, CLI formatting, process stdin/stdout, or web frameworks.

### 2. Ports (Explicit TypeScript Interfaces)
Communication between the kernel core and the outside world happens strictly through explicit TypeScript interfaces:
- **Input Ports**: Public engine interfaces (`ChatEngine`, `HoneyKernel.executeCommand`).
- **Output Ports**: Storage and service driver contracts (`IChatSessionStorage`, `AIService`).

### 3. Adapters (Driving & Driven Components)
- **Driving Adapters (Input Side)**: Translators that receive user/system actions from specific mediums (CLI Shell, HTTP REST Endpoints, Web App Event Handlers) and map them to kernel/engine invocations.
- **Driven Adapters (Output Side)**: Drivers that implement kernel ports for specific environments (`FileSessionStorage` for CLI/Node, `LocalStorageAdapter` for Browser Web Apps, pure `fetch()` HTTP drivers for AI models).

### 4. Teeny Tiny Single-Purpose Command Handlers
In accordance with JSAIOS Teeny Tiny Code Files Philosophy:
- Driving CLI adapters split complex subcommands into bite-sized, single-purpose handlers inside dedicated subdirectories (`src/shell/terminal/commands/chat/`).
- Main command entry points act as lightweight routers that dispatch subcommands to single-purpose handler modules.
