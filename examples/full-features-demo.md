# Claude Code VS Code Extension - Full Features Demo

This demo showcases all the Claude Code SDK features integrated into the VS Code extension.

## 1. Basic Configuration

In VS Code settings (`Cmd+,` or `Ctrl+,`), configure:

```json
{
  "claudeCode.model": "claude-3-5-sonnet-20241022",
  "claudeCode.maxTurns": 10,
  "claudeCode.systemPrompt": "You are an expert Python developer focused on clean, maintainable code.",
  "claudeCode.appendSystemPrompt": "Always include comprehensive docstrings and type hints.",
  "claudeCode.permissionMode": "acceptEdits",
  "claudeCode.allowedTools": ["Read", "Write", "Bash", "Python"],
  "claudeCode.disallowedTools": ["Bash(rm -rf *)"],
  "claudeCode.mcpConfig": "./mcp-config.json",
  "claudeCode.outputFormat": "stream-json"
}
```

## 2. MCP Configuration Example

Create `mcp-config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./src"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## 3. Usage Examples

### Basic Query
```
"Can you analyze the Python files in this project and suggest improvements?"
```

### Using MCP Tools
```
"Use the filesystem MCP server to read all Python files in the src directory and create a summary"
```

### Multi-turn Conversation
1. First message: "Create a FastAPI application with user authentication"
2. Claude creates the initial structure
3. Continue: "Add JWT token support"
4. Claude extends the code
5. Continue: "Add unit tests"

### Error Handling
- **Max Turns**: When you hit the turn limit, you'll see a warning message
- **Execution Errors**: Clear error messages with details

### Tool Usage Display
When Claude uses tools, you'll see:
- Tool name (e.g., "Read", "filesystem::read_file")
- Collapsible parameter details
- Real-time execution feedback

### Session Management
- Each conversation has a unique session ID
- You can resume previous sessions
- Model and available tools are displayed

## 4. Advanced Features

### Custom System Prompts
```json
{
  "claudeCode.systemPrompt": "You are a security-focused developer. Always consider security implications in your code.",
  "claudeCode.appendSystemPrompt": "After writing code, perform a security audit."
}
```

### Tool Restrictions
```json
{
  "claudeCode.allowedTools": ["Read", "Write", "mcp__filesystem__read_file"],
  "claudeCode.disallowedTools": ["Bash(sudo *)", "Bash(rm -rf *)"]
}
```

### Permission Modes
- `default`: Ask for each file operation
- `acceptEdits`: Auto-accept file changes
- `bypassPermissions`: No prompts at all
- `plan`: Show plan without executing

## 5. UI Features

### Drag & Drop
- Drag multiple files onto the chat
- See file attachments with icons
- Remove files before sending

### Visual Feedback
- Connection status indicator
- Processing animation
- Error/warning messages
- Tool usage visualization

### Statistics
- Conversation duration
- API cost tracking
- Number of turns used

## 6. Keyboard Shortcuts
- `Ctrl+Enter` / `Cmd+Enter`: Send message
- `Ctrl+Shift+P`: Command palette
  - "Claude Code: Open Panel"
  - "Claude Code: Send Selection"

## 7. Example Workflow

1. Open Claude Code panel
2. Drag your project files into the chat
3. Ask: "Review this code and suggest improvements"
4. Claude analyzes with Read tool
5. Continue: "Implement the suggested improvements"
6. Claude uses Write tool to update files
7. Review changes in VS Code's diff view
8. Continue the conversation as needed

## Tips

- Use specific, clear prompts for best results
- Configure MCP servers for extended functionality
- Set appropriate permission modes for your workflow
- Use system prompts to guide Claude's behavior
- Take advantage of multi-turn conversations for complex tasks 