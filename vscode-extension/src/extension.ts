import * as vscode from 'vscode';
import { getWebviewContent } from './panel';
import WebSocket from 'ws';

// Base URL for the Claude Code Python server
const DEFAULT_SERVER_URL = 'http://localhost:8765';

// Type definitions
interface ClaudeMessage {
  type: string;
  content?: string;
  sessionId?: string;
  model?: string;
  text?: string;
  message?: {
    content: string;
  };
  subtype?: string;
  result?: string;
  is_error?: boolean;
  stats?: {
    duration_ms: number;
    total_cost_usd: number;
    num_turns: number;
  };
  error_type?: string;
  error_message?: string;
  [key: string]: unknown;
}

export function activate(context: vscode.ExtensionContext) {
  // Check if auto-start is enabled
  const config = vscode.workspace.getConfiguration('claudeCode');
  if (config.get<boolean>('autoStartServer')) {
    startPythonServer(context);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCode.sendSelection', sendSelection),
    vscode.commands.registerCommand('claudeCode.openPanel', () => openPanel(context))
  );
}

async function startPythonServer(_context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('claudeCode');
  const serverUrl = config.get<string>('serverUrl') || DEFAULT_SERVER_URL;
  
  // Check if server is already running
  try {
    const response = await fetch(`${serverUrl}/health`);
    if (response.ok) {
      const health = await response.json();
      if (!health.claude_cli_installed) {
        vscode.window.showWarningMessage('Claude Code CLI not installed. Please install with: npm install -g @anthropic-ai/claude-code');
      }
      if (!health.api_key_set) {
        vscode.window.showErrorMessage('ANTHROPIC_API_KEY not set. Please set your API key.');
      }
      vscode.window.showInformationMessage('Claude Code server is already running');
      return;
    }
  } catch (error) {
    // Server not running, provide instructions
    vscode.window.showWarningMessage(
      'Claude Code server is not running. Please start it with: python src/claude_code_server.py',
      'Show Instructions'
    ).then(selection => {
      if (selection === 'Show Instructions') {
        const instructions = `
# Claude Code Server Setup

1. Install dependencies:
   pip install -r requirements.txt

2. Set your Anthropic API key:
   export ANTHROPIC_API_KEY="your-api-key"

3. Start the server:
   python src/claude_code_server.py
   # Or use the start script:
   ./start_server.sh

The server will run on http://localhost:8765 by default.
        `;
        vscode.workspace.openTextDocument({ content: instructions, language: 'markdown' })
          .then(doc => vscode.window.showTextDocument(doc));
      }
    });
  }
}

function getAllOptions(config: vscode.WorkspaceConfiguration) {
  // Get all Claude Code options from VS Code configuration
  const options: Record<string, unknown> = {
    max_turns: config.get<number>('maxTurns') || 5,
    model: config.get<string>('model') || 'claude-3-5-sonnet-20241022',
    permission_mode: config.get<string>('permissionMode') || 'default',
    output_format: config.get<string>('outputFormat') || 'stream-json',
  };

  // Add optional string options
  const systemPrompt = config.get<string>('systemPrompt');
  if (systemPrompt) options.system_prompt = systemPrompt;
  
  const appendSystemPrompt = config.get<string>('appendSystemPrompt');
  if (appendSystemPrompt) options.append_system_prompt = appendSystemPrompt;
  
  const permissionPromptTool = config.get<string>('permissionPromptTool');
  if (permissionPromptTool) options.permission_prompt_tool = permissionPromptTool;

  // Add array options
  const allowedTools = config.get<string[]>('allowedTools');
  if (allowedTools && allowedTools.length > 0) {
    options.allowed_tools = allowedTools;
  }
  
  const disallowedTools = config.get<string[]>('disallowedTools');
  if (disallowedTools && disallowedTools.length > 0) {
    options.disallowed_tools = disallowedTools;
  }

  // Handle MCP config path
  const mcpConfigPath = config.get<string>('mcpConfig');
  if (mcpConfigPath) {
    // Convert to absolute path if relative
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder && !mcpConfigPath.startsWith('/')) {
      options.mcp_config_path = vscode.Uri.joinPath(workspaceFolder.uri, mcpConfigPath).fsPath;
    } else {
      options.mcp_config_path = mcpConfigPath;
    }
  }

  // Add workspace directory
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    options.cwd = workspaceFolder.uri.fsPath;
  }

  return options;
}

