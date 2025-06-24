# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Claude Code UI project that provides two ways to interact with Claude:
1. A Python-based tkinter GUI application with drag-and-drop support
2. A VS Code extension for sending code snippets to Claude

## Common Development Tasks

### Python Application

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Run the UI application:**
```bash
python claude_code_ui.py
```

**Run the minimal SDK example:**
```bash
# First install Claude Code CLI and set API key
npm install -g @anthropic-ai/claude-code
export ANTHROPIC_API_KEY=sk-your-key

# Then run the example
python examples/minimal_async_query.py
```

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
Press F5 in VS Code while in the vscode-extension directory to open Extension Development Host.

## Architecture

### Python Application (Root Directory)
- `claude_code_ui.py` - Main tkinter GUI application with drag-and-drop file support
- `examples/minimal_async_query.py` - Demonstrates direct SDK usage with async streaming
- Uses `anthropic` SDK and `claude-code-sdk` for API interactions
- Requires `TkinterDnD2` for drag-and-drop functionality

### VS Code Extension (`vscode-extension/`)
- `src/extension.ts` - Main extension entry point, registers commands and handles API calls
- `src/panel.ts` - Webview panel content generation for the drag-and-drop interface
- `media/panel.js` - Client-side JavaScript for webview drag-and-drop handling
- Two main commands:
  - `claudeCode.sendSelection` - Sends selected text to Claude
  - `claudeCode.openPanel` - Opens drag-and-drop panel

### Key Integration Points
- Both applications use Anthropic's SDK to communicate with Claude
- Configuration managed through VS Code settings (extension) or UI inputs (Python app)
- Supports custom API server URLs for enterprise deployments
- Token memory limits configurable for response size control

## Important Notes
- API key required for both applications (set via environment variable or VS Code settings)
- Python UI requires tkinter (included with most Python installations)
- VS Code extension requires VS Code 1.85.0 or higher
- When modifying the VS Code extension, always compile TypeScript before testing