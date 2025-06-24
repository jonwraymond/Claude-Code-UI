# Installing the Claude Code VS Code Extension

## Method 1: Install for Development/Testing (Recommended)

### 1. Open the Extension in VS Code

```bash
# From the project root
code vscode-extension
```

### 2. Install Dependencies

```bash
cd vscode-extension
npm install
```

### 3. Launch Extension Development Host

**Option A: Using VS Code UI**
1. Press `F5` in VS Code
2. This opens a new VS Code window with the extension loaded

**Option B: Using Command Palette**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Debug: Start Debugging"
3. Select "VS Code Extension Development"

### 4. Test the Extension

In the new VS Code window that opens:
1. Press `Cmd+Shift+P` to open Command Palette
2. Type "Claude Code" to see available commands:
   - `Claude Code: Open Panel`
   - `Claude Code: Send Selection`

## Method 2: Package and Install Locally

### 1. Install vsce (VS Code Extension Manager)

```bash
npm install -g @vscode/vsce
```

### 2. Package the Extension

```bash
cd vscode-extension
vsce package
```

This creates a `.vsix` file like `claude-code-vscode-0.0.1.vsix`

### 3. Install the VSIX

**Option A: Using VS Code UI**
1. Open VS Code
2. Go to Extensions view (`Cmd+Shift+X`)
3. Click "..." menu → "Install from VSIX..."
4. Select the `.vsix` file

**Option B: Using Command Line**
```bash
code --install-extension claude-code-vscode-0.0.1.vsix
```

## Method 3: Quick Test Without Installation

### 1. Start the Python Server

```bash
# Terminal 1
source venv/bin/activate
export ANTHROPIC_API_KEY="your-api-key"  # Optional for testing
python src/claude_code_server.py
```

### 2. Run Extension in Debug Mode

```bash
# Terminal 2
cd vscode-extension
npm run watch  # Compile TypeScript in watch mode
```

Then press `F5` in VS Code to launch the extension.

## Verifying Installation

1. Check Extensions list (`Cmd+Shift+X`):
   - Look for "Claude Code" in the list

2. Check Commands (`Cmd+Shift+P`):
   - Type "Claude Code" to see commands

3. Test Basic Functionality:
   - Select some code
   - Right-click → "Claude Code: Send Selection"
   - Or use `Cmd+Shift+P` → "Claude Code: Open Panel"

## Troubleshooting

### Extension Not Showing Up
- Make sure you're in the Extension Development Host window
- Check Output panel → "Extension Host" for errors
- Try reloading window: `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux)

### Server Connection Issues
- Verify server is running: `http://localhost:8765/health`
- Check server URL in VS Code settings: `claudeCode.serverUrl`
- Check Output panel for connection errors

### Commands Not Working
- Ensure extension is activated (check status bar)
- Check if Python server is running
- Look for errors in Developer Tools: Help → Toggle Developer Tools

## Configuration

After installation, configure the extension:

1. Open VS Code Settings (`Cmd+,`)
2. Search for "Claude Code"
3. Configure:
   - `claudeCode.serverUrl`: Server URL (default: `http://localhost:8765`)
   - `claudeCode.model`: Claude model to use
   - `claudeCode.maxTurns`: Maximum conversation turns
   - Other settings as needed

## Uninstalling

1. Open Extensions view (`Cmd+Shift+X`)
2. Find "Claude Code"
3. Click gear icon → Uninstall

Or via command line:
```bash
code --uninstall-extension yourname.claude-code-vscode
```