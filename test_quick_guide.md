# Quick Testing Guide for VS Code

## 1. Python Tests

### Setup Virtual Environment (One-time)
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Mac/Linux
# or
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt -r requirements-test.txt
```

### Run Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/unit/test_server.py

# Run specific test
pytest tests/unit/test_server.py::TestClaudeCodeServer::test_health_endpoint -v

# Run only unit tests
pytest -m unit

# Run with live output
pytest -s -v
```

## 2. VS Code Extension Tests

### Setup (One-time)
```bash
cd vscode-extension
npm install
```

### Run Tests
```bash
cd vscode-extension
npm test
```

## 3. Integration Tests with Running Server

### Terminal 1: Start Server
```bash
source venv/bin/activate
python src/claude_code_server.py
```

### Terminal 2: Run Tests
```bash
source venv/bin/activate
python test_quick.py
python test_mcp.py
pytest tests/integration
```

## 4. Using VS Code Testing UI

### Install Python Test Extension
1. Install "Python" extension by Microsoft
2. Click on Testing icon in sidebar (flask icon)
3. Configure test framework: Select "pytest"
4. Tests will appear in the sidebar

### Run Tests in UI
- Click play button next to test name
- Click "Run All Tests" at top
- View results inline
- Debug tests with breakpoints

## 5. Quick Commands with Make

```bash
# Run everything
make test

# Run specific suites
make test-python
make test-vscode
make test-integration

# Generate coverage report
make coverage

# Format code
make format

# Check linting
make lint
```

## 6. VS Code Keyboard Shortcuts

- `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win/Linux): Command palette
- Type "Python: Run All Tests"
- Type "Python: Debug Test Method"

## 7. Watch Mode (Continuous Testing)

```bash
# Python tests in watch mode
pip install pytest-watch
ptw

# VS Code extension in watch mode
cd vscode-extension
npm run watch
```