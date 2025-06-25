import * as sinon from 'sinon';
import * as vscode from 'vscode';

export interface MockWebview {
    html: string;
    postMessage: sinon.SinonStub;
    onDidReceiveMessage: sinon.SinonStub;
    asWebviewUri: sinon.SinonStub;
    cspSource: string;
}

export interface MockWebviewPanel {
    webview: MockWebview;
    onDidDispose: sinon.SinonStub;
    dispose: sinon.SinonStub;
    reveal: sinon.SinonStub;
    title: string;
    viewColumn?: vscode.ViewColumn;
}

export interface MockTextDocument {
    getText: sinon.SinonStub;
    fileName: string;
    languageId: string;
}

export interface MockTextEditor {
    document: MockTextDocument;
    selection: vscode.Selection;
}

export interface MockExtensionContext {
    subscriptions: vscode.Disposable[];
    extensionUri: vscode.Uri;
    secrets: {
        get: sinon.SinonStub;
        store: sinon.SinonStub;
        delete: sinon.SinonStub;
    };
    workspaceState: {
        get: sinon.SinonStub;
        update: sinon.SinonStub;
    };
    globalState: {
        get: sinon.SinonStub;
        update: sinon.SinonStub;
    };
}

export class MockFactory {
    static createWebview(): MockWebview {
        return {
            html: '',
            postMessage: sinon.stub().resolves(true),
            onDidReceiveMessage: sinon.stub(),
            asWebviewUri: sinon.stub().returns(vscode.Uri.parse('vscode-webview://test')),
            cspSource: 'vscode-webview:'
        };
    }

    static createWebviewPanel(): MockWebviewPanel {
        return {
            webview: MockFactory.createWebview(),
            onDidDispose: sinon.stub(),
            dispose: sinon.stub(),
            reveal: sinon.stub(),
            title: 'Test Panel',
            viewColumn: vscode.ViewColumn.One
        };
    }

    static createTextDocument(content: string = '', fileName: string = 'test.ts'): MockTextDocument {
        return {
            getText: sinon.stub().returns(content),
            fileName,
            languageId: 'typescript'
        };
    }

    static createTextEditor(content: string = '', selection?: vscode.Selection): MockTextEditor {
        return {
            document: MockFactory.createTextDocument(content),
            selection: selection || new vscode.Selection(0, 0, 0, 0)
        };
    }

    static createExtensionContext(): MockExtensionContext {
        return {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/test/extension'),
            secrets: {
                get: sinon.stub(),
                store: sinon.stub().resolves(),
                delete: sinon.stub().resolves()
            },
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub().resolves()
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub().resolves()
            }
        };
    }

    static createWorkspaceConfiguration(): { [key: string]: any } & { get: sinon.SinonStub; update: sinon.SinonStub } {
        const config = {
            get: sinon.stub(),
            update: sinon.stub().resolves()
        };
        
        // Default configuration values
        config.get.withArgs('model').returns('claude-3-5-sonnet-20241022');
        config.get.withArgs('maxTurns').returns(5);
        config.get.withArgs('permissionMode').returns('default');
        config.get.withArgs('outputFormat').returns('stream-json');
        config.get.withArgs('systemPrompt').returns(undefined);
        config.get.withArgs('appendSystemPrompt').returns(undefined);
        config.get.withArgs('permissionPromptTool').returns(undefined);
        config.get.withArgs('allowedTools').returns([]);
        config.get.withArgs('disallowedTools').returns([]);
        config.get.withArgs('mcpConfig').returns(undefined);
        
        return config;
    }
}