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

// State
let currentSessionId = null;
let isProcessing = false;
let currentAssistantMessage = null;
let dragCounter = 0;

// Event Listeners
sendButton.addEventListener('click', send);
continueButton.addEventListener('click', continueConversation);
clearButton.addEventListener('click', clearChat);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    send();
  }
});

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
