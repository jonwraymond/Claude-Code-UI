// VS Code API
const vscode = acquireVsCodeApi();

// UI Elements
const input = document.getElementById('input');
const sendButton = document.getElementById('send');
const continueButton = document.getElementById('continue');
const clearButton = document.getElementById('clear');
const chatContainer = document.getElementById('chat-container');
const statusElement = document.getElementById('status');
const sessionInfo = document.getElementById('session-info');
const sessionIdElement = document.getElementById('session-id');
const sessionModelElement = document.getElementById('session-model');
const statsElement = document.getElementById('stats');
const durationElement = document.getElementById('duration');
const costElement = document.getElementById('cost');
const turnsElement = document.getElementById('turns');

// Enhanced UI Elements
const contextSection = document.getElementById('context-section');
const contextItems = document.getElementById('context-items');
const addFilesButton = document.getElementById('add-files');
const addSelectionButton = document.getElementById('add-selection');
const workspaceInfoButton = document.getElementById('workspace-info');
const fileBrowser = document.getElementById('file-browser');
const fileBrowserContent = document.getElementById('file-browser-content');
const fileSearch = document.getElementById('file-search');
const mentionPopup = document.getElementById('mention-popup');

// State
let currentSessionId = null;
let isProcessing = false;
let currentAssistantMessage = null;
let dragCounter = 0;

// Enhanced State
let contextReferences = [];
let workspaceFiles = [];
let currentMentionQuery = '';
let mentionStartPos = 0;
let selectedMentionIndex = 0;

// Event Listeners
sendButton.addEventListener('click', send);
continueButton.addEventListener('click', continueConversation);
clearButton.addEventListener('click', clearChat);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    send();
  }
});

// Enhanced Event Listeners
addFilesButton.addEventListener('click', showFileBrowser);
addSelectionButton.addEventListener('click', addCurrentSelection);
workspaceInfoButton.addEventListener('click', addWorkspaceContext);

// File browser functionality
fileSearch.addEventListener('input', filterFiles);
fileBrowserContent.addEventListener('click', handleFileSelection);

// @ mention functionality
input.addEventListener('input', handleInputChange);
input.addEventListener('keydown', handleMentionNavigation);

// Context management
contextItems.addEventListener('click', handleContextItemClick);

// Enhanced Drag and Drop
const dropZone = document.body;

dropZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (dragCounter === 1) {
    dropZone.classList.add('drag-over');
    showDropOverlay();
  }
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    dropZone.classList.remove('drag-over');
    hideDropOverlay();
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove('drag-over');
  hideDropOverlay();
  
  const files = Array.from(e.dataTransfer.files);
  const items = e.dataTransfer.items;
  
  // Handle file drops
  if (files.length > 0) {
    files.forEach(file => {
      addSystemMessage(`Processing file: ${file.name} (${formatFileSize(file.size)})`, 'info');
      // Use webkitRelativePath for better path handling, fallback to name
      const filePath = file.webkitRelativePath || file.path || file.name;
      vscode.postMessage({ command: 'drop', path: filePath });
    });
  }
  
  // Handle text drops (for code snippets)
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'text/plain') {
        items[i].getAsString((text) => {
          if (text && !files.length) {
            // Ensure input exists and has a value before appending
            if (input && input.value !== undefined) {
              input.value = (input.value || '') + '\n\n' + text;
              addSystemMessage('Added dropped text to input', 'info');
            }
          }
        });
      }
    }
  }
});

