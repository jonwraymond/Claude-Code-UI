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
    
    } else if (msg.command === 'getWorkspaceFiles') {
      // Get all workspace files for file browser
      const workspaceFiles = await getWorkspaceFiles();
      panel.webview.postMessage({ 
        command: 'workspaceFiles', 
        files: workspaceFiles 
      });
    
    } else if (msg.command === 'getCurrentSelection') {
      // Get current editor selection
      const editor = vscode.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        const selectedText = editor.document.getText(editor.selection);
        panel.webview.postMessage({ 
          command: 'currentSelection', 
          text: selectedText,
          fileName: editor.document.fileName
        });
      }
    
    } else if (msg.command === 'getWorkspaceInfo') {
      // Get workspace information
      const workspaceInfo = await getWorkspaceInfo();
      panel.webview.postMessage({ 
        command: 'workspaceInfo', 
        info: workspaceInfo 
      });
    
    } else if (msg.command === 'getMentionSuggestions') {
      // Get @ mention suggestions
      const suggestions = await getMentionSuggestions(msg.query);
      panel.webview.postMessage({ 
        command: 'mentionSuggestions', 
        suggestions: suggestions 
      });
    
    } else if (msg.command === 'getMcpResourceSuggestions') {
      // Get MCP resource suggestions
      const mcpSuggestions = await getMcpResourceSuggestions(msg.query);
      panel.webview.postMessage({ 
        command: 'mcpResourceSuggestions', 
        suggestions: mcpSuggestions 
      });
    
    } else if (msg.command === 'getMentionData') {
      // Get data for selected mention
      const mentionData = await getMentionData(msg.index);
      panel.webview.postMessage({ 
        command: 'mentionData', 
        data: mentionData 
      });
    
    } else if (msg.command === 'getCurrentSettings') {
      // Get current VS Code settings
      const currentSettings = getCurrentSettings();
      panel.webview.postMessage({ 
        command: 'currentSettings', 
        settings: currentSettings 
      });
    
    } else if (msg.command === 'saveSettings') {
      // Save settings to VS Code configuration
      await saveSettings(msg.settings);
      vscode.window.showInformationMessage('Settings saved successfully');
    
    } else if (msg.command === 'resetSettings') {
      // Reset settings to defaults
      await resetSettings();
      const currentSettings = getCurrentSettings();
      panel.webview.postMessage({ 
        command: 'currentSettings', 
        settings: currentSettings 
      });
      vscode.window.showInformationMessage('Settings reset to defaults');
    
    } else if (msg.command === 'initializeClaudeMd') {
      // Initialize CLAUDE.md file
      await initializeClaudeMd();
    
    } else if (msg.command === 'loadClaudeMdContent') {
      // Load CLAUDE.md content
      const content = await loadClaudeMdContent();
      panel.webview.postMessage({ 
        command: 'claudeMdContent', 
        content: content 
      });
    
    } else if (msg.command === 'saveClaudeMdContent') {
      // Save CLAUDE.md content
      await saveClaudeMdContent(msg.content);
    
    } else if (msg.command === 'browseDirectories') {
      // Browse for directories
      const directories = await browseForDirectories();
      if (directories) {
        panel.webview.postMessage({ 
          command: 'selectedDirectories', 
          directories: directories 
        });
      }
    
    } else if (msg.command === 'saveToMemory') {
      // Save content to specified memory type
      await saveToMemory(msg.memoryType, msg.content, msg.path);
    
    } else if (msg.command === 'getGitStatus') {
      // Get git repository status
      const gitStatus = await getGitStatus();
      panel.webview.postMessage({ 
        command: 'gitStatus', 
        status: gitStatus 
      });
    
    } else if (msg.command === 'applyCode') {
      // Apply code to current active editor or create new file
      await applyCodeToEditor(msg.code, msg.language, msg.fileName);
    
    } else if (msg.command === 'executeTerminal') {
      // Execute command in VS Code integrated terminal
      await executeInTerminal(msg.terminalCommand);
    
    } else if (msg.command === 'executeShell') {
      // Execute shell command and return output
      await executeShellCommand(msg.shellCommand, panel);
    }
  });
  
  // Clean up WebSocket on panel disposal
  panel.onDidDispose(() => {
    if (ws) {
      ws.close();
    }
  });
}

