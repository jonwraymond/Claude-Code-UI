# Quick Start Guide

## 🚀 Fastest Way to Get Started

### 1. Set Up Environment (One Time)

```bash
# Set your API key as an environment variable
export ANTHROPIC_API_KEY="your-api-key-here"

# Install VS Code extension dependencies
cd vscode-extension && npm install && npm run compile && cd ..
```

### 2. Launch VS Code Extension

1.  Open the project's root directory in VS Code: `code .`
2.  Press `F5` to launch the extension development host.
3.  In the new VS Code window that appears, open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`) and select "Claude Code: Open Panel".

### 3. Quick Tests

#### Test 1: Basic Chat
Type: "Hello, are you working?"

#### Test 2: Code Analysis  
1.  Create a `test.py` file:
    ```python
    def add(a, b):
        return a + b
    print(add(5, "10"))
    ```
2.  Select all text → Right-click → "Claude Code: Send Selection".

#### Test 3: File Creation
Type: "Create a hello.py file with a greeting function".

#### Test 4: Drag & Drop
Drag any file from the VS Code explorer to the chat input area.

## 🔧 Common Issues

### Extension not loading?
1.  Check VS Code's Developer Console for errors: Help → Toggle Developer Tools.
2.  Ensure you have run `npm run compile` in the `vscode-extension/` directory.

### No response from Claude?
-   Verify your `ANTHROPIC_API_KEY` is valid and was exported correctly in the shell where you launched VS Code.
-   Check your network connection and any firewall settings.

## 📋 What's Working?

- [ ] Extension panel opens and shows "Connected" status.
- [ ] Basic chat responses are received.
- [ ] Tool usage is displayed (e.g., for file creation).
- [ ] Drag & drop for files is functional.
- [ ] Configuration changes in VS Code settings are applied.

## 🎯 Next Steps

- See `TESTING.md` for a more comprehensive testing guide.
- Explore the examples in the `examples/` directory for feature demos. 