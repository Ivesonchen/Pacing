# Pacing

A Windows desktop app built with Electron, Vite, and React, with GitHub Copilot authentication and model discovery.

## Prerequisites

- Windows 10 or later
- Node.js 20 or later
- npm 10 or later

## Development

Install dependencies once:

```powershell
npm install
```

Start Electron and the Vite development server with hot reload:

```powershell
npm run dev
```

In VS Code, the **Debug All** launch configuration debugs both the Electron main process and React renderer.

## Quality and builds

```powershell
npm run lint
npm run build
npm run build:win
```

`npm run build` compiles the main, preload, and renderer processes into `out`. `npm run build:win` creates the NSIS Windows installer in `dist`.

## GitHub Copilot setup

Open **Settings** in the left navigation, then:

1. Select **Sign in with GitHub**.
2. Copy the one-time device code and open the GitHub authorization page.
3. Complete authorization with an account that has GitHub Copilot access.
4. Choose a default model and, when supported, a reasoning effort.

Pacing uses the official `@github/copilot` CLI for device authorization and `@github/copilot-sdk` for authentication checks and account-specific model discovery. Copilot state is scoped beneath Electron's Pacing user-data directory through `COPILOT_HOME`; secrets are managed by the operating system credential store when available. App preferences are validated and written atomically to `settings.json` in the same user-data directory.

## Architecture

- `src/main` owns the Electron lifecycle, native windows, and privileged operations.
- `src/main/copilot-service.js` owns the long-lived Copilot SDK client, device-flow process, sign-out, and model discovery.
- `src/main/settings-store.js` owns validated, atomic preference persistence.
- `src/preload` exposes the small, context-isolated API available to React.
- `src/renderer` contains the Vite-powered React interface.
- `electron-builder.yml` configures Windows installer packaging.

The renderer has no direct Node.js access. Keep `contextIsolation` and the Chromium sandbox enabled, and add native capabilities through narrow preload methods rather than exposing Electron APIs wholesale.

## Multi-root workspace

Open the sibling `pacing.code-workspace` file to view both **Pacing** and **Jarvis (reference)**. Jarvis is included only for source reference; it is not a dependency, npm workspace, build input, or runtime integration.