// Helper functions for enhanced features
async function getWorkspaceFiles(): Promise<Array<{path: string, name: string, size: number}>> {
  const files: Array<{path: string, name: string, size: number}> = [];
  
  if (!vscode.workspace.workspaceFolders) {
    return files;
  }
  
  for (const folder of vscode.workspace.workspaceFolders) {
    try {
      const fileUris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, '**/*'),
        new vscode.RelativePattern(folder, '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**}'),
        500 // Limit to 500 files for performance
      );
      
      for (const uri of fileUris) {
        try {
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.type === vscode.FileType.File) {
            const relativePath = vscode.workspace.asRelativePath(uri);
            files.push({
              path: relativePath,
              name: uri.path.split('/').pop() || '',
              size: stat.size
            });
          }
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }
    } catch (error) {
      // Ignore error reading workspace files
    }
  }
  
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function getWorkspaceInfo(): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return 'No workspace folder open';
  }
  
  const info = [];
  info.push(`Workspace: ${workspaceFolders[0].name}`);
  info.push(`Path: ${workspaceFolders[0].uri.fsPath}`);
  
  try {
    // Get file count
    const files = await getWorkspaceFiles();
    info.push(`Files: ${files.length}`);
    
    // Get language info from open editors
    const openEditors = vscode.window.visibleTextEditors;
    if (openEditors.length > 0) {
      const languages = [...new Set(openEditors.map(e => e.document.languageId))];
      info.push(`Open languages: ${languages.join(', ')}`);
    }
  } catch (error) {
    info.push('Error gathering workspace statistics');
  }
  
  return info.join('\n');
}

async function getMentionSuggestions(query: string): Promise<Array<{type: string, label: string, detail: string}>> {
  const suggestions: Array<{type: string, label: string, detail: string}> = [];
  
  // File suggestions
  const files = await getWorkspaceFiles();
  const matchingFiles = files
    .filter(file => file.path.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10)
    .map(file => ({
      type: 'file',
      label: file.path,
      detail: `File (${formatFileSize(file.size)})`
    }));
  
  suggestions.push(...matchingFiles);
  
  // Symbol suggestions (if query is long enough)
  if (query.length >= 2) {
    try {
      const symbolSuggestions = await getSymbolSuggestions(query);
      suggestions.push(...symbolSuggestions.slice(0, 5));
    } catch (error) {
      // Ignore symbol search errors
    }
  }
  
  return suggestions;
}

async function getSymbolSuggestions(query: string): Promise<Array<{type: string, label: string, detail: string}>> {
  const suggestions: Array<{type: string, label: string, detail: string}> = [];
  
  // Search for symbols across workspace
  try {
    const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
      'vscode.executeWorkspaceSymbolProvider',
      query
    );
    
    if (symbols) {
      suggestions.push(...symbols.slice(0, 5).map(symbol => ({
        type: 'symbol',
        label: symbol.name,
        detail: `${vscode.SymbolKind[symbol.kind]} in ${vscode.workspace.asRelativePath(symbol.location.uri)}`
      })));
    }
  } catch (error) {
    // Workspace symbol search not available
  }
  
  return suggestions;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function getMentionData(_index: number): Promise<{type: string, path: string, label: string, content?: string}> {
  // This would be called with the selected mention index
  // For now, return a placeholder - in a full implementation, 
  // we'd store the suggestions and retrieve by index
  return {
    type: 'file',
    path: 'example.ts',
    label: 'example.ts',
    content: 'File content would be loaded here'
  };
}

function getCurrentSettings(): Record<string, unknown> {
  const config = vscode.workspace.getConfiguration('claudeCode');
  
  return {
    model: config.get('model'),
    maxTurns: config.get('maxTurns'),
    serverUrl: config.get('serverUrl'),
    outputFormat: config.get('outputFormat'),
    permissionMode: config.get('permissionMode'),
    allowedTools: config.get('allowedTools'),
    mcpConfig: config.get('mcpConfig'),
    permissionPromptTool: config.get('permissionPromptTool'),
    systemPrompt: config.get('systemPrompt'),
    appendSystemPrompt: config.get('appendSystemPrompt'),
    workingDirectories: config.get('workingDirectories'),
    verboseMode: config.get('verboseMode'),
    continueConversation: config.get('continueConversation'),
    resumeSession: config.get('resumeSession'),
    contextLimit: config.get('contextLimit')
  };
}

