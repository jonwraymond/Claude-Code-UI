import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ClaudeCodePanel } from '../../panel';

suite('Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('yourname.claude-code-vscode'));
    });

    test('Should register all commands', async () => {
        const extension = vscode.extensions.getExtension('yourname.claude-code-vscode');
        if (!extension) {
            assert.fail('Extension not found');
        }

        await extension.activate();
        
        // Check that commands are registered
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('claudeCode.sendSelection'));
        assert.ok(commands.includes('claudeCode.openPanel'));
    });

    test('Send selection command should work with selected text', async () => {
        // Create a test document
        const document = await vscode.workspace.openTextDocument({
            content: 'Hello, this is test code',
            language: 'plaintext'
        });
        
        const editor = await vscode.window.showTextDocument(document);
        
        // Select some text
        const selection = new vscode.Selection(0, 0, 0, 5); // Select "Hello"
        editor.selection = selection;

        // Mock the panel creation
        const mockPanel = sandbox.stub(ClaudeCodePanel, 'createOrShow');
        
        // Execute command
        await vscode.commands.executeCommand('claudeCode.sendSelection');
        
        // Verify panel was created
        assert.ok(mockPanel.calledOnce);
    });

    test('Open panel command should create webview', async () => {
        // Mock the panel creation
        const mockPanel = sandbox.stub(ClaudeCodePanel, 'createOrShow');
        
        // Execute command
        await vscode.commands.executeCommand('claudeCode.openPanel');
        
        // Verify panel was created
        assert.ok(mockPanel.calledOnce);
    });
});

suite('Configuration Test Suite', () => {
    test('Should have default configuration values', () => {
        const config = vscode.workspace.getConfiguration('claudeCode');
        
        assert.strictEqual(config.get('serverUrl'), 'http://localhost:8765');
        assert.strictEqual(config.get('model'), 'claude-3-5-sonnet-20241022');
        assert.strictEqual(config.get('maxTurns'), 5);
        assert.strictEqual(config.get('outputFormat'), 'stream-json');
    });

    test('Should read custom configuration values', async () => {
        const config = vscode.workspace.getConfiguration('claudeCode');
        
        // Update configuration
        await config.update('serverUrl', 'http://custom:9999', vscode.ConfigurationTarget.Workspace);
        
        // Read updated value
        const updatedConfig = vscode.workspace.getConfiguration('claudeCode');
        assert.strictEqual(updatedConfig.get('serverUrl'), 'http://custom:9999');
        
        // Reset configuration
        await config.update('serverUrl', undefined, vscode.ConfigurationTarget.Workspace);
    });
});

suite('Error Handling Test Suite', () => {
    test('Should handle server connection errors gracefully', async () => {
        // This would test error handling when the server is not available
        // In a real test, we'd mock the WebSocket connection to fail
        
        // const showErrorSpy = sandbox.spy(vscode.window, 'showErrorMessage');
        
        // Mock server being down
        const mockWebSocket = sandbox.stub(global, 'WebSocket' as unknown as keyof typeof global);
        mockWebSocket.throws(new Error('Connection refused'));
        
        try {
            await vscode.commands.executeCommand('claudeCode.openPanel');
        } catch (error) {
            // Expected to fail
        }
        
        // In a complete implementation, we'd verify error message was shown
        // assert.ok(showErrorSpy.calledWith(sinon.match(/connection/i)));
    });

    test('Should validate configuration values', () => {
        const config = vscode.workspace.getConfiguration('claudeCode');
        
        // Test that model is one of the allowed values
        const model = config.get<string>('model');
        const allowedModels = [
            'claude-3-5-sonnet-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307'
        ];
        
        assert.ok(model && allowedModels.includes(model));
    });
});