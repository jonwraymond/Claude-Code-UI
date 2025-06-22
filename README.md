# Claude-Code-UI

This repository provides a simple example user interface for interacting with [Claude Code](https://www.anthropic.com/news/claude-code-beta) using the official [Anthropic Python SDK](https://pypi.org/project/anthropic/).

The application is written in Python and relies on `tkinter` and `TkinterDnD2` for a drag‑and‑drop experience. Dropped files are read into the prompt field and can be sent directly to Claude.

## Features

- Drag and drop files onto the prompt area
- Configure model, MCP server URL, and token memory
- Send prompts or code snippets to Claude using your API key
- Display Claude's response in a scrollable output window

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python claude_code_ui.py
```

You will be prompted for your API key when the application starts.

### Minimal SDK Example


The `examples/minimal_async_query.py` script demonstrates how to use the
[Claude Code Python SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)
directly. It streams responses asynchronously using `anyio` and relies on the
Claude Code CLI under the hood. Install the CLI and set your API key first:

```bash
npm install -g @anthropic-ai/claude-code
export ANTHROPIC_API_KEY=sk-your-key
```

Then run the example:

```bash
python examples/minimal_async_query.py
```

## Notes

This is a lightweight proof of concept intended to run inside a local Python environment or a VS Code terminal. It does not implement a full VS Code extension, but demonstrates how a Python UI can integrate with the Claude API. To create a complete VS Code extension you would typically develop in TypeScript/JavaScript and invoke this Python script as needed.

## VS Code Extension

A full VS Code extension is included in `vscode-extension`. It lets you send code snippets or prompts to Claude Code directly from the editor and provides a drag‑and‑drop panel.

### Install dependencies

```bash
cd vscode-extension
npm install
```

### Launch the extension

Press `F5` in VS Code to open a new Extension Development Host with Claude Code loaded. Configure your API key and other options under `Settings > Claude Code`.

