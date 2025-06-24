import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'panel.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'panel.css'));
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet" />
  <title>Claude Code</title>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Claude Code</h2>
      <div class="status" id="status">Disconnected</div>
    </div>
    
    <div class="session-info" id="session-info" style="display: none;">
      <span class="session-label">Session:</span>
      <span id="session-id"></span>
      <span class="session-model" id="session-model"></span>
    </div>
    
    <div class="chat-container" id="chat-container"></div>
    
    <div class="input-container">
      <textarea id="input" placeholder="Ask Claude Code to help with your coding task..."></textarea>
      <div class="button-group">
        <button id="send" class="primary">Send</button>
        <button id="continue" style="display: none;">Continue</button>
        <button id="clear">Clear</button>
      </div>
    </div>
    
    <div class="stats" id="stats" style="display: none;">
      <span>Duration: <span id="duration">-</span>ms</span>
      <span>Cost: $<span id="cost">-</span></span>
      <span>Turns: <span id="turns">-</span></span>
    </div>
  </div>
  
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
