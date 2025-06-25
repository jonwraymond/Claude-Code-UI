import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { getWebviewContent } from './panel';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCode.sendSelection', sendSelection),
    vscode.commands.registerCommand('claudeCode.openPanel', () => openPanel(context))
  );
}

function getAllOptions(config: vscode.WorkspaceConfiguration) {
  // Get all Claude Code options from VS Code configuration
  const options: Record<string, unknown> = {
    maxTurns: config.get<number>('maxTurns') || 5,
    model: config.get<string>('model') || 'claude-3-5-sonnet-20241022',
    permissionMode: config.get<string>('permissionMode') || 'default',
    outputFormat: config.get<string>('outputFormat') || 'stream-json',
  };

  // Add optional string options
  const systemPrompt = config.get<string>('systemPrompt');
  if (systemPrompt) options.systemPrompt = systemPrompt;
  
  const appendSystemPrompt = config.get<string>('appendSystemPrompt');
  if (appendSystemPrompt) options.appendSystemPrompt = appendSystemPrompt;
  
  const permissionPromptTool = config.get<string>('permissionPromptTool');
  if (permissionPromptTool) options.permissionPromptTool = permissionPromptTool;

  // Add array options
  const allowedTools = config.get<string[]>('allowedTools');
  if (allowedTools && allowedTools.length > 0) {
    options.allowedTools = allowedTools;
  }
  
  const disallowedTools = config.get<string[]>('disallowedTools');
  if (disallowedTools && disallowedTools.length > 0) {
    options.disallowedTools = disallowedTools;
  }

  // Handle MCP config path
  const mcpConfigPath = config.get<string>('mcpConfig');
  if (mcpConfigPath) {
    // Convert to absolute path if relative
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder && !mcpConfigPath.startsWith('/')) {
      options.mcpConfig = vscode.Uri.joinPath(workspaceFolder.uri, mcpConfigPath).fsPath;
    } else {
      options.mcpConfig = mcpConfigPath;
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
  
  try {
    const messages: SDKMessage[] = [];
    for await (const message of query({
        prompt: text,
        options: getAllOptions(config),
    })) {
        messages.push(message);
    }
    
    const result = messages.find(m => m.type === 'result');
    if (result && result.type === 'result' && result.subtype === 'success') {
        const doc = await vscode.workspace.openTextDocument({ 
            language: 'markdown', 
            content: result.result
        });
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to get response from Claude Code: ${errorMessage}`);
  }
}

function openPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'claudeCode',
    'Claude Code',
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  
  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
  
  const config = vscode.workspace.getConfiguration('claudeCode');
  
  let currentSessionId: string | null = null;
  
  panel.webview.onDidReceiveMessage(async msg => {
    if (msg.command === 'send' || msg.command === 'continue' || msg.command === 'resume') {
        const text = msg.text;
        
        const queryOptions: {
            prompt: string;
            options: Record<string, unknown>;
        } = {
            prompt: text,
            options: getAllOptions(config),
        };

        if (msg.command === 'continue') {
            queryOptions.options.continue = true;
        } else if (msg.command === 'resume' && msg.sessionId) {
            queryOptions.options.resume = msg.sessionId;
        }

        try {
            panel.webview.postMessage({ type: 'connected' });
            for await (const message of query(queryOptions)) {
                if (message.type === 'system' && message.subtype === 'init') {
                    currentSessionId = message.session_id;
                    panel.webview.postMessage({ 
                      type: 'session_started', 
                      sessionId: currentSessionId,
                      model: message.model,
                      tools: message.tools,
                      mcp_servers: message.mcp_servers
                    });
                } else if (message.type === 'assistant') {
                    panel.webview.postMessage({ 
                      type: 'assistant_message', 
                      content: message.message.content 
                    });
                } else if (message.type === 'result') {
                    const messageToSend = { 
                      type: 'result', 
                      subtype: message.subtype,
                      text: (message as { result?: string }).result || '',
                      is_error: message.is_error,
                      stats: {
                        duration_ms: message.duration_ms,
                        total_cost_usd: message.total_cost_usd,
                        num_turns: message.num_turns
                      }
                    };
                    panel.webview.postMessage(messageToSend);
                } else if (message.type === 'user') {
                    panel.webview.postMessage({ 
                      type: 'user_message', 
                      content: message.message.content 
                    });
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Error querying Claude Code: ${errorMessage}`);
            panel.webview.postMessage({ type: 'error', text: errorMessage });
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
    
    } else if (msg.command === 'getCurrentSettings') {
        const settings = getAllOptions(config);
        panel.webview.postMessage({ command: 'currentSettings', settings });
    } else if (msg.command === 'saveSettings') {
        const newSettings = msg.settings;
        for (const key in newSettings) {
            if (Object.prototype.hasOwnProperty.call(newSettings, key)) {
                await config.update(key, newSettings[key], vscode.ConfigurationTarget.Workspace);
            }
        }
        vscode.window.showInformationMessage('Claude Code settings saved.');
    } else if (msg.command === 'resetSettings') {
        const keys = ['model', 'maxTurns', 'permissionMode', 'outputFormat', 'systemPrompt', 'appendSystemPrompt', 'permissionPromptTool', 'allowedTools', 'disallowedTools', 'mcpConfig'];
        for (const key of keys) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
        }
        vscode.window.showInformationMessage('Claude Code settings reset to defaults.');
        const settings = getAllOptions(config);
        panel.webview.postMessage({ command: 'currentSettings', settings });
    } else if (msg.command === 'undo') {
        vscode.commands.executeCommand('undo');
    } else if (msg.command === 'redo') {
        vscode.commands.executeCommand('redo');
    } else if (msg.command === 'showDiff') {
        vscode.commands.executeCommand('git.openChange');
    } else if (msg.command === 'changeModel') {
        await config.update('model', msg.model, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`Model changed to: ${msg.model}`);
    } else if (msg.command === 'getToolsConfig') {
        const allowedTools = config.get<string[]>('allowedTools') || [];
        const disallowedTools = config.get<string[]>('disallowedTools') || [];
        panel.webview.postMessage({ 
            command: 'toolsConfig', 
            allowedTools, 
            disallowedTools 
        });
    } else if (msg.command === 'getMcpConfig') {
        const mcpConfig = config.get<string>('mcpConfig');
        panel.webview.postMessage({ 
            command: 'mcpConfig', 
            mcpConfig 
        });
    } else if (msg.command === 'changeDirectory') {
        try {
            process.chdir(msg.path);
            panel.webview.postMessage({ 
                type: 'system_message', 
                content: `Changed directory to: ${process.cwd()}` 
            });
        } catch (error) {
            panel.webview.postMessage({ 
                type: 'error', 
                text: `Failed to change directory: ${error}` 
            });
        }
    } else if (msg.command === 'listDirectory') {
        try {
            const targetPath = path.resolve(msg.path || '.');
            const items = fs.readdirSync(targetPath);
            const details = items.map((item: string) => {
                const itemPath = path.join(targetPath, item);
                const stats = fs.statSync(itemPath);
                return `${stats.isDirectory() ? '📁' : '📄'} ${item}`;
            });
            panel.webview.postMessage({ 
                type: 'system_message', 
                content: `Contents of ${targetPath}:\n${details.join('\n')}` 
            });
        } catch (error) {
            panel.webview.postMessage({ 
                type: 'error', 
                text: `Failed to list directory: ${error}` 
            });
        }
    } else if (msg.command === 'printWorkingDirectory') {
        panel.webview.postMessage({ 
            type: 'system_message', 
            content: `Current directory: ${process.cwd()}` 
        });
    } else if (msg.command === 'executeTerminal') {
        const terminal = vscode.window.createTerminal('Claude Code');
        terminal.show();
        terminal.sendText(msg.terminalCommand);
    } else if (msg.command === 'executeShell') {
        exec(msg.shellCommand, (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
                panel.webview.postMessage({ 
                    type: 'shell_output', 
                    output: stderr || error.message, 
                    isError: true,
                    exitCode: (error as NodeJS.ErrnoException).code || 1 
                });
            } else {
                panel.webview.postMessage({ 
                    type: 'shell_output', 
                    output: stdout, 
                    isError: false,
                    exitCode: 0 
                });
            }
        });
    } else if (msg.command === 'createMemory' || msg.command === 'searchMemories' || 
               msg.command === 'listMemories' || msg.command === 'deleteMemory') {
        // Memory commands would integrate with a memory storage system
        // For now, just acknowledge the command
        panel.webview.postMessage({ 
            type: 'system_message', 
            content: `Memory command received: ${msg.command}` 
        });
    } else if (msg.command === 'exportConversation') {
        const fileName = `claude-conversation-${msg.sessionId || Date.now()}.json`;
        const content = JSON.stringify(msg.messages, null, 2);
        
        vscode.workspace.openTextDocument({ 
            content, 
            language: 'json' 
        }).then(doc => {
            vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Conversation exported. Save as: ${fileName}`);
        });
    } else if (msg.command === 'focusContext') {
        // Handle focus context - this would integrate with workspace/file filtering
        panel.webview.postMessage({ 
            type: 'system_message', 
            content: `Focusing context on: ${msg.context}` 
        });
    }
  });
  
  // Clean up on panel disposal
  panel.onDidDispose(() => {
    // No-op
  });
}

export function deactivate() {} 