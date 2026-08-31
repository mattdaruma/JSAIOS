# JSAIOS (JavaScript AI Operating System)

A platform-agnostic, microkernel-based AI Operating System designed around flexible, multi-model AI interactions (LLMs, image generation, custom field engines, and dynamic prompt chains).

## Core Architecture

- **HoneyKernel (`src/kernel/HoneyKernel.ts`)**: Ultra-lean, platform-agnostic microkernel core. Manages IPC event routing, service lifecycle, and process scheduling with zero DOM or framework dependencies.
- **Universal Bootloaders (`src/bootloaders/`)**: Pluggable entry points allowing JSAIOS to boot in the browser (`webBootloader`), native Node.js CLI terminal (`nodeBootloader`), or headless daemon servers (`serverBootloader`).
- **Domain Engines (`src/engine/`)**: High-level orchestrators (`ChainEngine`, `FieldsCompiler`, `MediaPipeline`, `UIConstructionEngine`).
- **User Shells (`src/shell/`)**: Pluggable user interfaces including the **Kernel Terminal Shell** (`src/shell/terminal/`) and 3-tier **GUI Shell** (`src/shell/gui/`).

See [implementation_plan.md](file:///c:/Users/jerry/ollama-chat/implementation_plan.md) and [os_architecture_map.md](file:///c:/Users/jerry/ollama-chat/os_architecture_map.md) for full architectural maps.

