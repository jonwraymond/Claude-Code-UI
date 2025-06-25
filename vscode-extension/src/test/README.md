# VS Code Extension Testing Guide

This directory contains the test suite for the Claude Code VS Code extension.

## Test Structure

```
src/test/
├── helpers/
│   └── mockFactory.ts      # Mock factory for VS Code API objects
├── suite/
│   ├── extension.test.ts   # Unit tests for extension.ts
│   ├── panel.test.ts       # Unit tests for panel.ts
│   └── integration.test.ts # Integration tests
├── runTest.ts              # Test runner setup
└── suite/index.ts          # Test suite loader
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Generate HTML coverage report
```bash
npm run coverage:report
# Open coverage/index.html to view the report
```

### Run tests in watch mode (for development)
```bash
npm run watch
# In another terminal:
npm test
```

## Writing Tests

### Test Organization
- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test workflows and component interactions
- **End-to-End Tests**: Test complete user scenarios

### Using Mocks
The `mockFactory.ts` provides pre-configured mocks for common VS Code objects:

```typescript
import { MockFactory } from '../helpers/mockFactory';

// Create a mock webview
const mockWebview = MockFactory.createWebview();

// Create a mock extension context
const mockContext = MockFactory.createExtensionContext();

// Create a mock text editor with content
const mockEditor = MockFactory.createTextEditor('console.log("test");');
```

### Testing Async Code
Always use async/await or return promises:

```typescript
test('should handle async operations', async () => {
    const result = await someAsyncFunction();
    assert.strictEqual(result, expectedValue);
});
```

### Testing VS Code Commands
```typescript
test('should register command', () => {
    const registerStub = sandbox.stub(vscode.commands, 'registerCommand');
    
    activate(mockContext);
    
    assert.ok(registerStub.calledWith('claudeCode.openPanel'));
});
```

### Testing WebView Communication
```typescript
test('should handle webview messages', async () => {
    let messageHandler: Function;
    mockPanel.webview.onDidReceiveMessage.callsFake((handler: Function) => {
        messageHandler = handler;
    });
    
    // Trigger message
    await messageHandler({ command: 'send', text: 'Hello' });
    
    // Verify response
    assert.ok(mockPanel.webview.postMessage.calledWith(
        sinon.match({ type: 'connected' })
    ));
});
```

## Coverage Requirements
- **Target**: 80% coverage for all metrics
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Debugging Tests
1. Set breakpoints in your test files
2. Run "Extension Tests" debug configuration in VS Code
3. Tests will pause at breakpoints

## Common Issues

### Tests fail with "Cannot find module"
- Run `npm run compile` before running tests
- Ensure all imports use correct paths

### WebView tests fail
- Mock the webview properly using MockFactory
- Ensure CSP is handled in tests

### Timeout errors
- Increase timeout for long-running tests:
  ```typescript
  test('long test', async function() {
      this.timeout(10000); // 10 seconds
      // test code
  });
  ```

## Best Practices
1. **Isolate tests**: Each test should be independent
2. **Clean up**: Use setup/teardown to reset state
3. **Mock external dependencies**: Don't make real API calls
4. **Test edge cases**: Include error scenarios
5. **Keep tests simple**: One assertion per test when possible
6. **Use descriptive names**: Test names should explain what they test