// Drop overlay functions
function showDropOverlay() {
  let overlay = document.getElementById('drop-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'drop-overlay';
    overlay.innerHTML = `
      <div class="drop-message">
        <div class="drop-icon">📁</div>
        <div class="drop-text">Drop files here</div>
        <div class="drop-subtext">Add files to include in your conversation</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('show');
}

function hideDropOverlay() {
  const overlay = document.getElementById('drop-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  if (typeof bytes !== 'number' || bytes < 0) return 'Unknown';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// File attachment display
function addFileAttachment(fileName, fileContent) {
  const attachmentDiv = document.createElement('div');
  attachmentDiv.className = 'file-attachment';
  
  const icon = getFileIcon(fileName);
  const truncatedName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
  
  attachmentDiv.innerHTML = `
    <span class="file-icon">${icon}</span>
    <span class="file-name" title="${fileName}">${truncatedName}</span>
    <button class="remove-file">×</button>
  `;
  
  // Store file content in data attribute
  attachmentDiv.dataset.content = fileContent;
  attachmentDiv.dataset.fileName = fileName;
  
  // Add click handler to remove button
  const removeButton = attachmentDiv.querySelector('.remove-file');
  removeButton.addEventListener('click', () => removeFileAttachment(attachmentDiv));
  
  // Add to a files container (create if doesn't exist)
  let filesContainer = document.getElementById('files-container');
  if (!filesContainer) {
    filesContainer = document.createElement('div');
    filesContainer.id = 'files-container';
    filesContainer.className = 'files-container';
    const inputContainer = document.querySelector('.input-container');
    inputContainer.insertBefore(filesContainer, input);
  }
  
  filesContainer.appendChild(attachmentDiv);
}

function removeFileAttachment(attachment) {
  attachment.remove();
  
  // Remove container if empty
  const filesContainer = document.getElementById('files-container');
  if (filesContainer && filesContainer.children.length === 0) {
    filesContainer.remove();
  }
}

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const iconMap = {
    'js': '📄',
    'ts': '📘',
    'jsx': '⚛️',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'c': '🔧',
    'cpp': '🔧',
    'cs': '🔷',
    'go': '🐹',
    'rs': '🦀',
    'php': '🐘',
    'rb': '💎',
    'swift': '🦉',
    'kt': '🟣',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '📋',
    'xml': '📋',
    'yaml': '📋',
    'yml': '📋',
    'md': '📝',
    'txt': '📄',
    'pdf': '📕',
    'doc': '📘',
    'docx': '📘',
    'xls': '📊',
    'xlsx': '📊',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'svg': '🖼️',
    'zip': '📦',
    'tar': '📦',
    'gz': '📦',
    'rar': '📦'
  };
  
  return iconMap[ext] || '📄';
}

// Functions
function send() {
  if (isProcessing || !input || !input.value || !input.value.trim()) return;
  
  let message = input.value;
  
  // Include attached files in the message
  const filesContainer = document.getElementById('files-container');
  if (filesContainer && filesContainer.children.length > 0) {
    const attachments = Array.from(filesContainer.children);
    attachments.forEach(attachment => {
      const fileName = attachment.dataset.fileName;
      const content = attachment.dataset.content;
      message += `\n\n# File: ${fileName}\n${content}`;
    });
    // Clear attachments after sending
    filesContainer.innerHTML = '';
    filesContainer.remove();
  }
  
  addUserMessage(message);
  
  vscode.postMessage({ 
    command: currentSessionId ? 'continue' : 'send', 
    text: message 
  });
  
  input.value = '';
  setProcessing(true);
}

function continueConversation() {
  if (isProcessing || !input || !input.value || !input.value.trim()) return;
  
  const message = input.value;
  addUserMessage(message);
  
  vscode.postMessage({ 
    command: 'continue', 
    text: message 
  });
  
  input.value = '';
  setProcessing(true);
}

function clearChat() {
  chatContainer.innerHTML = '';
  currentSessionId = null;
  sessionInfo.style.display = 'none';
  statsElement.style.display = 'none';
  continueButton.style.display = 'none';
  
  // Clear any attached files
  const filesContainer = document.getElementById('files-container');
  if (filesContainer) {
    filesContainer.remove();
  }
}

function setProcessing(processing) {
  isProcessing = processing;
  sendButton.disabled = processing;
  continueButton.disabled = processing;
  input.disabled = processing;
  statusElement.textContent = processing ? 'Processing...' : 'Connected';
  statusElement.className = 'status ' + (processing ? 'processing' : 'connected');
}

function addUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message';
  
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = 'You';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(content);
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addAssistantMessage(content) {
  if (!currentAssistantMessage) {
    currentAssistantMessage = document.createElement('div');
    currentAssistantMessage.className = 'message assistant-message';
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = 'Claude';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    currentAssistantMessage.appendChild(label);
    currentAssistantMessage.appendChild(contentDiv);
    chatContainer.appendChild(currentAssistantMessage);
  }
  
  const contentDiv = currentAssistantMessage.querySelector('.message-content');
  
  // Handle content array from Claude Code SDK
  if (Array.isArray(content)) {
    content.forEach(item => {
      if (item.type === 'text') {
        const textElement = document.createElement('div');
        textElement.className = 'text-content';
        textElement.textContent = item.text;
        contentDiv.appendChild(textElement);
      } else if (item.type === 'tool_use') {
        const toolElement = document.createElement('div');
        toolElement.className = 'tool-use';
        const toolName = formatToolName(item.name);
        toolElement.innerHTML = `<span class="tool-label">Tool:</span> ${toolName}`;
        if (item.input && Object.keys(item.input).length > 0) {
          const details = document.createElement('details');
          details.className = 'tool-details';
          details.innerHTML = `
            <summary>Parameters</summary>
            <pre>${JSON.stringify(item.input, null, 2)}</pre>
          `;
          toolElement.appendChild(details);
        }
        contentDiv.appendChild(toolElement);
      }
    });
  } else if (typeof content === 'string') {
    contentDiv.textContent = content;
  }
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatToolName(toolName) {
  // Format MCP tool names nicely
  if (toolName.startsWith('mcp__')) {
    const parts = toolName.split('__');
    if (parts.length >= 3) {
      return `${parts[1]}::${parts[2]}`;
    }
  }
  return toolName;
}

function addSystemMessage(text, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message system-message ${type}`;
  messageDiv.textContent = text;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Message Handler
window.addEventListener('message', event => {
  const msg = event.data;
  
  // Validate message has a type
  if (!msg || !msg.type) {
    console.warn('Received message without type:', msg);
    return;
  }
  
  switch (msg.type) {
    case 'connected':
      statusElement.textContent = 'Connected';
      statusElement.className = 'status connected';
      break;
      
    case 'disconnected':
      statusElement.textContent = 'Disconnected';
      statusElement.className = 'status disconnected';
      setProcessing(false);
      break;
      
    case 'session_started':
      currentSessionId = msg.sessionId;
      sessionIdElement.textContent = msg.sessionId.substring(0, 8) + '...';
      sessionModelElement.textContent = msg.model || '';
      sessionInfo.style.display = 'flex';
      
      // Show available tools
      if (msg.tools && msg.tools.length > 0) {
        addSystemMessage(`Available tools: ${msg.tools.join(', ')}`);
      }
      
      // Show MCP servers if available
      if (msg.mcp_servers_available && msg.mcp_servers) {
        const serverList = msg.mcp_servers.map(s => `${s.name} (${s.status})`).join(', ');
        addSystemMessage(`MCP servers: ${serverList}`, 'info');
      }
      break;
      
    case 'user_message':
      // Don't duplicate user messages that we already added
      break;
      
    case 'assistant_message':
      addAssistantMessage(msg.content);
      break;
      
    case 'result':
      if (msg.text && !msg.is_error) {
        if (!currentAssistantMessage) {
          addAssistantMessage(msg.text);
        }
      }
      
      // Handle different result subtypes
      if (msg.subtype === 'error_max_turns') {
        addSystemMessage('⚠️ Maximum turns reached. Send another message to continue.', 'warning');
      } else if (msg.subtype === 'error_during_execution') {
        addSystemMessage('❌ Error occurred during execution. Check the output above for details.', 'error');
      }
      
      // Show stats with proper null checks
      if (msg.stats) {
        if (msg.stats.duration_ms !== undefined) {
          durationElement.textContent = msg.stats.duration_ms;
        }
        if (msg.stats.total_cost_usd !== undefined) {
          costElement.textContent = msg.stats.total_cost_usd.toFixed(4);
        }
        if (msg.stats.num_turns !== undefined) {
          turnsElement.textContent = msg.stats.num_turns;
        }
        statsElement.style.display = 'flex';
      }
      
      // Reset for next message
      currentAssistantMessage = null;
      setProcessing(false);
      
      // Show continue button unless there was an error
      if (!msg.is_error || msg.subtype === 'error_max_turns') {
        continueButton.style.display = 'inline-block';
      }
      break;
      
    case 'error':
      addSystemMessage(`Error: ${msg.text}`, 'error');
      setProcessing(false);
      break;
      
    case 'file':
      // Display as attached file instead of adding to input directly
      addFileAttachment(msg.name, msg.text);
      addSystemMessage(`File loaded: ${msg.name}`, 'success');
      break;
  }
});

// ============================================================================
// ENHANCED FEATURES IMPLEMENTATION
// ============================================================================

// Enhanced UI Elements
const settingsButton = document.getElementById('settings-button');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsButton = document.getElementById('close-settings');
const saveSettingsButton = document.getElementById('save-settings');
const resetSettingsButton = document.getElementById('reset-settings');

// Settings Event Listeners
settingsButton.addEventListener('click', showSettings);
closeSettingsButton.addEventListener('click', hideSettings);
saveSettingsButton.addEventListener('click', saveSettings);
resetSettingsButton.addEventListener('click', resetSettings);
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) hideSettings();
});

// Context Management Functions
function addContextReference(type, path, content = '') {
  const ref = { type, path, content };
  contextReferences.push(ref);
  updateContextDisplay();
}

function removeContextReference(index) {
  contextReferences.splice(index, 1);
  updateContextDisplay();
}

function updateContextDisplay() {
  const placeholder = contextItems.querySelector('.context-placeholder');
  
  if (contextReferences.length === 0) {
    contextItems.innerHTML = '<div class="context-placeholder" style="color: var(--vscode-descriptionForeground); font-size: 11px; font-style: italic;">Add files, selections, or use @ mentions for context</div>';
    return;
  }
  
  if (placeholder) placeholder.remove();
  
  contextItems.innerHTML = contextReferences.map((ref, index) => {
    const icon = getContextIcon(ref.type);
    const name = ref.path.split('/').pop() || ref.path;
    return `
      <div class="context-item">
        <span>${icon}</span>
        <span title="${ref.path}">${name}</span>
        <button class="remove" onclick="removeContextReference(${index})">×</button>
      </div>
    `;
  }).join('');
}

function getContextIcon(type) {
  const icons = {
    file: '📄',
    selection: '📝',
    workspace: '🔍',
    symbol: '🔗',
    folder: '📁'
  };
  return icons[type] || '📄';
}

// File Browser Functions
function showFileBrowser() {
  vscode.postMessage({ command: 'getWorkspaceFiles' });
  fileBrowser.classList.add('show');
}

function hideFileBrowser() {
  fileBrowser.classList.remove('show');
}

function filterFiles() {
  const query = fileSearch.value.toLowerCase();
  const fileItems = fileBrowserContent.querySelectorAll('.file-item');
  
  fileItems.forEach(item => {
    const path = item.textContent.toLowerCase();
    item.style.display = path.includes(query) ? 'flex' : 'none';
  });
}

function handleFileSelection(e) {
  const fileItem = e.target.closest('.file-item');
  if (!fileItem) return;
  
  const path = fileItem.dataset.path;
  addContextReference('file', path);
  hideFileBrowser();
}

function populateFileBrowser(files) {
  fileBrowserContent.innerHTML = files.map(file => {
    const icon = getFileIcon(file.name);
    const size = formatFileSize(file.size);
    return `
      <div class="file-item" data-path="${file.path}">
        <span class="file-item-icon">${icon}</span>
        <span class="file-item-path">${file.path}</span>
        <span class="file-item-size">${size}</span>
      </div>
    `;
  }).join('');
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const icons = {
    js: '🟨', ts: '🔷', py: '🐍', html: '🌐', css: '🎨',
    json: '📋', md: '📝', txt: '📄', yml: '⚙️', yaml: '⚙️',
    png: '🖼️', jpg: '🖼️', gif: '🖼️', svg: '🖼️'
  };
  return icons[ext] || '📄';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// @ Mention Functions
function handleInputChange(e) {
  const text = input.value;
  const cursorPos = input.selectionStart;
  
  // Check for @ mention
  const beforeCursor = text.substring(0, cursorPos);
  const mentionMatch = beforeCursor.match(/@([^@\s]*)$/);
  
  if (mentionMatch) {
    currentMentionQuery = mentionMatch[1];
    mentionStartPos = cursorPos - currentMentionQuery.length - 1;
    showMentionPopup();
  } else {
    hideMentionPopup();
  }
}

function handleMentionNavigation(e) {
  if (!mentionPopup.classList.contains('show')) return;
  
  const items = mentionPopup.querySelectorAll('.mention-item');
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedMentionIndex = Math.min(selectedMentionIndex + 1, items.length - 1);
      updateMentionSelection();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedMentionIndex = Math.max(selectedMentionIndex - 1, 0);
      updateMentionSelection();
      break;
    case 'Enter':
    case 'Tab':
      e.preventDefault();
      selectMention(selectedMentionIndex);
      break;
    case 'Escape':
      hideMentionPopup();
      break;
  }
}

function showMentionPopup() {
  vscode.postMessage({ command: 'getMentionSuggestions', query: currentMentionQuery });
  
  // Position popup
  const rect = input.getBoundingClientRect();
  mentionPopup.style.left = '0px';
  mentionPopup.style.bottom = `${input.offsetHeight + 5}px`;
  mentionPopup.classList.add('show');
}

function hideMentionPopup() {
  mentionPopup.classList.remove('show');
  selectedMentionIndex = 0;
}

function populateMentionPopup(suggestions) {
  mentionPopup.innerHTML = suggestions.map((item, index) => {
    const icon = getContextIcon(item.type);
    return `
      <div class="mention-item" data-index="${index}">
        <span class="mention-icon">${icon}</span>
        <div class="mention-text">
          <div class="mention-label">${item.label}</div>
          <div class="mention-detail">${item.detail}</div>
        </div>
      </div>
    `;
  }).join('');
  
  updateMentionSelection();
}

function updateMentionSelection() {
  const items = mentionPopup.querySelectorAll('.mention-item');
  items.forEach((item, index) => {
    item.classList.toggle('selected', index === selectedMentionIndex);
  });
}

function selectMention(index) {
  const items = mentionPopup.querySelectorAll('.mention-item');
  if (!items[index]) return;
  
  const text = input.value;
  const beforeMention = text.substring(0, mentionStartPos);
  const afterCursor = text.substring(input.selectionStart);
  
  // Get selected item data
  vscode.postMessage({ command: 'getMentionData', index });
  
  hideMentionPopup();
}

// Context Actions
function addCurrentSelection() {
  vscode.postMessage({ command: 'getCurrentSelection' });
}

function addWorkspaceContext() {
  vscode.postMessage({ command: 'getWorkspaceInfo' });
}

function handleContextItemClick(e) {
  if (e.target.classList.contains('remove')) {
    const contextItem = e.target.closest('.context-item');
    const index = Array.from(contextItems.children).indexOf(contextItem);
    removeContextReference(index);
  }
}

// Settings Functions
function showSettings() {
  loadCurrentSettings();
  settingsOverlay.classList.add('show');
}

function hideSettings() {
  settingsOverlay.classList.remove('show');
}

function loadCurrentSettings() {
  vscode.postMessage({ command: 'getCurrentSettings' });
}

function saveSettings() {
  const settings = {
    model: document.getElementById('model-select').value,
    maxTurns: parseInt(document.getElementById('max-turns').value),
    serverUrl: document.getElementById('server-url').value,
    outputFormat: document.getElementById('output-format').value,
    permissionMode: document.getElementById('permission-mode').value,
    allowedTools: Array.from(document.querySelectorAll('#allowed-tools input:checked')).map(cb => cb.value),
    mcpConfig: document.getElementById('mcp-config').value,
    permissionPromptTool: document.getElementById('permission-prompt-tool').value,
    systemPrompt: document.getElementById('system-prompt').value,
    appendSystemPrompt: document.getElementById('append-system-prompt').value
  };
  
  vscode.postMessage({ command: 'saveSettings', settings });
  hideSettings();
}

function resetSettings() {
  if (confirm('Reset all settings to defaults?')) {
    vscode.postMessage({ command: 'resetSettings' });
    hideSettings();
  }
}

function populateSettings(settings) {
  document.getElementById('model-select').value = settings.model || 'claude-3-5-sonnet-20241022';
  document.getElementById('max-turns').value = settings.maxTurns || 5;
  document.getElementById('server-url').value = settings.serverUrl || 'http://localhost:8765';
  document.getElementById('output-format').value = settings.outputFormat || 'stream-json';
  document.getElementById('permission-mode').value = settings.permissionMode || 'default';
  document.getElementById('mcp-config').value = settings.mcpConfig || '';
  document.getElementById('permission-prompt-tool').value = settings.permissionPromptTool || '';
  document.getElementById('system-prompt').value = settings.systemPrompt || '';
  document.getElementById('append-system-prompt').value = settings.appendSystemPrompt || '';
  
  // Update allowed tools checkboxes
  const allowedTools = settings.allowedTools || ['Read', 'Write', 'Bash', 'Python'];
  document.querySelectorAll('#allowed-tools input[type="checkbox"]').forEach(cb => {
    cb.checked = allowedTools.includes(cb.value);
  });
}

// Enhanced Message Handling
window.addEventListener('message', event => {
  const message = event.data;
  
  switch (message.command) {
    case 'workspaceFiles':
      populateFileBrowser(message.files);
      break;
    case 'mentionSuggestions':
      populateMentionPopup(message.suggestions);
      break;
    case 'mentionData':
      insertMentionData(message.data);
      break;
    case 'currentSelection':
      if (message.text) {
        addContextReference('selection', 'Current Selection', message.text);
      }
      break;
    case 'workspaceInfo':
      addContextReference('workspace', 'Workspace Info', message.info);
      break;
    case 'currentSettings':
      populateSettings(message.settings);
      break;
  }
});

function insertMentionData(data) {
  addContextReference(data.type, data.path, data.content);
  
  // Also insert reference in input
  const text = input.value;
  const beforeMention = text.substring(0, mentionStartPos);
  const afterCursor = text.substring(input.selectionStart);
  const reference = `@${data.label}`;
  
  input.value = beforeMention + reference + afterCursor;
  input.setSelectionRange(mentionStartPos + reference.length, mentionStartPos + reference.length);
}

// Initialize Enhanced Features
function initializeEnhancedFeatures() {
  // Load workspace files on startup
  vscode.postMessage({ command: 'getWorkspaceFiles' });
  
  // Hide file browser and mention popup on outside clicks
  document.addEventListener('click', (e) => {
    if (!fileBrowser.contains(e.target) && !addFilesButton.contains(e.target)) {
      hideFileBrowser();
    }
    if (!mentionPopup.contains(e.target) && e.target !== input) {
      hideMentionPopup();
    }
  });
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEnhancedFeatures);
} else {
  initializeEnhancedFeatures();
}
