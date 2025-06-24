# Comprehensive Testing Guide

This guide covers all aspects of testing the Claude Code UI project, including unit tests, integration tests, and end-to-end testing for both the Python server and VS Code extension.

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Python Server Testing](#python-server-testing)
3. [VS Code Extension Testing](#vs-code-extension-testing)
4. [Running Tests](#running-tests)
5. [Writing New Tests](#writing-new-tests)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Test Coverage](#test-coverage)
8. [Troubleshooting](#troubleshooting)

## Testing Architecture

```
Claude-Code-UI/
├── tests/                      # Python tests
│   ├── __init__.py
│   ├── conftest.py            # Shared fixtures
│   ├── unit/                  # Unit tests
│   │   └── test_server.py
│   ├── integration/           # Integration tests
│   │   └── test_server_integration.py
│   └── fixtures/              # Test data
├── vscode-extension/
│   └── src/test/              # TypeScript tests
│       ├── runTest.ts         # Test runner
│       └── suite/             # Test suites
│           ├── index.ts
│           ├── extension.test.ts
│           └── panel.test.ts
├── pytest.ini                 # Python test configuration
├── requirements-test.txt      # Python test dependencies
└── .github/workflows/test.yml # CI/CD configuration
```

## Python Server Testing

### Setup

1. **Install test dependencies:**
   ```bash
   pip install -r requirements-test.txt
   ```

2. **Test Frameworks:**
   - **pytest**: Main test framework
   - **pytest-asyncio**: Async test support
   - **pytest-cov**: Coverage reporting
   - **aioresponses**: HTTP mocking

### Running Python Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m "not slow"    # Skip slow tests

# Run specific test file
pytest tests/unit/test_server.py

# Run with verbose output
pytest -v

# Run specific test
pytest tests/unit/test_server.py::TestClaudeCodeServer::test_health_endpoint
```

### Python Test Structure

#### Unit Tests (`tests/unit/`)
- Test individual components in isolation
- Mock external dependencies
- Fast execution
- Example: Testing server endpoints with mocked SDK

#### Integration Tests (`tests/integration/`)
- Test component interactions
- May use real services
- Test full workflows
- Example: Complete conversation flow testing

### Key Test Fixtures

```python
@pytest.fixture
async def test_client(claude_server):
    """HTTP test client for server testing."""
    
@pytest.fixture
def mock_claude_sdk():
    """Mocked Claude SDK for isolated testing."""
    
@pytest.fixture
def sample_query_payload():
    """Standard query payload for consistency."""
```

## VS Code Extension Testing

### Setup

1. **Install dependencies:**
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   ```

2. **Test Frameworks:**
   - **Mocha**: Test runner
   - **Sinon**: Mocking/stubbing
   - **VS Code Test API**: Extension testing

### Running VS Code Tests

```bash
cd vscode-extension

# Run all tests
npm test

# Compile and run tests
npm run pretest && npm test

# Run in watch mode during development
npm run watch
```

### VS Code Test Categories

1. **Extension Activation Tests**
   - Command registration
   - Configuration loading
   - Extension lifecycle

2. **Panel Tests**
   - WebView creation/disposal
   - Message handling
   - WebSocket communication

3. **Integration Tests**
   - File operations
   - Error handling
   - Configuration changes

## Running Tests

### Quick Test Commands

```bash
# Python unit tests only
pytest tests/unit -v

# Python integration tests with server
python src/claude_code_server.py &
pytest tests/integration -v
pkill -f claude_code_server.py

# VS Code extension tests
cd vscode-extension && npm test

# Run everything
./run_all_tests.sh  # Create this script
```

### Test Script

Create `run_all_tests.sh`:
```bash
#!/bin/bash
set -e

echo "Running Python tests..."
pytest -v --cov=src

echo "Running VS Code extension tests..."
cd vscode-extension
npm test
cd ..

echo "Running integration tests..."
python src/claude_code_server.py &
SERVER_PID=$!
sleep 3
python test_quick.py
python test_mcp.py
kill $SERVER_PID

echo "All tests passed!"
```

## Writing New Tests

### Python Test Template

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.unit
class TestNewFeature:
    """Test suite for new feature."""
    
    async def test_feature_success(self, test_client, mock_claude_sdk):
        """Test successful feature execution."""
        # Arrange
        payload = {"key": "value"}
        
        # Act
        resp = await test_client.post("/endpoint", json=payload)
        
        # Assert
        assert resp.status == 200
        data = await resp.json()
        assert "expected_key" in data
    
    async def test_feature_error(self, test_client):
        """Test error handling."""
        # Test error scenarios
```

### VS Code Test Template

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

suite('New Feature Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Should perform expected behavior', async () => {
        // Arrange
        const mockFunction = sandbox.stub();
        
        // Act
        await vscode.commands.executeCommand('myCommand');
        
        // Assert
        assert.ok(mockFunction.calledOnce);
    });
});
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/test.yml`) runs:

1. **Python Tests**
   - Multiple Python versions (3.8-3.11)
   - Linting (flake8, black, isort)
   - Type checking (mypy)
   - Unit and integration tests
   - Coverage reporting

2. **VS Code Extension Tests**
   - Multiple OS (Ubuntu, Windows, macOS)
   - Multiple Node versions (18.x, 20.x)
   - Linting and compilation
   - Extension tests

3. **Integration Tests**
   - Full system tests
   - Server startup/shutdown
   - API key validation

## Test Coverage

### Viewing Coverage Reports

```bash
# Generate HTML coverage report
pytest --cov=src --cov-report=html

# Open report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

### Coverage Goals
- Minimum 80% coverage for critical paths
- 90%+ for server endpoints
- 70%+ for UI components

## Troubleshooting

### Common Issues

1. **"Server already running" error**
   ```bash
   # Kill existing server
   pkill -f claude_code_server.py
   ```

2. **VS Code tests fail on Linux**
   ```bash
   # Install xvfb for headless testing
   sudo apt-get install xvfb
   export DISPLAY=':99.0'
   Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
   ```

3. **Import errors in tests**
   ```bash
   # Ensure PYTHONPATH includes src
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
   ```

4. **WebSocket connection failures**
   - Check server is running
   - Verify port is not blocked
   - Check firewall settings

### Debug Mode

```bash
# Run tests with debugging
pytest -v -s --log-cli-level=DEBUG

# VS Code extension debug
# Press F5 in VS Code with extension folder open
```

## Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Use fixtures for setup/teardown
   - Mock external dependencies

2. **Async Testing**
   - Use `pytest-asyncio` markers
   - Properly await async operations
   - Handle cleanup in fixtures

3. **Mocking**
   - Mock at the boundary (SDK, WebSocket)
   - Use real implementations when possible
   - Verify mock interactions

4. **Test Data**
   - Use fixtures for common data
   - Keep test data minimal
   - Use factories for complex objects

5. **Error Testing**
   - Test both success and failure paths
   - Verify error messages
   - Test edge cases

## Contributing Tests

When adding new features:

1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Add appropriate test markers
4. Update this documentation
5. Verify CI passes

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Sinon.js Guide](https://sinonjs.org/releases/latest/)
- [GitHub Actions Testing](https://docs.github.com/en/actions/automating-builds-and-tests)