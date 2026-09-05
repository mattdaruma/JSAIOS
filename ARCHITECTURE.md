# JSAIOS Architectural Philosophy: Hexagonal Architecture (Ports & Adapters)

## Overview & Reference
JSAIOS is a **headless, platform-agnostic AI Operating System kernel (`HoneyKernel`)** following **Hexagonal Architecture** (Ports and Adapters Architecture), originally formulated by Alistair Cockburn.

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
                       |   BatchEngine, ChainEngine,           |
                       |   DatabaseEngine, ContextEngine, etc. |
                       +-------------------+-------------------+
                                           |
                                           v
                              +-------------+-------------+
                              |       OUTPUT PORTS        |
                              |  (IBatchSourceAdapter,    |
                              |   IDatabaseAdapter, etc.) |
                              +-------------+-------------+
                                           |
                                           v
                       +-------------------+-------------------+
                       |            OUTPUT ADAPTERS            |
                       | (AwsService, McpClientAdapter,        |
                       |  SqliteDatabaseAdapter, Ollama)       |
                       +---------------------------------------+
```

### 1. Hexagonal Domain Isolation (Core Kernel at the Center)
The inner core (`src/kernel/`, `src/engines/`) contains headless operating system orchestration logic (`BatchEngine`, `ChainEngine`, `DatabaseEngine`, `ContextEngine`).
- **Core OS Identity**: JSAIOS is an AI OS microkernel, **not** an interactive chatbot. `ChatEngine` is merely one driving adapter out of many.
- **Platform Agnostic**: Domain logic MUST remain 100% platform-agnostic with zero dependencies on specific UI platforms, CLI formatting, process stdin/stdout, or web frameworks.

### 2. Ports (Explicit TypeScript Interfaces)
Communication between the kernel core and the outside world happens strictly through explicit TypeScript interfaces:
- **Input Ports**: Public engine interfaces (`BatchEngine`, `ChainEngine`, `HoneyKernel.executeCommand`).
- **Output Ports**: Storage and service contracts (`IBatchSourceAdapter`, `IDatabaseAdapter`, `AIService`).

### 3. Adapters (Driving & Driven Components)
- **Driving Adapters (Input Side)**: Translators that receive user/system actions from specific mediums (CLI Shell, Cron Timers, REST Endpoints, Web Apps) and map them to kernel/engine invocations.
- **Driven Adapters (Output Side)**: Drivers that implement kernel ports for specific environments (`SqliteDatabaseAdapter`, `AwsService` pure REST, `McpClientAdapter`, `OllamaService`).

### 4. Cloud Service Drivers & Dynamic Capability Discovery
Cloud and external service drivers (e.g., `AwsService` under `src/services/cloud/`):
- Operate **strictly via pure HTTP REST (`fetch()`)** (e.g., AWS SigV4 request signing over `fetch()`), with **zero dependency on OS CLI binaries** (`aws.exe`, `child_process`).
- **Dynamic Capability Discovery**: Drivers authenticate upon startup, discover authorized capabilities (S3, CloudFormation, Lambda, Bedrock), and dynamically register authorized capabilities back to `HoneyKernel`.

### 5. Teeny Tiny Single-Purpose Command Handlers
In accordance with JSAIOS Teeny Tiny Code Files Philosophy:
- Driving CLI adapters split complex subcommands into bite-sized, single-purpose handlers inside dedicated subdirectories (`src/shell/terminal/commands/`).
- Main command entry points act as lightweight routers that dispatch subcommands to single-purpose handler modules (<80 lines).

### 6. Strict Module Isolation & No Sibling Imports Rule
- **Driving Shell Isolation (`src/shell/`)**: Driving shells (`src/shell/terminal/`, `src/shell/browser/`, `src/shell/server/`) MUST NEVER import from sibling shell directories. Shells live in different execution environments (Node vs Browser vs Express) and cross-shell imports break web bundling.
- **Driven Service Isolation (`src/services/`)**: REST service drivers MUST NEVER import from sibling service drivers.
- **Core Engine Isolation (`src/engines/`)**: Core domain engines (`src/engines/batch/`, `src/engines/chain/`, `src/engines/database/`) MUST NOT use direct static sibling imports. Use constructor dependency injection of output interfaces/ports, or orchestrate via `HoneyKernel` / driving shells.
