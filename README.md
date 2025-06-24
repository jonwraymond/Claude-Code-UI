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

# Claude Code VS Code UI

A VS Code extension that provides a user interface for interacting with Claude Code using the [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk).

## Features

### Core Features
- **Interactive Chat Interface**: Chat with Claude Code directly in VS Code
- **Streaming Responses**: Real-time streaming of Claude's responses
- **Session Management**: Continue conversations and resume previous sessions
- **Code Selection**: Send selected code to Claude for analysis or modification
- **Usage Statistics**: Track conversation duration, cost, and number of turns

### Claude Code SDK Integration
All features from the [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk) are fully integrated:

- **Multi-turn Conversations**: Continue and resume conversations with full context
- **Custom System Prompts**: Override or append to the default system prompt
- **Tool Management**: 
  - Configure allowed/disallowed tools
  - Real-time tool usage display with parameters
  - Support for all Claude Code tools (Read, Write, Bash, Python, etc.)
- **Model Selection**: Choose between different Claude models
- **Permission Modes**: Control how Claude handles file operations
- **Error Handling**: Graceful handling of max turns and execution errors

### MCP (Model Context Protocol)
- **MCP Server Integration**: Connect to external MCP servers for extended functionality
- **Tool Discovery**: Automatically discover and use MCP tools
- **Custom Configurations**: Load MCP configurations from JSON files
- **Examples**: filesystem, GitHub, Git, PostgreSQL, Brave Search, and more

### Enhanced UI Features
- **Tool Usage Visualization**: 
  - See tool names and parameters
  - Collapsible parameter details
  - MCP tool name formatting
- **Error States**: Clear indication of different error types
- **Session Information**: Display current session ID, model, and available tools
- **Enhanced Drag & Drop**: 
  - Visual feedback when dragging files over the interface
  - Support for multiple files at once
  - File attachment display with icons based on file type
  - Ability to remove attached files before sending
  - Support for dragging text/code snippets
  - File size display and proper file handling

## Setup

### Prerequisites

1. Python 3.10+ installed
2. Node.js installed
3. VS Code installed
4. An Anthropic API key

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/Claude-Code-UI.git
   cd Claude-Code-UI
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Install VS Code extension dependencies:
   ```bash
   cd vscode-extension
   npm install
   ```

4. Set your Anthropic API key:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

### Running the Extension

1. Start the Claude Code Python server:
   ```bash
   python src/claude_code_server.py
   # Or use the start script:
   ./start_server.sh
   ```
   The server will start on `http://localhost:8765` by default.

2. Open the `vscode-extension` folder in VS Code:
   ```bash
   cd vscode-extension
   code .
   ```

3. Press `F5` to run the extension in a new VS Code window.

4. In the new window, open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`) and run:
   - `Claude Code: Open Panel` - Opens the chat interface
   - `Claude Code: Send Selection` - Sends selected code to Claude

## Configuration

You can configure the extension in VS Code settings:

### Basic Settings
- `claudeCode.serverUrl`: URL of the Claude Code Python server (default: `http://localhost:8765`)
- `claudeCode.model`: Claude model to use (default: `claude-3-5-sonnet-20241022`)
- `claudeCode.maxTurns`: Maximum number of conversation turns (default: 5)
- `claudeCode.outputFormat`: Output format (`text`, `json`, `stream-json`) (default: `stream-json`)
- `claudeCode.autoStartServer`: Automatically start the server on extension activation (default: false)

### Prompts
- `claudeCode.systemPrompt`: Custom system prompt to guide Claude's behavior
- `claudeCode.appendSystemPrompt`: Text to append to the default system prompt

### Permissions & Tools
- `claudeCode.permissionMode`: Permission mode (`default`, `acceptEdits`, `bypassPermissions`, `plan`)
- `claudeCode.allowedTools`: List of allowed tools (default: `["Read", "Write", "Bash", "Python"]`)
- `claudeCode.disallowedTools`: List of disallowed tools (default: `[]`)

### MCP (Model Context Protocol)
- `claudeCode.mcpConfig`: Path to MCP configuration file (see `examples/mcp-config.example.json`)
- `claudeCode.permissionPromptTool`: MCP tool for handling permission prompts (e.g., `mcp__auth__prompt`)

## Architecture

The project consists of two main components:

1. **Python Backend Server** (`src/claude_code_server.py`):
   - Uses the Claude Code SDK for Python
   - Provides HTTP and WebSocket APIs
   - Handles streaming responses
   - Manages Claude Code sessions

2. **VS Code Extension** (`vscode-extension/`):
   - TypeScript-based VS Code extension
   - Provides the UI for interacting with Claude
   - Communicates with the Python server via HTTP/WebSocket
   - Handles file operations and VS Code integration

## Usage Tips

### Using Drag & Drop

The extension supports advanced drag and drop functionality:

1. **Drag Files**: Simply drag one or more files from your file explorer onto the chat interface
   - A visual overlay will appear showing where to drop
   - Files are displayed as attachments with appropriate icons
   - You can remove files before sending by clicking the × button

2. **Drag Text/Code**: You can also drag selected text or code snippets directly into the chat
   - The text will be added to your input area

3. **File Types**: All file types are supported with custom icons for common programming languages and file formats

### Using MCP (Model Context Protocol)

1. **Create an MCP Configuration File**: 
   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
       }
     }
   }
   ```

2. **Set the MCP Config Path** in VS Code settings:
   - Open VS Code settings
   - Search for "Claude Code"
   - Set `claudeCode.mcpConfig` to your config file path

3. **Use MCP Tools**: Once configured, Claude can use MCP tools like:
   - `mcp__filesystem__read_file` - Read files from allowed directories
   - `mcp__github__search_repositories` - Search GitHub repos
   - `mcp__postgres__query` - Query PostgreSQL databases

### Advanced Configuration

1. **Custom System Prompts**: Guide Claude's behavior for specific tasks
2. **Tool Restrictions**: Use `allowedTools` and `disallowedTools` to control what Claude can do
3. **Permission Modes**:
   - `default`: Ask for permission for each operation
   - `acceptEdits`: Automatically accept file edits
   - `bypassPermissions`: Skip all permission prompts
   - `plan`: Only show the plan without executing

### Keyboard Shortcuts

- `Ctrl+Enter` (or `Cmd+Enter` on Mac): Send message
- Use the Command Palette (`Ctrl+Shift+P`) to access Claude Code commands

## Testing

- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md) for the fastest way to test
- **Comprehensive Testing**: See [TESTING.md](TESTING.md) for detailed testing guide
- **Automated Test**: Run `./test_quick.py` after starting the server

## Development

### Python Server

The server provides the following endpoints:

- `GET /health` - Health check
- `POST /query` - Single query (non-streaming)
- `POST /continue` - Continue conversation
- `POST /resume` - Resume specific session
- `WS /ws` - WebSocket for streaming responses

### VS Code Extension

To develop the extension:

1. Make changes in the `vscode-extension/src` directory
2. Run `npm run compile` to build
3. Press `F5` to test changes

## License

[MIT License](LICENSE)

