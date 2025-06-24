# Quick Start Testing Guide

## 🚀 Fastest Way to Test

### 1. Set Up Environment (One Time)

```bash
# Create .env file with your API key
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env

# Install dependencies
pip install -r requirements.txt
npm install -g @anthropic-ai/claude-code

# Install VS Code extension dependencies
cd vscode-extension && npm install && npm run compile && cd ..
```

### 2. Start the Server

```bash
# Terminal 1
./start_server.sh
```

### 3. Test the Server (Optional)

```bash
# Terminal 2
./test_quick.py
```

You should see:
```
✅ Health check: {'status': 'ok', ...}
✅ Query successful!
✅ WebSocket complete
```

### 4. Launch VS Code Extension

1. Open VS Code in the project directory: `code .`
2. Press `F5` to launch extension development host
3. In the new VS Code window, press `Cmd+Shift+P` → "Claude Code: Open Panel"

### 5. Quick Tests

#### Test 1: Basic Chat
Type: "Hello, are you working?"

#### Test 2: Code Analysis  
1. Create `test.py`:
   ```python
   def add(a, b):
       return a + b
   print(add(5, "10"))
   ```
2. Select all → Right-click → "Claude Code: Send Selection"

#### Test 3: File Creation
Type: "Create a hello.py file with a greeting function"

#### Test 4: Drag & Drop
Drag any file from the explorer to the chat input

## 🔧 Common Issues

### Server won't start?
```bash
# Check if port is in use
lsof -i :8765

# Check API key
echo $ANTHROPIC_API_KEY
```

### Extension not loading?
1. Check VS Code Developer Console: Help → Toggle Developer Tools
2. Ensure you ran `npm run compile` in vscode-extension/

### No response from Claude?
- Check server terminal for errors
- Verify API key is valid
- Try the test script: `./test_quick.py`

## 📋 What's Working?

- [ ] Server starts (green "Connected" in UI)
- [ ] Basic chat responses
- [ ] Tool usage displayed (like file creation)
- [ ] Drag & drop files
- [ ] Configuration changes (try changing model in settings)

## 🎯 Next Steps

- See `TESTING.md` for comprehensive testing guide
- See `examples/` for feature demos
- Configure MCP servers (see `examples/mcp-config.example.json`) 