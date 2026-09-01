# JSAIOS Architecture Plan: HTTP Server REST Bootloader & Generic Declarative Browser UI Framework

This document outlines the detailed architecture and implementation roadmap for:
1. **Config Safety Backup** (`config/jsaios.config.json.bak`)
2. **HTTP Server REST Bootloader & Adapter** (`src/shell/server/`)
3. **Pure Data-Driven Generic Browser UI Framework** (`src/shell/browser/`)
4. **Declarative Browser Terminal UI Assembly** (`config/jsaios.ui.json`)

---

## 1. Architectural Alignment & Strict Isolation Rules

In accordance with [ARCHITECTURE.md](file:///c:/Users/jerry/JSAIOS/ARCHITECTURE.md):

- **Core Hexagon (Domain & Engines)**: `HoneyKernel`, `ChatEngine`, `AIService` remain 100% platform-agnostic with zero dependencies on Express, HTTP, React, or DOM APIs.
- **Driving Adapters (Input Side)**:
  - `src/shell/server/JSAIOSServerAdapter.ts`: Translates HTTP REST network requests into kernel/engine invocations.
  - `src/shell/browser/`: **100% Domain-Agnostic UI Framework**. Contains NO domain-specific or hardcoded "chat" or "terminal" components. UI layout and component trees are constructed purely from generic React + Tailwind primitives via JSON declarations.
- **Driven Adapters (Output Side)**: `FileSessionStorage` for Node/CLI disk persistence; `OllamaService` / `CopilotService` for HTTP REST AI drivers.

> [!CAUTION]
> **STRICT ISOLATION RULE (ZERO SIBLING SHELL IMPORTS)**
> Shell adapters (`src/shell/browser/`, `src/shell/terminal/`, `src/shell/server/`) MUST NEVER import code from sibling shell directories!
> Shell adapters communicate exclusively with core engines (`src/kernel/`, `src/engines/`, `src/services/`) or over HTTP REST APIs.

---

## 2. Generic Layout Container & Dedicated Component Primitives

The Browser UI Framework provides a single flexible, recursive container strategy and dedicated component primitives for every form control and UI pattern:

```
+-------------------------------------------------------------------------+
|                         DECLARATIVE UI MANIFEST                         |
|                         (config/jsaios.ui.json)                         |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                      RECURSIVE LAYOUT CONTAINERS                        |
|  - Container  (Flexbox / Grid / Stack / Card / Pane with Tailwind)      |
|  - Header     (Bar Container for Toolbars, Navigation & Status)         |
|  - SidePanel  (Collapsible Drawer / Sidebar Layout)                     |
|  - Tabs       (Tabbed Container Switcher)                               |
|  - Accordion  (Expandable / Collapsible Section Stack)                  |
|  - Divider    (Visual Separator Line)                                   |
|  - Backdrop   (Dimming Overlay Container)                               |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                     DEDICATED UI PRIMITIVES                             |
|  [Text & Code]                                                          |
|  - Typography (Headings, Paragraphs, Body Text)                         |
|  - TextBlock  (Scrollable Logs, Formatted Output Buffer, ANSI Text)     |
|  - CodeEditor (CodeMirror JSON / Markdown / Code Editor)                |
|  [Dedicated Form Controls]                                              |
|  - Input      (Text, Textarea, Password, Search input fields)           |
|  - Checkbox   (Dedicated Checkbox & Toggle Switch component)            |
|  - DatePicker (Dedicated Date & Time Calendar picker component)         |
|  - RadioGroup (Dedicated Radio Button Selection Group component)        |
|  - Slider     (Dedicated Range Slider Input component)                  |
|  - Select     (Dedicated Dropdown & Combobox component)                 |
|  - FilePicker (Dedicated File Upload / File Selector component)         |
|  - Typeahead  (Input with Autocomplete Suggestions & History)           |
|  [Display & Feedback]                                                   |
|  - Button     (Clickable Action Buttons & Icon Buttons)                 |
|  - Badge / Chip (Status Badges, Tags & Role Pills)                      |
|  - Icon       (Lucide React Icon Wrapper)                               |
|  - Avatar     (User / Assistant Avatar Icon)                            |
|  - Image      (Image Preview Container)                                 |
|  - Spinner / ProgressBar (Loading Indicators)                           |
|  - Alert      (Notice / Banner Callout Box)                             |
|  [Overlays & Menus]                                                     |
|  - Modal      (Dialog Windows & Popup Overlays)                         |
|  - Popover    (Floating Contextual Popups & Speed Dials)                |
|  - Tooltip    (Hover Info Text Box)                                     |
|  - Menu       (Dropdown Action Menu)                                    |
|  [Data Structures]                                                      |
|  - Table / DataGrid (Tabular Data Grid View)                            |
|  - List       (Item List View)                                          |
|  - Pagination (Page Navigation Controls)                                |
+-------------------------------------------------------------------------+
```

---

## 3. Detailed Step-by-Step Implementation Roadmap

### Step 1: Configuration Safety & Project Dependencies
1. **Backup Config**: Copy `config/jsaios.config.json` to `config/jsaios.config.json.bak`.
2. **Update `package.json`**:
   - Dependencies: `react` (v19), `react-dom` (v19), `lucide-react`, `@uiw/react-codemirror`, `@codemirror/lang-json`, `@codemirror/lang-markdown`.
   - Dev Dependencies: `tailwindcss` (v4), `@tailwindcss/vite`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`.
3. **Vite & Tailwind Setup**: Create `vite.config.ts`, `index.html`, and `src/shell/browser/styles/globals.css`.

### Step 2: HTTP Server REST & Streaming Adapter (`src/shell/server/`)
1. **`JSAIOSServerAdapter.ts`**: Pure Node HTTP REST server adapter.
   - `GET /api/status`: System, active session, and provider metadata.
   - `GET /api/services`: List of registered services (`ollama`, `copilot`, `comfyui`).
   - `GET /api/chat/sessions`: List active sessions.
   - `POST /api/chat/sessions`: Create a new session.
   - `GET /api/chat/history`: Return session message history.
   - `POST /api/chat/send`: Execute prompt turn with standard HTTP response body chunked streaming (`Transfer-Encoding: chunked`).
   - `POST /api/chat/config`: Mid-session configuration updates.
   - `GET /*`: Serve compiled static Web UI bundle (`dist/browser/`).
2. **`serverBootloader.ts`**: Bootloader script that boots `HoneyKernel`, registers services, initializes `ChatEngine`, and starts `JSAIOSServerAdapter`.

### Step 3: Pure Generic Browser UI Framework (`src/shell/browser/`)
1. **Type Definitions ([types.ts](file:///c:/Users/jerry/JSAIOS/src/shell/browser/types.ts))**:
   - `UINodeConfig`: Schema for declarative JSON nodes (`type`, `componentType`, `layoutProps`, `props`, `children`).
2. **Generic Renderer ([UIRenderer.tsx](file:///c:/Users/jerry/JSAIOS/src/shell/browser/renderer/UIRenderer.tsx))**:
   - Recursively parses a `UINodeConfig` JSON tree and renders generic React components.
3. **Layout Containers (`src/shell/browser/layouts/`)**:
   - `Container.tsx`: Flexible layout pane supporting flex (`row`, `column`), grid templates, padding, gaps, scrollability, and card styling.
   - `Header.tsx`: Bar container for toolbars, headers, and status bars.
   - `SidePanel.tsx`: Collapsible drawer / sidebar container.
   - `Tabs.tsx`: Tabbed container switcher.
   - `Accordion.tsx`: Expandable container stack.
4. **Dedicated Form Control & Display Primitives (`src/shell/browser/components/`)**:
   - `Typography.tsx`, `TextBlock.tsx`, `CodeEditor.tsx`
   - `Input.tsx` (Text/Textarea/Password)
   - `Checkbox.tsx` (Dedicated Checkbox & Toggle Switch component)
   - `DatePicker.tsx` (Dedicated Date & Time Calendar picker)
   - `RadioGroup.tsx` (Dedicated Radio Button Group)
   - `Slider.tsx` (Dedicated Range Slider)
   - `Select.tsx` (Dedicated Option Dropdown & Combobox)
   - `FilePicker.tsx` (Dedicated File Upload component)
   - `Typeahead.tsx` (Autocomplete input with history)
   - `Button.tsx`, `Badge.tsx`, `Icon.tsx`, `Avatar.tsx`, `Image.tsx`, `Spinner.tsx`, `Alert.tsx`
   - `Modal.tsx`, `Popover.tsx`, `Tooltip.tsx`, `Menu.tsx`
   - `Table.tsx`, `List.tsx`, `Pagination.tsx`
5. **Client Engine Adapter (`src/shell/browser/BrowserClientAdapter.ts`)**:
   - Generic client API bridge connecting browser input events to HTTP REST endpoints over HTTP chunked streaming.

### Step 4: Declarative Browser Terminal UI Assembly (`config/jsaios.ui.json`)
1. **`config/jsaios.ui.json`**: Pure declarative JSON manifest that constructs a raw, dark, Windows-Terminal-like UI by nesting generic `Container`, `Header`, `Badge`, `TextBlock`, and `Input` components.
2. **`browserBootloader.ts`**: Browser Web UI entry point mounting `UIRenderer` with `config/jsaios.ui.json`.

---

## 4. Verification & Testing Strategy

1. **Automated Tests**:
   - Unit tests (`cmd /c npm test`).
   - Line count compliance report (`cmd /c npm run report:lines`).
2. **Manual End-to-End Verification**:
   - Start HTTP REST Server: `cmd /c npm run start:server` (or `tsx src/bootloaders/serverBootloader.ts`).
   - Test REST API endpoints (`GET /api/status`, `POST /api/chat/send`).
   - Open Browser Terminal UI at `http://localhost:3000` to verify live interactive chatting and streaming response rendering!
