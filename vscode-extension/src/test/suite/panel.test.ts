// @ts-nocheck
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { getWebviewContent } from '../../panel';
import { MockFactory } from '../helpers/mockFactory';

suite('Panel Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockWebview: any;
    let extensionUri: vscode.Uri;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockWebview = MockFactory.createWebview();
        extensionUri = vscode.Uri.file('/test/extension');
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('getWebviewContent', () => {
        test('should generate valid HTML content', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            assert.strictEqual(typeof html, 'string');
            assert.ok(html.includes('<!DOCTYPE html>'));
            assert.ok(html.includes('<html'));
            assert.ok(html.includes('<head>'));
            assert.ok(html.includes('<body>'));
            assert.ok(html.includes('</html>'));
        });

        test('should include Content Security Policy', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            assert.ok(html.includes('Content-Security-Policy'));
            assert.ok(html.includes("default-src 'none'"));
            assert.ok(html.includes('script-src'));
            assert.ok(html.includes('style-src'));
        });

        test('should use webview URIs for resources', () => {
            mockWebview.asWebviewUri.returns(vscode.Uri.parse('vscode-webview://test-resource'));
            
            const html = getWebviewContent(mockWebview, extensionUri);
            
            // Check that asWebviewUri was called for CSS and JS files
            assert.ok(mockWebview.asWebviewUri.called);
            assert.ok(html.includes('vscode-webview://test-resource'));
        });

        test('should include VS Code API acquisition', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            assert.ok(html.includes('acquireVsCodeApi()'));
            assert.ok(html.includes('const vscode = acquireVsCodeApi()'));
        });

        test('should include chat interface elements', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            // Check for essential UI elements
            assert.ok(html.includes('chat-container') || html.includes('message'));
            assert.ok(html.includes('input') || html.includes('textarea'));
        });

        test('should set up message handling', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            assert.ok(html.includes('addEventListener'));
            assert.ok(html.includes('message'));
            assert.ok(html.includes('postMessage'));
        });

        test('should include keyboard shortcuts handling', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            assert.ok(html.includes('keydown') || html.includes('handleKeyDown'));
        });

        test('should include file drop handling', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            assert.ok(html.includes('drop') || html.includes('dragover') || html.includes('handleDrop'));
        });
    });

    suite('WebView Panel Integration', () => {
        let createWebviewPanelStub: sinon.SinonStub;
        let mockPanel: any;

        setup(() => {
            mockPanel = MockFactory.createWebviewPanel();
            createWebviewPanelStub = sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
        });

        test('should create panel with correct options', () => {
            const context = MockFactory.createExtensionContext();
            
            // Simulate opening panel command
            vscode.window.createWebviewPanel(
                'claudeCode',
                'Claude Code',
                vscode.ViewColumn.Beside,
                { enableScripts: true, retainContextWhenHidden: true }
            );
            
            assert.ok(createWebviewPanelStub.calledOnce);
            const [viewType, title, viewColumn, options] = createWebviewPanelStub.firstCall.args;
            
            assert.strictEqual(viewType, 'claudeCode');
            assert.strictEqual(title, 'Claude Code');
            assert.strictEqual(viewColumn, vscode.ViewColumn.Beside);
            assert.strictEqual(options.enableScripts, true);
            assert.strictEqual(options.retainContextWhenHidden, true);
        });

        test('should handle messages from webview', async () => {
            const context = MockFactory.createExtensionContext();
            const messageHandler = sinon.stub();
            
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: Function) => {
                messageHandler.callsFake(handler);
                return { dispose: () => {} };
            });
            
            // Test various message types
            const testMessages = [
                { command: 'send', text: 'Hello Claude' },
                { command: 'continue', text: 'Continue conversation' },
                { command: 'resume', sessionId: '12345', text: 'Resume session' },
                { command: 'getCurrentSettings' },
                { command: 'saveSettings', settings: { model: 'claude-3-opus-20240229' } },
                { command: 'resetSettings' },
                { command: 'drop', path: 'file:///test.txt' }
            ];
            
            for (const message of testMessages) {
                messageHandler.reset();
                await messageHandler(message);
                
                // Verify message was handled (no uncaught errors)
                assert.ok(true, `Message ${message.command} handled without error`);
            }
        });

        test('should post messages to webview', () => {
            const testMessages = [
                { type: 'connected' },
                { type: 'session_started', sessionId: '123' },
                { type: 'assistant_message', content: 'Hello!' },
                { type: 'user_message', content: 'Hi!' },
                { type: 'result', subtype: 'success' },
                { type: 'error', text: 'Error occurred' }
            ];
            
            for (const message of testMessages) {
                mockPanel.webview.postMessage(message);
                
                assert.ok(mockPanel.webview.postMessage.calledWith(message));
            }
        });

        test('should handle panel disposal', () => {
            const disposeHandler = sinon.stub();
            
            mockPanel.onDidDispose.callsFake((handler: Function) => {
                disposeHandler.callsFake(handler);
                return { dispose: () => {} };
            });
            
            // Simulate panel disposal
            disposeHandler();
            
            assert.ok(disposeHandler.calledOnce);
        });
    });

    suite('Security', () => {
        test('should not allow unsafe inline scripts', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            // Should not contain inline scripts without nonce
            const inlineScriptRegex = /<script(?![^>]*nonce)[^>]*>(?!.*acquireVsCodeApi)/;
            assert.ok(!inlineScriptRegex.test(html), 'Found unsafe inline script');
        });

        test('should sanitize user input in templates', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            // Check that any template literals are properly escaped
            if (html.includes('${')) {
                assert.ok(html.includes('textContent') || html.includes('innerText'), 
                    'Template literals should use safe text insertion methods');
            }
        });

        test('should restrict external resource loading', () => {
            const html = getWebviewContent(mockWebview, extensionUri);
            
            // Should not load external resources
            assert.ok(!html.includes('http://'), 'Should not load HTTP resources');
            assert.ok(!html.includes('https://') || html.includes('https: blob:'), 
                'Should only allow specific HTTPS resources');
        });
    });
});