import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ClaudeCodePanel } from '../../panel';

suite('Panel Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let context: vscode.ExtensionContext;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock extension context
        context = {
            extensionUri: vscode.Uri.file('/test/extension'),
            subscriptions: [],
            globalState: {
                get: sandbox.stub(),
                update: sandbox.stub(),
                keys: sandbox.stub().returns([])
            } as vscode.Memento,
            workspaceState: {
                get: sandbox.stub(),
                update: sandbox.stub(),
                keys: sandbox.stub().returns([])
            } as vscode.Memento
        } as vscode.ExtensionContext;
    });

    teardown(() => {
        sandbox.restore();
        ClaudeCodePanel.currentPanel?.dispose();
    });

    test('Should create panel singleton', () => {
        // Create first panel
        ClaudeCodePanel.createOrShow(context);
        const panel1 = ClaudeCodePanel.currentPanel;
        assert.ok(panel1);

        // Try to create second panel - should return same instance
        ClaudeCodePanel.createOrShow(context);
        const panel2 = ClaudeCodePanel.currentPanel;
        assert.strictEqual(panel1, panel2);
    });

    test('Should dispose panel properly', () => {
        ClaudeCodePanel.createOrShow(context);
        const panel = ClaudeCodePanel.currentPanel;
        assert.ok(panel);

        panel!.dispose();
        assert.strictEqual(ClaudeCodePanel.currentPanel, undefined);
    });

    test('Should handle messages from webview', async () => {
        ClaudeCodePanel.createOrShow(context);
        const panel = ClaudeCodePanel.currentPanel!;
        
        // Mock WebSocket
        const mockWs = {
            readyState: 1, // OPEN
            send: sandbox.stub(),
            close: sandbox.stub()
        };
        
        // @ts-expect-error - Access private property for testing
        panel._ws = mockWs as WebSocket;

        // Simulate message from webview
        const testMessage = {
            command: 'query',
            message: 'Test query',
            files: []
        };

        // @ts-expect-error - Access private method for testing
        await panel._handleWebviewMessage(testMessage);

        // Verify WebSocket send was called
        assert.ok(mockWs.send.called);
        const sentData = JSON.parse(mockWs.send.firstCall.args[0]);
        assert.strictEqual(sentData.type, 'query');
        assert.strictEqual(sentData.message, 'Test query');
    });

    test('Should update webview HTML with proper resources', () => {
        ClaudeCodePanel.createOrShow(context);
        const panel = ClaudeCodePanel.currentPanel!;
        
        // @ts-expect-error - Access private method for testing
        const html = panel._getHtmlForWebview(panel._panel.webview);
        
        // Verify HTML contains necessary elements
        assert.ok(html.includes('<!DOCTYPE html>'));
        assert.ok(html.includes('<script'));
        assert.ok(html.includes('vscode-webview-resource'));
        assert.ok(html.includes('chat-container'));
    });

    test('Should handle file attachments', async () => {
        ClaudeCodePanel.createOrShow(context);
        const panel = ClaudeCodePanel.currentPanel!;
        
        // Mock file reading
        const mockFileContent = 'test file content';
        sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Buffer.from(mockFileContent));
        
        // Mock WebSocket
        const mockWs = {
            readyState: 1,
            send: sandbox.stub(),
            close: sandbox.stub()
        };
        
        // @ts-expect-error
        panel._ws = mockWs as WebSocket;

        // Simulate message with file
        const testMessage = {
            command: 'query',
            message: 'Analyze this file',
            files: ['/test/file.js']
        };

        // @ts-expect-error
        await panel._handleWebviewMessage(testMessage);

        // Verify file was included in message
        assert.ok(mockWs.send.called);
        const sentData = JSON.parse(mockWs.send.firstCall.args[0]);
        assert.ok(sentData.message.includes('test file content'));
    });

    test('Should reconnect WebSocket on disconnect', (done) => {
        ClaudeCodePanel.createOrShow(context);
        const panel = ClaudeCodePanel.currentPanel!;
        
        // Mock WebSocket constructor
        let wsInstances = 0;
        const MockWebSocket = sandbox.stub().callsFake(function(this: WebSocket) {
            wsInstances++;
            this.readyState = 1;
            this.send = sandbox.stub();
            this.close = sandbox.stub();
            
            // Simulate connection close after first instance
            if (wsInstances === 1) {
                setTimeout(() => {
                    this.onclose?.({ code: 1000, reason: 'Normal closure' });
                }, 10);
            }
            
            return this;
        });
        
        // @ts-expect-error
        global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
        
        // @ts-expect-error - Call connect method
        panel._connectWebSocket();
        
        // Verify reconnection happens
        setTimeout(() => {
            assert.ok(wsInstances >= 2, 'WebSocket should reconnect');
            done();
        }, 100);
    });
});

suite('Panel Message Handling', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Should handle different message types from server', () => {
        const mockWebview = {
            postMessage: sandbox.stub()
        };

        // Test session message
        const sessionMsg = {
            type: 'session',
            sessionId: 'test-123',
            model: 'claude-3-5-sonnet'
        };
        
        // @ts-expect-error - Access private static method
        ClaudeCodePanel._handleServerMessage(sessionMsg, mockWebview as vscode.Webview);
        
        assert.ok(mockWebview.postMessage.calledWith({
            command: 'session',
            sessionId: 'test-123',
            model: 'claude-3-5-sonnet'
        }));

        // Test token message
        const tokenMsg = {
            type: 'token',
            content: 'Hello world'
        };
        
        // @ts-expect-error
        ClaudeCodePanel._handleServerMessage(tokenMsg, mockWebview as vscode.Webview);
        
        assert.ok(mockWebview.postMessage.calledWith({
            command: 'token',
            content: 'Hello world'
        }));
    });

    test('Should handle error messages', () => {
        const mockWebview = {
            postMessage: sandbox.stub()
        };
        
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage');

        const errorMsg = {
            type: 'error',
            error: 'Connection failed'
        };
        
        // @ts-expect-error
        ClaudeCodePanel._handleServerMessage(errorMsg, mockWebview as vscode.Webview);
        
        assert.ok(showErrorStub.calledWith('Claude Code Error: Connection failed'));
        assert.ok(mockWebview.postMessage.calledWith({
            command: 'error',
            error: 'Connection failed'
        }));
    });
});