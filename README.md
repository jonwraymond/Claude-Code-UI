# Claude Code UI - VS Code Extension

A powerful VS Code extension that brings the full capabilities of Claude Code directly into your development environment. This extension provides complete feature parity with the Claude Code CLI, plus additional UI/UX enhancements designed specifically for VS Code.

## 🚀 Features

### Complete CLI Feature Parity
- **All slash commands** from Claude Code CLI (`/continue`, `/undo`, `/redo`, `/diff`, `/help`, `/model`, `/tools`, `/mcp`, `/search`, `/shell`, `/terminal`, and more)
- **Interactive mode features** including Vim mode, command history, and keyboard shortcuts
- **Full settings support** for all Claude Code configuration options
- **Session management** with save, resume, and export capabilities

### Enhanced VS Code Integration
- **Rich chat interface** with syntax highlighting and code block editing
- **Drag & drop files** directly into conversations
- **@ mentions** for referencing files and resources
- **Context management** for workspace, files, and Git integration
- **Visual settings panel** for easy configuration
- **Multi-tab support** for concurrent conversations

### Key Capabilities
- 🤖 Direct integration with Claude Code SDK - no Python server required
- 💬 Real-time streaming responses
- 📁 File system access for reading and writing code
- 🔧 Execute shell commands and terminal operations
- 🧠 Memory system for persistent knowledge
- 💰 Cost tracking and usage statistics
- 🎨 Follows VS Code theme (dark/light mode)

## 📋 Requirements

- VS Code 1.85.0 or higher
- Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

## 🔧 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Cmd/Ctrl + Shift + X)
3. Search for "Claude Code UI"
4. Click Install

### From Source
```bash
git clone https://github.com/yourusername/Claude-Code-UI.git
cd Claude-Code-UI/vscode-extension
npm install
npm run compile
```

## ⚙️ Configuration

1. **Set your API key** (choose one method):
   - Environment variable: `export ANTHROPIC_API_KEY=your-api-key`
   - VS Code settings: Search for "Claude Code" in settings

2. **Open Claude Code**:
   - Command Palette: `Cmd/Ctrl + Shift + P` → "Claude Code: Open Panel"
   - Or use the command "Claude Code: Send Selection" to send selected code

3. **Configure settings** (optional):
   - Model selection (Sonnet, Haiku, Opus)
   - Permission modes
   - Tool allowlists/denylists
   - System prompts
   - MCP server configuration

## 🎯 Usage

### Basic Commands
- **Send a message**: Type in the input box and press Enter
- **Continue response**: Click Continue button or use `/continue`
- **New conversation**: Click + button or use `/new`
- **Clear chat**: Use `/clear` command

### Slash Commands
Type `/` to see all available commands:
- `/help` - Show all commands and shortcuts
- `/model claude-3-5-sonnet-20241022` - Change model
- `/search keyword` - Search conversation history
- `/shell ls -la` - Execute shell commands
- `/terminal` - Open terminal interface
- `/settings` - Open settings panel
- And many more...

### Keyboard Shortcuts
- `Ctrl+Enter` - Send message
- `Shift+Enter` - New line
- `Ctrl+L` - Clear screen
- `Ctrl+C` - Cancel operation
- `Arrow Up/Down` - Navigate command history
- `/vim` - Toggle Vim mode

### Advanced Features
- **Drag & drop files** into the chat to add context
- **@ mention files** by typing @ followed by filename
- **Edit code blocks** in-place by clicking the edit button
- **Export conversations** with `/export` command
- **Resume sessions** from history panel

## 🔒 Security

- API keys are stored securely in VS Code's secret storage
- All WebView communication uses Content Security Policy
- Input sanitization prevents injection attacks
- File system access respects VS Code workspace boundaries

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the official [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)
- Inspired by the Claude Code CLI
- Thanks to the VS Code extension development community

## 📚 Documentation

- [Installation Guide](INSTALL_EXTENSION.md)
- [Feature Parity Document](FEATURE_PARITY.md)
- [Testing Guide](TESTING.md)
- [Quick Start](QUICKSTART.md)

---

**Note**: This extension requires a valid Anthropic API key. Usage is subject to Anthropic's API pricing.

