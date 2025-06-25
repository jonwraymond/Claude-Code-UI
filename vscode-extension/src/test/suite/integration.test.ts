import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { activate } from '../../extension';
import { MockFactory } from '../helpers/mockFactory';

suite('Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = MockFactory.createExtensionContext();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('End-to-End Workflows', () => {
        test('should handle complete send selection workflow', async () => {
            // Setup
            const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
            const mockConfig = MockFactory.createWorkspaceConfiguration();
            sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
            
            // Activate extension
            activate(mockContext);
            const sendSelectionCommand = registerCommandStub.firstCall.args[1];
            
            // Mock editor with selection
            const mockEditor = MockFactory.createTextEditor('function hello() { return "world"; }');
            mockEditor.selection = new vscode.Selection(0, 0, 0, 35);
            mockEditor.document.getText.returns('function hello() { return "world"; }');
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            // Mock document creation
            const mockDoc = { uri: vscode.Uri.parse('untitled:result.md') };
            sandbox.stub(vscode.workspace, 'openTextDocument').resolves(mockDoc);
            const showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument').resolves();
            
            // Mock Claude Code SDK
            const queryModule = require('@anthropic-ai/claude-code');
            sandbox.stub(queryModule, 'query').returns({
                [Symbol.asyncIterator]: async function* () {
                    yield { type: 'system', subtype: 'init', session_id: '123' };
                    yield { type: 'user', message: { content: 'function hello() { return "world"; }' } };
                    yield { type: 'assistant', message: { content: 'This is a simple JavaScript function...' } };
                    yield { type: 'result', subtype: 'success', result: '# Analysis\n\nThis is a simple JavaScript function that returns the string "world".' };
                }
            });
            
            // Execute command
            await sendSelectionCommand();
            
            // Verify
            assert.ok(showTextDocumentStub.calledOnce);
            assert.strictEqual(showTextDocumentStub.firstCall.args[1], vscode.ViewColumn.Beside);
        });

        test('should handle panel message flow', async () => {
            // Setup
            const mockPanel = MockFactory.createWebviewPanel();
            const createWebviewPanelStub = sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
            const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
            const mockConfig = MockFactory.createWorkspaceConfiguration();
            sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
            
            // Activate extension
            activate(mockContext);
            const openPanelCommand = registerCommandStub.secondCall.args[1];
            
            // Open panel
            openPanelCommand(mockContext);
            
            // Simulate message handler registration
            let messageHandler: Function | null = null;
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: Function) => {
                messageHandler = handler;
                return { dispose: () => {} };
            });
            
            // Re-open panel to register handler
            openPanelCommand(mockContext);
            assert.ok(messageHandler, 'Message handler should be registered');
            
            // Mock Claude Code SDK
            const queryModule = require('@anthropic-ai/claude-code');
            const queryStub = sandbox.stub(queryModule, 'query').returns({
                [Symbol.asyncIterator]: async function* () {
                    yield { type: 'system', subtype: 'init', session_id: '456', model: 'claude-3-5-sonnet' };
                    yield { type: 'assistant', message: { content: 'Hello! How can I help you?' } };
                    yield { type: 'result', subtype: 'success', result: 'Conversation completed', duration_ms: 1000, total_cost_usd: 0.01, num_turns: 1 };
                }
            });
            
            // Simulate sending a message
            await messageHandler!({ command: 'send', text: 'Hello Claude' });
            
            // Verify messages were posted to webview
            assert.ok(mockPanel.webview.postMessage.calledWith({ type: 'connected' }));
            assert.ok(mockPanel.webview.postMessage.calledWith(sinon.match({ type: 'session_started' })));
            assert.ok(mockPanel.webview.postMessage.calledWith(sinon.match({ type: 'assistant_message' })));
            assert.ok(mockPanel.webview.postMessage.calledWith(sinon.match({ type: 'result' })));
        });

        test('should handle settings management', async () => {
            // Setup
            const mockPanel = MockFactory.createWebviewPanel();
            sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
            const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
            const mockConfig = MockFactory.createWorkspaceConfiguration();
            const getConfigStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
            
            // Activate and open panel
            activate(mockContext);
            const openPanelCommand = registerCommandStub.secondCall.args[1];
            
            let messageHandler: Function | null = null;
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: Function) => {
                messageHandler = handler;
                return { dispose: () => {} };
            });
            
            openPanelCommand(mockContext);
            
            // Test getting current settings
            await messageHandler!({ command: 'getCurrentSettings' });
            assert.ok(mockPanel.webview.postMessage.calledWith(sinon.match({ command: 'currentSettings' })));
            
            // Test saving settings
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage');
            await messageHandler!({ 
                command: 'saveSettings', 
                settings: { model: 'claude-3-opus-20240229', maxTurns: 10 } 
            });
            
            assert.ok(mockConfig.update.calledWith('model', 'claude-3-opus-20240229'));
            assert.ok(mockConfig.update.calledWith('maxTurns', 10));
            assert.ok(showInfoStub.calledWith('Claude Code settings saved.'));
            
            // Test resetting settings
            await messageHandler!({ command: 'resetSettings' });
            assert.ok(mockConfig.update.calledWith('model', undefined));
            assert.ok(showInfoStub.calledWith('Claude Code settings reset to defaults.'));
        });

        test('should handle file operations', async () => {
            // Setup
            const mockPanel = MockFactory.createWebviewPanel();
            sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
            const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
            sandbox.stub(vscode.workspace, 'getConfiguration').returns(MockFactory.createWorkspaceConfiguration());
            
            // Activate and open panel
            activate(mockContext);
            const openPanelCommand = registerCommandStub.secondCall.args[1];
            
            let messageHandler: Function | null = null;
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: Function) => {
                messageHandler = handler;
                return { dispose: () => {} };
            });
            
            openPanelCommand(mockContext);
            
            // Test file drop
            const fileContent = 'console.log("test");';
            const readFileStub = sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Buffer.from(fileContent));
            
            await messageHandler!({ command: 'drop', path: 'file:///test.js' });
            
            assert.ok(readFileStub.calledOnce);
            assert.ok(mockPanel.webview.postMessage.calledWith(sinon.match({ 
                type: 'file', 
                text: fileContent,
                name: 'file:///test.js'
            })));
        });

        test('should handle error scenarios gracefully', async () => {
            // Setup
            const mockPanel = MockFactory.createWebviewPanel();
            sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
            const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage');
            sandbox.stub(vscode.workspace, 'getConfiguration').returns(MockFactory.createWorkspaceConfiguration());
            
            // Activate and open panel
            activate(mockContext);
            const openPanelCommand = registerCommandStub.secondCall.args[1];
            
            let messageHandler: Function | null = null;
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: Function) => {
                messageHandler = handler;
                return { dispose: () => {} };
            });
            
            openPanelCommand(mockContext);
            
            // Test API error
            const queryModule = require('@anthropic-ai/claude-code');
            sandbox.stub(queryModule, 'query').throws(new Error('API Key Invalid'));
            
            await messageHandler!({ command: 'send', text: 'Hello' });
            
            assert.ok(showErrorStub.calledWith('Error querying Claude Code: API Key Invalid'));
            assert.ok(mockPanel.webview.postMessage.calledWith(sinon.match({ 
                type: 'error', 
                text: 'API Key Invalid' 
            })));
        });
    });
});