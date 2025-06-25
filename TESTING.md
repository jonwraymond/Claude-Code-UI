# Testing Guide for Claude Code VS Code Extension

This guide walks you through testing all features of the Claude Code VS Code extension.

## Prerequisites

1.  **Install Node.js Dependencies**:
    ```bash
    cd vscode-extension
    npm install
    npm run compile
    cd ..
    ```

2.  **Set Anthropic API Key**:
    ```bash
    export ANTHROPIC_API_KEY="your-api-key-here"
    ```

## Step 1: Launch VS Code Extension

1.  Open VS Code in the project's root directory:
    ```bash
    code .
    ```
2.  Press `F5` to launch a new VS Code window (Extension Development Host) with the extension loaded.

## Step 2: Test Basic Features

### 2.1 Open Claude Code Panel
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux).
2. Type "Claude Code: Open Panel" and press Enter.

✅ **Expected**: Claude Code panel opens in the sidebar. The status indicator should show "Connected".

### 2.2 Send a Simple Message
Type in the chat: "Hello, can you see this message?"

✅ **Expected**: 
- Claude responds to the message.
- A Session ID appears in the panel.
- The model name is displayed.

## Step 3: Test Core Features

### 3.1 Code Analysis
1. Create a test file `test.py`:
   ```python
   def calculate_sum(a, b):
       return a + b
   
   result = calculate_sum(5, "10")
   print(result)
   ```
2. Select all the code.
3. Right-click → "Claude Code: Send Selection".

✅ **Expected**: Claude identifies the type error and suggests fixes in a new editor tab.

### 3.2 File Operations
Send the prompt: "Create a new file called hello.py with a simple hello world function"

✅ **Expected**: 
- The tool usage display shows the "Write" tool being used.
- The `hello.py` file is created in your workspace.

### 3.3 Multi-turn Conversation
1. First message: "Create a Python function to calculate factorial"
2. After the response, send a follow-up: "Now add error handling for negative numbers"

✅ **Expected**: Claude builds upon the previous context and modifies the function.

## Step 4: Test Drag & Drop

1. Drag a file from your VS Code explorer into the chat panel.
2. Type: "Explain this code" and send the message.

✅ **Expected**: 
- The file appears as an attachment.
- Claude analyzes the content of the attached file.

## Step 5: Test Configuration Options

1. Open VS Code settings (`Cmd+,` or `Ctrl+Shift+P` > "Preferences: Open Settings (UI)").
2. Search for "claudeCode.model".
3. Change the model to a different one, e.g., "claude-3-opus-20240229".
4. Send a new message in the panel.

✅ **Expected**: The new model name is shown in the session info area.

## Step 6: Test Error Handling

1. Unset your API key:
   ```bash
   unset ANTHROPIC_API_KEY
   ```
2. Restart the Extension Development Host (`F5`).
3. Try to send a message.

✅ **Expected**: An error message about the missing API key is displayed.

## Troubleshooting

### Extension Won't Load
- Ensure you have run `npm install` and `npm run compile` in the `vscode-extension` directory.
- Check for TypeScript errors in the terminal where you ran the compile command.
- Look at the VS Code Developer Console for errors: Help → Toggle Developer Tools.

### No Response from Claude
- Verify your `ANTHROPIC_API_KEY` is valid and has been exported in the shell where you launched VS Code.
- Check your network/firewall settings.

## Automated Testing

The project includes automated tests for the VS Code extension.

### Running Tests

```bash
# Navigate to the extension directory
cd vscode-extension

# Run the tests
npm test
```

### Test Structure
- **VS Code Tests** (`vscode-extension/src/test/`): Extension tests using Mocha that run in a special instance of VS Code.
- **CI/CD** (`.github/workflows/test.yml`): Automated testing on every push.

## Test Checklist

- [ ] Extension loads in VS Code
- [ ] Can connect to server
- [ ] Basic chat works
- [ ] Tool usage displayed
- [ ] File drag & drop works
- [ ] Configuration changes take effect
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