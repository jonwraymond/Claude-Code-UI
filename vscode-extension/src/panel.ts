import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'panel.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'panel.css'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <link href="${styleUri}" rel="stylesheet">
            <title>Claude Code</title>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="tabs-container">
                        <div id="tabs" class="tabs"></div>
                        <div class="tab-actions">
                            <button id="new-tab-btn" class="tab-action-btn" title="New Chat">+</button>
                            <button id="history-btn" class="tab-action-btn" title="Session History">🕒</button>
                            <button id="settings-btn" class="tab-action-btn" title="Settings">⚙️</button>
                        </div>
                    </div>
                    <div class="header-status">
                        <div id="status" class="status">Disconnected</div>
                        <div id="session-info" style="display: none;">
                            <span class="session-label">Session:</span>
                            <span id="session-id"></span>
                            <span class="session-model" id="session-model"></span>
                        </div>
                    </div>
                </div>

                <div id="chat-container" class="chat-container"></div>
                
                <div class="input-container">
                    <div id="context-section" class="context-section">
                        <div class="context-header">
                            <span>Context</span>
                            <div class="context-actions">
                                <button id="add-files" class="context-button">Add Files</button>
                                <button id="add-selection" class="context-button">Add Selection</button>
                            </div>
                        </div>
                        <div id="context-items" class="context-items">
                             <div class="context-placeholder" style="color: var(--vscode-descriptionForeground); font-size: 11px; font-style: italic;">Add files, selections, or use @ mentions for context</div>
                        </div>
                    </div>

                    <textarea id="input" placeholder="Type your message... (Ctrl+Enter to send)"></textarea>
                    <div class="button-group">
                        <button id="send" class="primary">Send</button>
                        <button id="continue" style="display: none;">Continue</button>
                        <button id="clear">Clear</button>
                    </div>
                </div>
                 <div id="stats" class="stats" style="display: none;">
                    <span>Duration: <span id="duration">0</span>ms</span>
                    <span>Cost: $<span id="cost">0.0000</span></span>
                    <span>Turns: <span id="turns">0</span></span>
                </div>
            </div>
            <div id="mention-popup" class="mention-popup"></div>
            <div id="file-browser" class="file-browser">
                <div class="file-browser-header">
                    <span>Select files to add to context</span>
                    <input id="file-search" type="text" placeholder="Search files...">
                </div>
                <div id="file-browser-content" class="file-browser-content"></div>
            </div>
            <div id="history-overlay" class="history-overlay">
                <div class="history-popup">
                    <div class="history-header">
                        <h3>Session History</h3>
                        <button id="close-history" class="close-history">×</button>
                    </div>
                    <div id="history-content" class="history-content"></div>
                </div>
            </div>
            <div id="settings-overlay" class="settings-overlay">
                <div class="settings-panel">
                    <div class="settings-header">
                        <h3>Settings</h3>
                        <button id="close-settings" class="close-settings">×</button>
                    </div>
                    <div class="settings-content">
                        <!-- Settings will be populated here by panel.js -->
                    </div>
                    <div class="settings-actions">
                        <button id="reset-settings" class="secondary">Reset to Defaults</button>
                        <button id="save-settings" class="primary">Save Settings</button>
                    </div>
                </div>
            </div>
            <div id="drop-overlay"></div>
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