async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  const config = vscode.workspace.getConfiguration('claudeCode');
  
  // Save each setting
  const settingsMap: Record<string, string> = {
    model: 'model',
    maxTurns: 'maxTurns',
    serverUrl: 'serverUrl',
    outputFormat: 'outputFormat',
    permissionMode: 'permissionMode',
    allowedTools: 'allowedTools',
    mcpConfig: 'mcpConfig',
    permissionPromptTool: 'permissionPromptTool',
    systemPrompt: 'systemPrompt',
    appendSystemPrompt: 'appendSystemPrompt',
    workingDirectories: 'workingDirectories',
    verboseMode: 'verboseMode',
    continueConversation: 'continueConversation',
    resumeSession: 'resumeSession',
    contextLimit: 'contextLimit'
  };
  
  for (const [frontendKey, configKey] of Object.entries(settingsMap)) {
    if (settings[frontendKey] !== undefined) {
      await config.update(configKey, settings[frontendKey], vscode.ConfigurationTarget.Workspace);
    }
  }
}

async function resetSettings(): Promise<void> {
  const config = vscode.workspace.getConfiguration('claudeCode');
  
  // Reset to defaults by setting to undefined
  const keys = ['model', 'maxTurns', 'serverUrl', 'outputFormat', 'permissionMode', 
               'allowedTools', 'mcpConfig', 'permissionPromptTool', 'systemPrompt', 'appendSystemPrompt',
               'workingDirectories', 'verboseMode', 'continueConversation', 'resumeSession', 'contextLimit'];
  
  for (const key of keys) {
    await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
  }
}

// Memory Management Functions
async function initializeClaudeMd(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }
  
  const claudeMdPath = vscode.Uri.joinPath(workspaceFolder.uri, 'CLAUDE.md');
  
  try {
    // Check if CLAUDE.md already exists
    await vscode.workspace.fs.stat(claudeMdPath);
    const choice = await vscode.window.showWarningMessage(
      'CLAUDE.md already exists. Do you want to overwrite it?',
      'Overwrite', 'Cancel'
    );
    if (choice !== 'Overwrite') {
      return;
    }
  } catch {
    // File doesn't exist, continue
  }
  
  const defaultContent = `# ${workspaceFolder.name}

This file provides guidance to Claude Code when working with this project.

## Project Overview
<!-- Describe what this project does and its main purpose -->

## Architecture
<!-- Describe the project structure, key directories, and how components relate -->

## Technologies & Dependencies
<!-- List the main technologies, frameworks, and key dependencies -->

## Coding Conventions
<!-- Describe coding standards, patterns, and conventions used in this project -->

## Development Workflow
<!-- Describe how to set up, build, test, and deploy the project -->

## Important Notes
<!-- Any important context, gotchas, or special considerations -->
`;
  
  await vscode.workspace.fs.writeFile(claudeMdPath, Buffer.from(defaultContent, 'utf8'));
  
  // Open the file for editing
  const doc = await vscode.workspace.openTextDocument(claudeMdPath);
  await vscode.window.showTextDocument(doc);
  
  vscode.window.showInformationMessage('CLAUDE.md initialized successfully');
}

async function loadClaudeMdContent(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return '';
  }
  
  const claudeMdPath = vscode.Uri.joinPath(workspaceFolder.uri, 'CLAUDE.md');
  
  try {
    const content = await vscode.workspace.fs.readFile(claudeMdPath);
    return content.toString();
  } catch {
    return '';
  }
}

async function saveClaudeMdContent(content: string): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }
  
  const claudeMdPath = vscode.Uri.joinPath(workspaceFolder.uri, 'CLAUDE.md');
  await vscode.workspace.fs.writeFile(claudeMdPath, Buffer.from(content, 'utf8'));
}

