"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewContent = getWebviewContent;
const vscode = __importStar(require("vscode"));
function getWebviewContent(webview, extensionUri) {
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
      <div class="header-actions">
        <div class="status" id="status">Disconnected</div>
        <button class="settings-button" id="settings-button" title="Settings">⚙️</button>
      </div>
    </div>
    
    <div class="session-info" id="session-info" style="display: none;">
      <span class="session-label">Session:</span>
      <span id="session-id"></span>
      <span class="session-model" id="session-model"></span>
    </div>
    
    <div class="chat-container" id="chat-container"></div>
    
    <div class="input-container">
      <!-- Context Selection Section -->
      <div class="context-section" id="context-section">
        <div class="context-header">
          <span>Context & References</span>
          <div class="context-actions">
            <button class="context-button" id="add-files">📁 Files</button>
            <button class="context-button" id="add-selection">📄 Selection</button>
            <button class="context-button" id="workspace-info">🔍 Workspace</button>
          </div>
        </div>
        <div class="context-items" id="context-items">
          <div class="context-placeholder" style="color: var(--vscode-descriptionForeground); font-size: 11px; font-style: italic;">
            Add files, selections, or use @ mentions for context
          </div>
        </div>
      </div>

      <!-- File Browser (Hidden by default) -->
      <div class="file-browser" id="file-browser">
        <div class="file-browser-header">
          <span>Select Files</span>
          <input type="text" class="file-browser-search" id="file-search" placeholder="Search files...">
        </div>
        <div class="file-browser-content" id="file-browser-content">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- @ Mention Popup (Hidden by default) -->
      <div class="mention-popup" id="mention-popup">
        <!-- Populated by JS -->
      </div>

      <textarea id="input" placeholder="Ask Claude Code to help with your coding task... Use @ to reference files or symbols"></textarea>
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
  
  <!-- Settings Panel -->
  <div class="settings-overlay" id="settings-overlay">
    <div class="settings-panel">
      <div class="settings-header">
        <h3>Claude Code Settings</h3>
        <button class="close-settings" id="close-settings">✕</button>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <h4>🤖 Model Configuration</h4>
          <div class="setting-item">
            <label for="model-select">Model:</label>
            <select id="model-select">
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
              <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
            </select>
          </div>
          <div class="setting-item">
            <label for="max-turns">Max Turns:</label>
            <input type="number" id="max-turns" min="1" max="20" value="5">
          </div>
        </div>

        <div class="settings-section">
          <h4>🔗 Connection</h4>
          <div class="setting-item">
            <label for="server-url">Server URL:</label>
            <input type="text" id="server-url" value="http://localhost:8765" placeholder="Server URL">
          </div>
          <div class="setting-item">
            <label for="output-format">Output Format:</label>
            <select id="output-format">
              <option value="stream-json">Stream JSON</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h4>🛠️ Tools & Permissions</h4>
          <div class="setting-item">
            <label for="permission-mode">Permission Mode:</label>
            <select id="permission-mode">
              <option value="default">Default</option>
              <option value="acceptEdits">Accept Edits</option>
              <option value="bypassPermissions">Bypass Permissions</option>
              <option value="plan">Plan Mode</option>
            </select>
          </div>
          <div class="setting-item">
            <label>Allowed Tools:</label>
            <div class="tools-list" id="allowed-tools">
              <label><input type="checkbox" value="Read" checked> Read</label>
              <label><input type="checkbox" value="Write" checked> Write</label>
              <label><input type="checkbox" value="Bash" checked> Bash</label>
              <label><input type="checkbox" value="Python" checked> Python</label>
              <label><input type="checkbox" value="Glob"> Glob</label>
              <label><input type="checkbox" value="Grep"> Grep</label>
              <label><input type="checkbox" value="Edit"> Edit</label>
              <label><input type="checkbox" value="Task"> Task</label>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>🔌 MCP Configuration</h4>
          <div class="setting-item">
            <label for="mcp-config">MCP Config File:</label>
            <input type="text" id="mcp-config" placeholder="Path to MCP config JSON file">
            <button class="browse-button" id="browse-mcp">Browse</button>
          </div>
          <div class="setting-item">
            <label for="permission-prompt-tool">Permission Prompt Tool:</label>
            <input type="text" id="permission-prompt-tool" placeholder="e.g., mcp__auth__prompt">
          </div>
        </div>

        <div class="settings-section">
          <h4>💬 Prompts</h4>
          <div class="setting-item">
            <label for="system-prompt">Custom System Prompt:</label>
            <textarea id="system-prompt" placeholder="Custom system prompt to guide Claude's behavior" rows="3"></textarea>
          </div>
          <div class="setting-item">
            <label for="append-system-prompt">Append to System Prompt:</label>
            <textarea id="append-system-prompt" placeholder="Text to append to the default system prompt" rows="2"></textarea>
          </div>
        </div>

        <div class="settings-actions">
          <button class="save-settings" id="save-settings">Save Settings</button>
          <button class="reset-settings" id="reset-settings">Reset to Defaults</button>
        </div>
      </div>
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
//# sourceMappingURL=panel.js.map