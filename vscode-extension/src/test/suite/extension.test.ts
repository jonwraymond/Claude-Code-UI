// @ts-nocheck
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';
import { MockFactory } from '../helpers/mockFactory';

suite('Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let registerCommandStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;
    let mockContext: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Stub VS Code API
        registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
        getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration');
        
        // Create mock context
        mockContext = MockFactory.createExtensionContext();
        
        // Setup default configuration
        const mockConfig = MockFactory.createWorkspaceConfiguration();
        getConfigurationStub.returns(mockConfig);
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('Activation', () => {
        test('should register all commands on activation', () => {
            activate(mockContext);
            
            assert.strictEqual(registerCommandStub.callCount, 2);
            assert.strictEqual(registerCommandStub.firstCall.args[0], 'claudeCode.sendSelection');
            assert.strictEqual(registerCommandStub.secondCall.args[0], 'claudeCode.openPanel');
        });

        test('should add disposables to subscriptions', () => {
            const mockDisposable1 = { dispose: sinon.stub() };
            const mockDisposable2 = { dispose: sinon.stub() };
            
            registerCommandStub.onFirstCall().returns(mockDisposable1);
            registerCommandStub.onSecondCall().returns(mockDisposable2);
            
            activate(mockContext);
            
            assert.strictEqual(mockContext.subscriptions.length, 2);
            assert.strictEqual(mockContext.subscriptions[0], mockDisposable1);
            assert.strictEqual(mockContext.subscriptions[1], mockDisposable2);
        });
    });

    suite('Send Selection Command', () => {
        let sendSelectionCommand: Function;
        let activeTextEditorStub: sinon.SinonStub;
        let openTextDocumentStub: sinon.SinonStub;
        let showTextDocumentStub: sinon.SinonStub;
        
        setup(() => {
            // Get the sendSelection command handler
            activate(mockContext);
            sendSelectionCommand = registerCommandStub.firstCall.args[1];
            
            activeTextEditorStub = sandbox.stub(vscode.window, 'activeTextEditor');
            openTextDocumentStub = sandbox.stub(vscode.workspace, 'openTextDocument');
            showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument');
        });

        test('should return early if no active editor', async () => {
            activeTextEditorStub.value(undefined);
            
            await sendSelectionCommand();
            
            assert.strictEqual(showErrorMessageStub.called, false);
            assert.strictEqual(openTextDocumentStub.called, false);
        });

        test('should handle empty selection', async () => {
            const mockEditor = MockFactory.createTextEditor('test content');
            activeTextEditorStub.value(mockEditor);
            
            // Mock empty selection
            mockEditor.selection = new vscode.Selection(0, 0, 0, 0);
            mockEditor.document.getText.returns('');
            
            await sendSelectionCommand();
            
            // Should still attempt to query with empty text
            assert.strictEqual(mockEditor.document.getText.called, true);
        });

        test('should show error message on query failure', async () => {
            const mockEditor = MockFactory.createTextEditor('test content');
            mockEditor.selection = new vscode.Selection(0, 0, 0, 10);
            mockEditor.document.getText.returns('test content');
            activeTextEditorStub.value(mockEditor);
            
            // Mock the query module to throw an error
            const queryModule = require('@anthropic-ai/claude-code');
            sandbox.stub(queryModule, 'query').throws(new Error('API Error'));
            
            await sendSelectionCommand();
            
            assert.strictEqual(showErrorMessageStub.called, true);
            assert.strictEqual(showErrorMessageStub.firstCall.args[0], 'Failed to get response from Claude Code: API Error');
        });
    });

    suite('Configuration', () => {
        test('should get all configuration options correctly', async () => {
            const mockConfig = MockFactory.createWorkspaceConfiguration();
            mockConfig.get.withArgs('maxTurns').returns(10);
            mockConfig.get.withArgs('model').returns('claude-3-opus-20240229');
            mockConfig.get.withArgs('systemPrompt').returns('You are helpful');
            mockConfig.get.withArgs('allowedTools').returns(['tool1', 'tool2']);
            
            getConfigurationStub.returns(mockConfig);
            
            // Activate and get command
            activate(mockContext);
            const sendSelectionCommand = registerCommandStub.firstCall.args[1];
            
            // Mock active editor
            const mockEditor = MockFactory.createTextEditor('test');
            mockEditor.document.getText.returns('test');
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            // Spy on query function to check options
            const queryModule = require('@anthropic-ai/claude-code');
            const queryStub = sandbox.stub(queryModule, 'query').returns({
                [Symbol.asyncIterator]: async function* () {
                    yield { type: 'result', subtype: 'success', result: 'test response' };
                }
            });
            
            await sendSelectionCommand();
            
            const queryOptions = queryStub.firstCall.args[0].options;
            assert.strictEqual(queryOptions.maxTurns, 10);
            assert.strictEqual(queryOptions.model, 'claude-3-opus-20240229');
            assert.strictEqual(queryOptions.systemPrompt, 'You are helpful');
            assert.deepStrictEqual(queryOptions.allowedTools, ['tool1', 'tool2']);
        });

        test('should handle MCP config path resolution', async () => {
            const mockConfig = MockFactory.createWorkspaceConfiguration();
            mockConfig.get.withArgs('mcpConfig').returns('mcp.json');
            getConfigurationStub.returns(mockConfig);
            
            // Mock workspace folder
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/workspace')
            };
            sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
            
            activate(mockContext);
            const sendSelectionCommand = registerCommandStub.firstCall.args[1];
            
            // Mock active editor
            const mockEditor = MockFactory.createTextEditor('test');
            mockEditor.document.getText.returns('test');
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            // Spy on query function
            const queryModule = require('@anthropic-ai/claude-code');
            const queryStub = sandbox.stub(queryModule, 'query').returns({
                [Symbol.asyncIterator]: async function* () {
                    yield { type: 'result', subtype: 'success', result: 'test' };
                }
            });
            
            await sendSelectionCommand();
            
            const queryOptions = queryStub.firstCall.args[0].options;
            assert.strictEqual(queryOptions.mcpConfig, '/workspace/mcp.json');
        });
    });

    suite('Deactivation', () => {
        test('should complete without errors', () => {
            assert.doesNotThrow(() => deactivate());
        });
    });
});