async function browseForDirectories(): Promise<string[] | undefined> {
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: true,
    openLabel: 'Select Working Directories'
  };
  
  const result = await vscode.window.showOpenDialog(options);
  if (result) {
    return result.map(uri => uri.fsPath);
  }
  
  return undefined;
}

async function saveToMemory(memoryType: string, content: string, path: string): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  
  let memoryPath: vscode.Uri;
  
  if (memoryType === 'user') {
    // User memory goes to ~/.claude/CLAUDE.md
    const os = await import('os');
    const homeDir = os.homedir();
    const claudeDir = vscode.Uri.file(`${homeDir}/.claude`);
    
    // Ensure ~/.claude directory exists
    try {
      await vscode.workspace.fs.createDirectory(claudeDir);
    } catch {
      // Directory might already exist
    }
    
    memoryPath = vscode.Uri.joinPath(claudeDir, 'CLAUDE.md');
  } else if (memoryType === 'project-local') {
    // Project local memory goes to ./CLAUDE.local.md
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open for project-local memory');
      return;
    }
    memoryPath = vscode.Uri.joinPath(workspaceFolder.uri, 'CLAUDE.local.md');
  } else {
    // Project memory goes to ./CLAUDE.md
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open for project memory');
      return;
    }
    memoryPath = vscode.Uri.joinPath(workspaceFolder.uri, 'CLAUDE.md');
  }
  
  try {
    // Read existing content
    let existingContent = '';
    try {
      const buffer = await vscode.workspace.fs.readFile(memoryPath);
      existingContent = buffer.toString();
    } catch {
      // File doesn't exist, start fresh
      if (memoryType === 'project') {
        existingContent = `# ${workspaceFolder?.name || 'Project'}\n\nThis file provides guidance to Claude Code when working with this project.\n\n## Project Memory\n\n`;
      } else if (memoryType === 'user') {
        existingContent = `# User Preferences\n\nThis file contains your personal preferences for Claude Code across all projects.\n\n## Personal Memory\n\n`;
      } else {
        existingContent = `# ${workspaceFolder?.name || 'Project'} - Local\n\nThis file contains project-specific memory that is not shared with the team.\n\n## Local Memory\n\n`;
      }
    }
    
    // Add timestamp and content
    const timestamp = new Date().toISOString().split('T')[0];
    const memoryEntry = `- ${content} (${timestamp})\n`;
    
    // Append to file
    const updatedContent = existingContent + memoryEntry;
    await vscode.workspace.fs.writeFile(memoryPath, Buffer.from(updatedContent, 'utf8'));
    
    // Add to gitignore if it's project-local
    if (memoryType === 'project-local' && workspaceFolder) {
      await addToGitignore(workspaceFolder, 'CLAUDE.local.md');
    }
    
    vscode.window.showInformationMessage(`Memory saved to ${memoryType} (${path})`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
  }
}

async function addToGitignore(workspaceFolder: vscode.WorkspaceFolder, filename: string): Promise<void> {
  const gitignorePath = vscode.Uri.joinPath(workspaceFolder.uri, '.gitignore');
  
  try {
    let gitignoreContent = '';
    try {
      const buffer = await vscode.workspace.fs.readFile(gitignorePath);
      gitignoreContent = buffer.toString();
    } catch {
      // .gitignore doesn't exist
    }
    
    // Check if the file is already in .gitignore
    if (!gitignoreContent.includes(filename)) {
      const updatedContent = gitignoreContent + (gitignoreContent ? '\n' : '') + `${filename}\n`;
      await vscode.workspace.fs.writeFile(gitignorePath, Buffer.from(updatedContent, 'utf8'));
    }
  } catch (error) {
    // Silently ignore .gitignore update errors
  }
}

