# Testing Guide for Claude Code VS Code Extension

This guide walks you through testing all features of the Claude Code VS Code extension.

## Prerequisites

1. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Claude Code CLI**:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. **Set Anthropic API Key**:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   # Or create a .env file with: ANTHROPIC_API_KEY=your-api-key-here
   ```

4. **Install VS Code Extension Dependencies**:
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   cd ..
   ```

## Step 1: Start the Python Server

In one terminal window:

```bash
# Option 1: Using the start script
./start_server.sh

# Option 2: Direct Python command
python src/claude_code_server.py

# Option 3: With custom host/port
python src/claude_code_server.py --host 127.0.0.1 --port 8765
```

You should see:
```
INFO:__main__:Starting Claude Code Server on 127.0.0.1:8765
```

## Step 2: Launch VS Code Extension

1. Open VS Code
2. Open the project folder: `code .`
3. Navigate to the extension directory: `cd vscode-extension`
4. Press `F5` to launch a new VS Code window with the extension loaded

## Step 3: Test Basic Features

### 3.1 Open Claude Code Panel
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Claude Code: Open Panel"
3. Press Enter

✅ **Expected**: Claude Code panel opens in the sidebar

### 3.2 Test Connection
The status indicator should show "Connected" in green.

✅ **Expected**: Connected status, no error messages

### 3.3 Send a Simple Message
Type in the chat: "Hello, can you see this message?"

✅ **Expected**: 
- Claude responds
- Session ID appears
- Model name is displayed
- Available tools are listed

## Step 4: Test Core Features

### 4.1 Code Analysis
1. Create a test file `test.py`:
   ```python
   def calculate_sum(a, b):
       return a + b
   
   result = calculate_sum(5, "10")
   print(result)
   ```

2. Select all the code
3. Right-click → "Claude Code: Send Selection"

✅ **Expected**: Claude identifies the type error and suggests fixes

### 4.2 File Operations
Send: "Create a new file called hello.py with a simple hello world function"

✅ **Expected**: 
- Tool usage displayed: "Write"
- File created in workspace
- Tool parameters shown (expandable)

### 4.3 Multi-turn Conversation
1. First message: "Create a Python function to calculate factorial"
2. After response, click Continue
3. Send: "Now add error handling for negative numbers"

✅ **Expected**: Claude builds upon previous context

## Step 5: Test Drag & Drop

### 5.1 Single File
1. Drag a file from VS Code explorer to the chat
2. Type: "Explain this code"
3. Send message

✅ **Expected**: 
- File appears as attachment with icon
- File content included in request
- Claude analyzes the file

### 5.2 Multiple Files
1. Select multiple files in explorer
2. Drag them to the chat
3. Remove one file by clicking ×
4. Send with remaining files

✅ **Expected**: All files handled correctly

## Step 6: Test Configuration Options

### 6.1 Change Model
1. Open VS Code settings (`Cmd+,`)
2. Search for "claudeCode.model"
3. Change to "claude-3-opus-20240229"
4. Send a new message

✅ **Expected**: New model shown in session info

### 6.2 Custom System Prompt
1. Set `claudeCode.systemPrompt`: "You are a Python expert. Always use type hints."
2. Ask: "Create a function to reverse a string"

✅ **Expected**: Response includes type hints

### 6.3 Tool Restrictions
1. Set `claudeCode.disallowedTools`: ["Write"]
2. Ask: "Create a new file called test.txt"

✅ **Expected**: Claude explains it cannot write files

## Step 7: Test MCP Integration

### 7.1 Create MCP Config
Create `test-mcp-config.json`:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"]
    }
  }
}
```

### 7.2 Configure Extension
1. Set `claudeCode.mcpConfig`: "./test-mcp-config.json"
2. Restart the chat (clear and send new message)

✅ **Expected**: 
- MCP servers listed in session info
- Can use commands like "use the filesystem MCP to list files"

## Step 8: Test Error Handling

### 8.1 Max Turns
1. Set `claudeCode.maxTurns`: 2
2. Have a 3-turn conversation

✅ **Expected**: Warning message after 2 turns

### 8.2 Connection Error
1. Stop the Python server
2. Try to send a message

✅ **Expected**: Error message about connection

## Step 9: Test Advanced Features

### 9.1 Session Resume
1. Note the session ID from a conversation
2. Close and reopen the panel
3. Create code to resume: (would need to implement resume UI)

### 9.2 Statistics
After a conversation:

✅ **Expected**: 
- Duration displayed
- Cost shown
- Turn count accurate

## Troubleshooting

### Server Won't Start
- Check if port 8765 is already in use: `lsof -i :8765`
- Verify API key is set: `echo $ANTHROPIC_API_KEY`
- Check Claude CLI installed: `which claude`

### Extension Won't Load
- Ensure you ran `npm install` in vscode-extension
- Check for TypeScript errors: `npm run compile`
- Look at VS Code Developer Console: Help → Toggle Developer Tools

### No Response from Claude
- Check server logs in terminal
- Verify API key is valid
- Check network/firewall settings

## Test Checklist

- [ ] Server starts successfully
- [ ] Extension loads in VS Code
- [ ] Can connect to server
- [ ] Basic chat works
- [ ] Tool usage displayed
- [ ] File drag & drop works
- [ ] Multiple files handled
- [ ] Configuration changes take effect
- [ ] MCP servers work (if configured)
- [ ] Error states handled gracefully
- [ ] Statistics displayed correctly
- [ ] Session management works

## Performance Testing

For stress testing:
1. Send multiple messages rapidly
2. Drag large files
3. Test with many turns
4. Use complex MCP configurations

## Automated Testing

The project now includes comprehensive automated testing:

### Quick Start

```bash
# Install test dependencies
make install

# Run all tests
make test

# Run specific test suites
make test-python      # Python unit tests
make test-vscode      # VS Code extension tests
make test-integration # Integration tests

# Generate coverage report
make coverage
```

### Test Structure

- **Python Tests** (`tests/`): Unit and integration tests using pytest
- **VS Code Tests** (`vscode-extension/src/test/`): Extension tests using Mocha
- **CI/CD** (`.github/workflows/test.yml`): Automated testing on every push

See `docs/TESTING_GUIDE.md` for comprehensive testing documentation. 