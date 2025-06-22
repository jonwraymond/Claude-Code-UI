import * as vscode from 'vscode';
import { Anthropic } from "@anthropic-ai/sdk";
import { getWebviewContent } from './panel';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCode.sendSelection', sendSelection),
    vscode.commands.registerCommand('claudeCode.openPanel', () => openPanel(context))
  );
}

async function sendSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const text = editor.document.getText(editor.selection);
  const config = vscode.workspace.getConfiguration('claudeCode');
  const apiKey = config.get<string>('apiKey');
  if (!apiKey) {
    vscode.window.showErrorMessage('Please set claudeCode.apiKey in your settings');
    return;
  }
  const client = new Anthropic({ apiKey, baseURL: config.get<string>('server') });
  try {
    const resp = await client.messages.create({
      model: config.get<string>('model')!,
      max_tokens: config.get<number>('memory')!,
      messages: [{ role: 'user', content: text }]
    });
    const content = (resp as any).content?.[0]?.text ?? '';
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content });
    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  } catch (err: any) {
    vscode.window.showErrorMessage(String(err));
  }
}

function openPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'claudeCode',
    'Claude Code',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );
  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
  panel.webview.onDidReceiveMessage(async msg => {
    if (msg.command === 'send') {
      const config = vscode.workspace.getConfiguration('claudeCode');
      const apiKey = config.get<string>('apiKey');
      if (!apiKey) {
        panel.webview.postMessage({ type: 'error', text: 'Missing API key' });
        return;
      }
      const client = new Anthropic({ apiKey, baseURL: config.get<string>('server') });
      try {
        const resp = await client.messages.create({
          model: config.get<string>('model')!,
          max_tokens: config.get<number>('memory')!,
          messages: [{ role: 'user', content: msg.text }]
        });
        const content = (resp as any).content?.[0]?.text ?? '';
        panel.webview.postMessage({ type: 'response', text: content });
      } catch (err: any) {
        panel.webview.postMessage({ type: 'error', text: String(err) });
      }
    } else if (msg.command === 'drop') {
      const uri = vscode.Uri.parse(msg.path);
      try {
        const content = (await vscode.workspace.fs.readFile(uri)).toString();
        panel.webview.postMessage({ type: 'file', text: content, name: msg.path });
      } catch (err: any) {
        panel.webview.postMessage({ type: 'error', text: String(err) });
      }
    }
  });
}

export function deactivate() {}
