"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const sdk_1 = require("@anthropic-ai/sdk");
const panel_1 = require("./panel");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('claudeCode.sendSelection', sendSelection), vscode.commands.registerCommand('claudeCode.openPanel', () => openPanel(context)));
}
async function sendSelection() {
    var _a, _b, _c;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const text = editor.document.getText(editor.selection);
    const config = vscode.workspace.getConfiguration('claudeCode');
    const apiKey = config.get('apiKey');
    if (!apiKey) {
        vscode.window.showErrorMessage('Please set claudeCode.apiKey in your settings');
        return;
    }
    const client = new sdk_1.Anthropic({ apiKey, baseURL: config.get('server') });
    try {
        const resp = await client.messages.create({
            model: config.get('model'),
            max_tokens: config.get('memory'),
            messages: [{ role: 'user', content: text }]
        });
        const content = (_c = (_b = (_a = resp.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) !== null && _c !== void 0 ? _c : '';
        const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content });
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    }
    catch (err) {
        vscode.window.showErrorMessage(String(err));
    }
}
function openPanel(context) {
    const panel = vscode.window.createWebviewPanel('claudeCode', 'Claude Code', vscode.ViewColumn.Beside, { enableScripts: true });
    panel.webview.html = (0, panel_1.getWebviewContent)(panel.webview, context.extensionUri);
    panel.webview.onDidReceiveMessage(async (msg) => {
        var _a, _b, _c;
        if (msg.command === 'send') {
            const config = vscode.workspace.getConfiguration('claudeCode');
            const apiKey = config.get('apiKey');
            if (!apiKey) {
                panel.webview.postMessage({ type: 'error', text: 'Missing API key' });
                return;
            }
            const client = new sdk_1.Anthropic({ apiKey, baseURL: config.get('server') });
            try {
                const resp = await client.messages.create({
                    model: config.get('model'),
                    max_tokens: config.get('memory'),
                    messages: [{ role: 'user', content: msg.text }]
                });
                const content = (_c = (_b = (_a = resp.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) !== null && _c !== void 0 ? _c : '';
                panel.webview.postMessage({ type: 'response', text: content });
            }
            catch (err) {
                panel.webview.postMessage({ type: 'error', text: String(err) });
            }
        }
        else if (msg.command === 'drop') {
            const uri = vscode.Uri.parse(msg.path);
            try {
                const content = (await vscode.workspace.fs.readFile(uri)).toString();
                panel.webview.postMessage({ type: 'file', text: content, name: msg.path });
            }
            catch (err) {
                panel.webview.postMessage({ type: 'error', text: String(err) });
            }
        }
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map