async function getGitStatus(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return 'No workspace folder open';
  }

  try {
    // Check if this is a git repository
    const gitDir = vscode.Uri.joinPath(workspaceFolder.uri, '.git');
    await vscode.workspace.fs.stat(gitDir);
    
    // Get git extension API
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
      return 'Git extension not available';
    }

    const git = gitExtension.getAPI(1);
    const repository = git.repositories.find((repo: any) => 
      repo.rootUri.fsPath === workspaceFolder.uri.fsPath
    );

    if (!repository) {
      return 'No git repository found in workspace';
    }

    const status = repository.state;
    const info = [];
    
    // Basic info
    info.push(`Branch: ${status.HEAD?.name || 'unknown'}`);
    
    // Changes
    if (status.workingTreeChanges.length > 0) {
      info.push(`Modified files: ${status.workingTreeChanges.length}`);
      const modified = status.workingTreeChanges.slice(0, 5).map((change: any) => 
        `  ${change.status === 1 ? 'M' : change.status === 7 ? 'D' : '?'} ${change.uri.fsPath.replace(workspaceFolder.uri.fsPath, '')}`
      );
      info.push(...modified);
      if (status.workingTreeChanges.length > 5) {
        info.push(`  ... and ${status.workingTreeChanges.length - 5} more`);
      }
    }
    
    // Staged changes
    if (status.indexChanges.length > 0) {
      info.push(`Staged files: ${status.indexChanges.length}`);
    }
    
    // Untracked files
    if (status.untrackedChanges.length > 0) {
      info.push(`Untracked files: ${status.untrackedChanges.length}`);
    }
    
    if (status.workingTreeChanges.length === 0 && 
        status.indexChanges.length === 0 && 
        status.untrackedChanges.length === 0) {
      info.push('Working tree clean');
    }

    return info.join('\n');
    
  } catch (error) {
    return 'Not a git repository or git not available';
  }
}

async function getMcpResourceSuggestions(query: string): Promise<Array<{server: string, resource: string, type: string, description?: string, path?: string}>> {
  const suggestions: Array<{server: string, resource: string, type: string, description?: string, path?: string}> = [];
  
  // Parse query to extract server and resource parts
  const parts = query.split(':');
  const serverQuery = parts[0] || '';
  const resourceQuery = parts[1] || '';
  
  // Mock MCP servers and resources for demonstration
  // In a real implementation, this would query actual MCP servers
  const mcpServers = [
    {
      name: 'filesystem',
      resources: [
        { name: 'file', type: 'file', description: 'File system access' },
        { name: 'directory', type: 'directory', description: 'Directory operations' }
      ]
    },
    {
      name: 'database',
      resources: [
        { name: 'query', type: 'database', description: 'Database queries' },
        { name: 'schema', type: 'database', description: 'Database schema' }
      ]
    },
    {
      name: 'web',
      resources: [
        { name: 'api', type: 'api', description: 'Web API access' },
        { name: 'search', type: 'search', description: 'Web search' }
      ]
    },
    {
      name: 'memory',
      resources: [
        { name: 'store', type: 'memory', description: 'Memory storage' },
        { name: 'retrieve', type: 'memory', description: 'Memory retrieval' }
      ]
    }
  ];
  
  // Filter servers based on query
  const matchingServers = mcpServers.filter(server => 
    server.name.toLowerCase().includes(serverQuery.toLowerCase())
  );
  
  // Generate suggestions
  for (const server of matchingServers) {
    for (const resource of server.resources) {
      if (!resourceQuery || resource.name.toLowerCase().includes(resourceQuery.toLowerCase())) {
        suggestions.push({
          server: server.name,
          resource: resource.name,
          type: resource.type,
          description: resource.description,
          path: generateMcpPath(server.name, resource.name, resource.type)
        });
      }
    }
  }
  
  // If no specific server query, suggest popular patterns
  if (!serverQuery) {
    suggestions.unshift(
      { server: 'filesystem', resource: 'file', type: 'file', description: 'Access files', path: '//project/file.txt' },
      { server: 'database', resource: 'query', type: 'database', description: 'Query database', path: '//table/records' },
      { server: 'web', resource: 'api', type: 'api', description: 'Web API call', path: '//endpoint' }
    );
  }
  
  return suggestions.slice(0, 8); // Limit to 8 suggestions
}

