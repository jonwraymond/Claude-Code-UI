# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension that provides a user interface for interacting with Claude Code using the [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk).

## Common Development Tasks

### VS Code Extension

**Install dependencies:**
```bash
cd vscode-extension
npm install
```

**Build the extension:**
```bash
cd vscode-extension
npm run compile
```

**Run linting:**
```bash
cd vscode-extension
npm run lint
```

**Watch mode for development:**
```bash
cd vscode-extension
npm run watch
```

**Launch extension in VS Code:**
Press F5 in VS Code while in the `vscode-extension` directory to open an Extension Development Host.

## Architecture

- `vscode-extension/src/extension.ts` - Main extension entry point, registers commands and handles API calls using the Claude Code SDK.
- `vscode-extension/src/panel.ts` - Manages the webview panel for the chat interface.
- `vscode-extension/media/panel.js` - Client-side JavaScript for the webview UI, handling user input and communication with the extension host.
- Two main commands:
  - `claudeCode.sendSelection` - Sends selected text to Claude.
  - `claudeCode.openPanel` - Opens the main chat panel.

## Important Notes
- An `ANTHROPIC_API_KEY` environment variable is required for the extension to function.
- The extension requires VS Code 1.85.0 or higher.
- When modifying the extension, always compile TypeScript (`npm run compile` or `npm run watch`) before testing.