async function sendSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  
  const text = editor.document.getText(editor.selection);
  const config = vscode.workspace.getConfiguration('claudeCode');
  const serverUrl = config.get<string>('serverUrl') || DEFAULT_SERVER_URL;
  
  try {
    const response = await fetch(`${serverUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text,
        options: getAllOptions(config)
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (result.type === 'result' && result.subtype === 'success') {
      const doc = await vscode.workspace.openTextDocument({ 
        language: 'markdown', 
        content: result.result 
      });
      vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    } else if (result.type === 'result' && result.subtype === 'error_max_turns') {
      vscode.window.showWarningMessage('Maximum turns reached. Continue the conversation to proceed.');
    } else if (result.type === 'result' && result.subtype === 'error_during_execution') {
      vscode.window.showErrorMessage('Error during execution. Check the output for details.');
    } else if (result.error) {
      vscode.window.showErrorMessage(`Error: ${result.error}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to connect to Claude Code server: ${errorMessage}`);
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
  
  const config = vscode.workspace.getConfiguration('claudeCode');
  const serverUrl = config.get<string>('serverUrl') || DEFAULT_SERVER_URL;
  
  // Create WebSocket connection for streaming
  let ws: WebSocket | null = null;
  let currentSessionId: string | null = null;
  
  panel.webview.onDidReceiveMessage(async msg => {
    if (msg.command === 'send') {
      // Use WebSocket for streaming responses
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        try {
          ws = new WebSocket(`${serverUrl.replace('http://', 'ws://')}/ws`);
          
          ws.on('open', () => {
            panel.webview.postMessage({ type: 'connected' });
          });
          
          ws.on('message', (data: WebSocket.Data) => {
            const message = JSON.parse(data.toString());
            
            // Handle different message types
            if (message.type === 'system' && message.subtype === 'init') {
              currentSessionId = message.session_id;
              panel.webview.postMessage({ 
                type: 'session_started', 
                sessionId: currentSessionId,
                model: message.model,
                tools: message.tools,
                mcp_servers: message.mcp_servers,
                mcp_servers_available: message.mcp_servers_available
              });
            } else if (message.type === 'assistant') {
              panel.webview.postMessage({ 
                type: 'assistant_message', 
                content: message.message.content 
              });
            } else if (message.type === 'result') {
              const messageToSend: ClaudeMessage = { 
                type: 'result', 
                subtype: message.subtype,
                text: message.result,
                is_error: message.is_error,
                stats: {
                  duration_ms: message.duration_ms,
                  total_cost_usd: message.total_cost_usd,
                  num_turns: message.num_turns
                }
              };
              
              // Add error-specific information
              if (message.subtype === 'error_max_turns') {
                messageToSend.error_type = 'max_turns';
                messageToSend.error_message = 'Maximum number of turns reached';
              } else if (message.subtype === 'error_during_execution') {
                messageToSend.error_type = 'execution';
                messageToSend.error_message = 'Error occurred during execution';
              }
              
              panel.webview.postMessage(messageToSend);
            } else if (message.type === 'error') {
              panel.webview.postMessage({ 
                type: 'error', 
                text: message.message 
              });
            } else if (message.type === 'user') {
              // Forward user messages for display
              panel.webview.postMessage({ 
                type: 'user_message', 
                content: message.message.content 
              });
            }
          });
          
          ws.on('error', (_error: Error) => {
            panel.webview.postMessage({ 
              type: 'error', 
              text: 'WebSocket connection error' 
            });
          });
          
          ws.on('close', () => {
            panel.webview.postMessage({ type: 'disconnected' });
          });
          
          // Wait for connection before sending
          await new Promise(resolve => {
            if (ws!.readyState === WebSocket.OPEN) {
              resolve(true);
            } else {
              ws!.once('open', () => resolve(true));
            }
          });
        } catch (error) {
          panel.webview.postMessage({ 
            type: 'error', 
            text: 'Failed to connect to Claude Code server' 
          });
          return;
        }
      }
      
      // Send the query with all options
      ws.send(JSON.stringify({
        command: 'query',
        prompt: msg.text,
        options: getAllOptions(config)
      }));
      
    } else if (msg.command === 'continue' && currentSessionId) {
      // Continue the current conversation
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          command: 'continue',
          prompt: msg.text,
          options: getAllOptions(config)
        }));
      }
      
    } else if (msg.command === 'resume') {
      // Resume a specific conversation
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          command: 'resume',
          session_id: msg.sessionId,
          prompt: msg.text,
          options: getAllOptions(config)
        }));
      }
      
    } else if (msg.command === 'drop') {
      // Handle file drop
      const uri = vscode.Uri.parse(msg.path);
      try {
        const content = (await vscode.workspace.fs.readFile(uri)).toString();
        panel.webview.postMessage({ type: 'file', text: content, name: msg.path });
      } catch (err) {
        panel.webview.postMessage({ type: 'error', text: String(err) });
      }
    }
  });
  
  // Clean up WebSocket on panel disposal
  panel.onDidDispose(() => {
    if (ws) {
      ws.close();
    }
  });
}

export function deactivate() {}