function generateMcpPath(server: string, resource: string, type: string): string {
  switch (type) {
    case 'file':
      return '//project/path/file.ext';
    case 'directory':
      return '//project/path/';
    case 'database':
      return '//table/query';
    case 'api':
      return '//endpoint';
    case 'memory':
      return '//key';
    default:
      return '//resource';
  }
}

async function applyCodeToEditor(code: string, language: string, fileName?: string): Promise<void> {
  try {
    if (fileName) {
      // Create or open specific file
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        
        // Check if file exists
        try {
          await vscode.workspace.fs.stat(fileUri);
          // File exists, ask user for action
          const action = await vscode.window.showQuickPick(['Replace content', 'Append to file', 'Open in new tab'], {
            placeHolder: `File ${fileName} already exists. What would you like to do?`
          });
          
          if (action === 'Replace content') {
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(code, 'utf8'));
          } else if (action === 'Append to file') {
            const existingContent = await vscode.workspace.fs.readFile(fileUri);
            const newContent = existingContent.toString() + '\n\n' + code;
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf8'));
          } else if (action === 'Open in new tab') {
            const doc = await vscode.workspace.openTextDocument({ content: code, language });
            await vscode.window.showTextDocument(doc);
            return;
          } else {
            return; // User cancelled
          }
        } catch (error) {
          // File doesn't exist, create it
          await vscode.workspace.fs.writeFile(fileUri, Buffer.from(code, 'utf8'));
        }
        
        // Open the file
        const doc = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(doc);
      } else {
        // No workspace, create new document
        const doc = await vscode.workspace.openTextDocument({ content: code, language });
        await vscode.window.showTextDocument(doc);
      }
    } else {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        // Insert at cursor or replace selection
        const selection = activeEditor.selection;
        await activeEditor.edit(editBuilder => {
          if (selection.isEmpty) {
            editBuilder.insert(selection.start, code);
          } else {
            editBuilder.replace(selection, code);
          }
        });
      } else {
        // No active editor, create new document
        const doc = await vscode.workspace.openTextDocument({ content: code, language });
        await vscode.window.showTextDocument(doc);
      }
    }
    
    vscode.window.showInformationMessage('Code applied successfully');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to apply code: ${error}`);
  }
}

async function executeInTerminal(command: string): Promise<void> {
  try {
    // Create or reuse terminal
    let terminal = vscode.window.terminals.find(t => t.name === 'Claude Code');
    if (!terminal) {
      terminal = vscode.window.createTerminal('Claude Code');
    }
    
    // Show and focus terminal
    terminal.show(true);
    
    // Send command to terminal
    terminal.sendText(command);
    
    vscode.window.showInformationMessage(`Executed in terminal: ${command}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to execute terminal command: ${error}`);
  }
}

async function executeShellCommand(command: string, panel: vscode.WebviewPanel): Promise<void> {
  try {
    const { spawn } = require('child_process');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const cwd = workspaceFolder?.uri.fsPath || process.cwd();
    
    // Parse command and arguments
    const args = command.split(' ');
    const cmd = args.shift();
    
    if (!cmd) {
      panel.webview.postMessage({
        command: 'shellOutput',
        output: 'Error: No command specified',
        isError: true
      });
      return;
    }
    
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      panel.webview.postMessage({
        command: 'shellOutput',
        output: text,
        isError: false,
        isPartial: true
      });
    });
    
    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      panel.webview.postMessage({
        command: 'shellOutput',
        output: text,
        isError: true,
        isPartial: true
      });
    });
    
    child.on('close', (code: number) => {
      const finalMessage = code === 0 
        ? `Command completed successfully (exit code: ${code})`
        : `Command failed with exit code: ${code}`;
        
      panel.webview.postMessage({
        command: 'shellOutput',
        output: finalMessage,
        isError: code !== 0,
        isPartial: false,
        exitCode: code
      });
    });
    
    child.on('error', (error: Error) => {
      panel.webview.postMessage({
        command: 'shellOutput',
        output: `Error executing command: ${error.message}`,
        isError: true,
        isPartial: false
      });
    });
    
  } catch (error) {
    panel.webview.postMessage({
      command: 'shellOutput',
      output: `Failed to execute command: ${error}`,
      isError: true,
      isPartial: false
    });
  }
}

export function deactivate() {}
