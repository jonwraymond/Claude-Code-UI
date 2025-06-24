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
const gitContextButton = document.getElementById('git-context');
const fileBrowser = document.getElementById('file-browser');
const fileBrowserContent = document.getElementById('file-browser-content');
const fileSearch = document.getElementById('file-search');
const mentionPopup = document.getElementById('mention-popup');

// Tab Elements
const tabsContainer = document.getElementById('tabs');
const newTabButton = document.getElementById('new-tab-btn');
const cloudButton = document.getElementById('cloud-btn');
const historyButton = document.getElementById('history-btn');
const menuButton = document.getElementById('menu-btn');
const historyOverlay = document.getElementById('history-overlay');
const closeHistoryButton = document.getElementById('close-history');
const historyContent = document.getElementById('history-content');

// State
let currentSessionId = null;
let isProcessing = false;
let currentAssistantMessage = null;
let dragCounter = 0;

// Tab Management State
let tabs = [{ id: 'tab-1', sessionId: '', title: 'New Chat', chatHistory: [] }];
let activeTabId = 'tab-1';
let tabCounter = 1;

// Enhanced State
let contextReferences = [];
let workspaceFiles = [];
let currentMentionQuery = '';
let mentionStartPos = 0;
let selectedMentionIndex = 0;
let isSlashCommand = false;
let slashCommandQuery = '';
let slashCommandStartPos = 0;
let isMemoryCommand = false;
let memoryCommandQuery = '';
let memoryCommandStartPos = 0;

// Advanced Input State
let commandHistory = [];
let historyIndex = -1;
let isMultilineMode = false;
let pendingMultilineText = '';
let isProcessingCancel = false;

// Vim Mode State
let vimMode = false;
let vimCurrentMode = 'normal'; // 'normal', 'insert', 'visual'
let vimCommandBuffer = '';
let vimLastCommand = '';
let vimYankBuffer = '';
let vimCursorPosition = 0;
let vimVisualStart = null;
let vimVisualEnd = null;

// Event Listeners
sendButton.addEventListener('click', send);
continueButton.addEventListener('click', continueConversation);
clearButton.addEventListener('click', clearChat);
input.addEventListener('keydown', handleAdvancedKeydown);
input.addEventListener('blur', handleInputBlur);
input.addEventListener('focus', handleInputFocus);

// Enhanced Event Listeners
addFilesButton.addEventListener('click', showFileBrowser);
addSelectionButton.addEventListener('click', addCurrentSelection);
workspaceInfoButton.addEventListener('click', addWorkspaceContext);
gitContextButton.addEventListener('click', addGitContext);

// Tab Event Listeners
newTabButton.addEventListener('click', createNewTab);
historyButton.addEventListener('click', showSessionHistory);
closeHistoryButton.addEventListener('click', hideSessionHistory);
tabsContainer.addEventListener('click', handleTabClick);

// File browser functionality
fileSearch.addEventListener('input', filterFiles);
fileBrowserContent.addEventListener('click', handleFileSelection);

// @ mention and slash command functionality
input.addEventListener('input', handleInputChange);
input.addEventListener('keydown', handleMentionNavigation);

// Context management
contextItems.addEventListener('click', handleContextItemClick);

// Image paste support
input.addEventListener('paste', handleImagePaste);
document.addEventListener('paste', handleImagePaste);

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

// Advanced Input Handling Functions
function handleAdvancedKeydown(e) {
  // Handle vim mode if enabled
  if (vimMode) {
    const handled = handleVimKeydown(e);
    if (handled) return;
  }
  
  // Handle mentions/slash commands first if popup is open
  if (mentionPopup.classList.contains('show')) {
    handleMentionNavigation(e);
    return;
  }
  
  switch (e.key) {
    case 'Enter':
      if (e.ctrlKey) {
        // Ctrl+Enter: Send message
        e.preventDefault();
        send();
      } else if (e.shiftKey) {
        // Shift+Enter: Add newline (default behavior)
        return;
      } else {
        // Check for multiline escape sequence
        const text = input.value;
        const cursorPos = input.selectionStart;
        if (text.substring(cursorPos - 1, cursorPos) === '\\') {
          e.preventDefault();
          // Replace \ with newline
          const beforeBackslash = text.substring(0, cursorPos - 1);
          const afterCursor = text.substring(cursorPos);
          input.value = beforeBackslash + '\n' + afterCursor;
          input.setSelectionRange(cursorPos, cursorPos);
          return;
        }
        // Regular Enter: Send message
        e.preventDefault();
        send();
      }
      break;
      
    case 'ArrowUp':
      if (!e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        navigateHistory(-1);
      }
      break;
      
    case 'ArrowDown':
      if (!e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        navigateHistory(1);
      }
      break;
      
    case 'c':
      if (e.ctrlKey) {
        e.preventDefault();
        cancelCurrentOperation();
      }
      break;
      
    case 'l':
      if (e.ctrlKey) {
        e.preventDefault();
        clearScreen();
      }
      break;
      
    case 'r':
      if (e.ctrlKey) {
        e.preventDefault();
        showHistorySearch();
      }
      break;
      
    case 'Escape':
      if (isMultilineMode) {
        exitMultilineMode();
      }
      break;
  }
}

function navigateHistory(direction) {
  if (commandHistory.length === 0) return;
  
  if (historyIndex === -1 && direction === -1) {
    // Save current input before navigating
    pendingMultilineText = input.value;
    historyIndex = commandHistory.length - 1;
  } else if (historyIndex === -1 && direction === 1) {
    return; // Already at bottom
  } else {
    historyIndex += direction;
  }
  
  if (historyIndex < 0) {
    historyIndex = 0;
  } else if (historyIndex >= commandHistory.length) {
    historyIndex = -1;
    input.value = pendingMultilineText;
    return;
  }
  
  if (historyIndex >= 0 && historyIndex < commandHistory.length) {
    input.value = commandHistory[historyIndex];
    // Move cursor to end
    setTimeout(() => {
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }
}

function addToHistory(command) {
  if (!command.trim()) return;
  
  // Remove duplicate if it exists
  const existing = commandHistory.indexOf(command);
  if (existing !== -1) {
    commandHistory.splice(existing, 1);
  }
  
  // Add to end
  commandHistory.push(command);
  
  // Limit history size
  if (commandHistory.length > 100) {
    commandHistory.shift();
  }
  
  // Reset history navigation
  historyIndex = -1;
  pendingMultilineText = '';
  
  // Save to localStorage
  localStorage.setItem('claudeCodeHistory', JSON.stringify(commandHistory));
}

function loadHistoryFromStorage() {
  try {
    const stored = localStorage.getItem('claudeCodeHistory');
    if (stored) {
      commandHistory = JSON.parse(stored);
    }
  } catch (error) {
    commandHistory = [];
  }
}

function cancelCurrentOperation() {
  if (isProcessing) {
    isProcessingCancel = true;
    vscode.postMessage({ command: 'cancel' });
    addSystemMessage('⚠️ Operation cancelled by user', 'warning');
    setProcessing(false);
  }
}

function clearScreen() {
  chatContainer.innerHTML = '';
  addSystemMessage('🧹 Screen cleared (Ctrl+L)', 'info');
}

function showHistorySearch() {
  // Simple implementation - could be enhanced with fuzzy search
  if (commandHistory.length === 0) {
    addSystemMessage('No command history available', 'info');
    return;
  }
  
  const recent = commandHistory.slice(-5).reverse();
  addSystemMessage(`Recent commands:\n${recent.map((cmd, i) => `${i + 1}. ${cmd}`).join('\n')}`, 'info');
}

function exitMultilineMode() {
  isMultilineMode = false;
  input.style.minHeight = '80px';
  addSystemMessage('Exited multiline mode', 'info');
}

// Image paste support
function handleImagePaste(e) {
  if (!e.clipboardData || !e.clipboardData.items) return;
  
  for (let i = 0; i < e.clipboardData.items.length; i++) {
    const item = e.clipboardData.items[i];
    
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const file = item.getAsFile();
      
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const imageData = event.target.result;
          addImageAttachment(file.name || 'pasted-image.png', imageData);
          addSystemMessage(`📸 Image pasted: ${file.name || 'pasted-image.png'}`, 'info');
        };
        reader.readAsDataURL(file);
      }
    }
  }
}

function addImageAttachment(fileName, imageData) {
  const attachmentDiv = document.createElement('div');
  attachmentDiv.className = 'file-attachment image-attachment';
  
  const truncatedName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
  
  attachmentDiv.innerHTML = `
    <span class="file-icon">🖼️</span>
    <span class="file-name" title="${fileName}">${truncatedName}</span>
    <button class="remove-file">×</button>
  `;
  
  // Store image data in data attribute
  attachmentDiv.dataset.content = imageData;
  attachmentDiv.dataset.fileName = fileName;
  attachmentDiv.dataset.isImage = 'true';
  
  // Add click handler to remove button
  const removeButton = attachmentDiv.querySelector('.remove-file');
  removeButton.addEventListener('click', () => removeFileAttachment(attachmentDiv));
  
  // Add to files container
  let filesContainer = document.getElementById('files-container');
  if (!filesContainer) {
    filesContainer = document.createElement('div');
    filesContainer.id = 'files-container';
    filesContainer.className = 'files-container';
    input.parentNode.insertBefore(filesContainer, input);
  }
  
  filesContainer.appendChild(attachmentDiv);
}

// Session management functions
function resumeSession(sessionId) {
  if (!sessionId) {
    addSystemMessage('⚠️ No session ID provided', 'warning');
    return;
  }
  
  addSystemMessage(`🔄 Resuming session: ${sessionId}`, 'info');
  vscode.postMessage({ 
    command: 'resume', 
    sessionId: sessionId,
    text: input.value || 'Resume conversation'
  });
  setProcessing(true);
}

function saveSessionToHistory(sessionId, model) {
  if (!sessionId) return;
  
  try {
    let sessionHistory = JSON.parse(localStorage.getItem('claudeCodeSessions') || '[]');
    
    // Remove existing session if it exists
    sessionHistory = sessionHistory.filter(s => s.id !== sessionId);
    
    // Add new session at the beginning
    sessionHistory.unshift({
      id: sessionId,
      model: model,
      timestamp: new Date().toISOString(),
      name: `Session ${sessionId.substring(0, 8)}`
    });
    
    // Keep only last 10 sessions
    sessionHistory = sessionHistory.slice(0, 10);
    
    localStorage.setItem('claudeCodeSessions', JSON.stringify(sessionHistory));
  } catch (error) {
    console.error('Failed to save session to history:', error);
  }
}

function getSessionHistory() {
  try {
    return JSON.parse(localStorage.getItem('claudeCodeSessions') || '[]');
  } catch (error) {
    return [];
  }
}

// Tab Management Functions
function createNewTab() {
  tabCounter++;
  const newTabId = `tab-${tabCounter}`;
  
  const newTab = {
    id: newTabId,
    sessionId: '',
    title: 'New Chat',
    chatHistory: []
  };
  
  tabs.push(newTab);
  renderTabs();
  switchToTab(newTabId);
}

function renderTabs() {
  tabsContainer.innerHTML = tabs.map(tab => `
    <div class="tab ${tab.id === activeTabId ? 'active' : ''}" id="${tab.id}" data-session-id="${tab.sessionId}">
      <span class="tab-title">${tab.title}</span>
      <button class="tab-close" data-tab-id="${tab.id}" title="Close tab">×</button>
    </div>
  `).join('');
}

function switchToTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  
  // Save current tab's chat history
  saveCurrentTabHistory();
  
  // Switch to new tab
  activeTabId = tabId;
  currentSessionId = tab.sessionId;
  
  // Update UI
  renderTabs();
  loadTabChatHistory(tab);
  
  // Update session info
  if (tab.sessionId) {
    sessionIdElement.textContent = tab.sessionId.substring(0, 8) + '...';
    sessionInfo.style.display = 'flex';
  } else {
    sessionInfo.style.display = 'none';
  }
}

function closeTab(tabId) {
  if (tabs.length === 1) {
    // Don't close the last tab, just clear it
    clearTab(tabId);
    return;
  }
  
  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;
  
  tabs.splice(tabIndex, 1);
  
  // If closing active tab, switch to another tab
  if (activeTabId === tabId) {
    const newActiveTab = tabs[Math.max(0, tabIndex - 1)];
    switchToTab(newActiveTab.id);
  } else {
    renderTabs();
  }
}

function clearTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  
  tab.sessionId = '';
  tab.title = 'New Chat';
  tab.chatHistory = [];
  
  if (activeTabId === tabId) {
    chatContainer.innerHTML = '';
    currentSessionId = null;
    sessionInfo.style.display = 'none';
    statsElement.style.display = 'none';
    continueButton.style.display = 'none';
  }
  
  renderTabs();
}

function saveCurrentTabHistory() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;
  
  // Save chat container HTML as history
  currentTab.chatHistory = Array.from(chatContainer.children).map(el => ({
    html: el.outerHTML,
    className: el.className
  }));
}

function loadTabChatHistory(tab) {
  chatContainer.innerHTML = '';
  
  if (tab.chatHistory && tab.chatHistory.length > 0) {
    tab.chatHistory.forEach(historyItem => {
      chatContainer.innerHTML += historyItem.html;
    });
  }
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleTabClick(e) {
  if (e.target.classList.contains('tab-close')) {
    e.stopPropagation();
    const tabId = e.target.dataset.tabId;
    closeTab(tabId);
  } else {
    const tabElement = e.target.closest('.tab');
    if (tabElement) {
      switchToTab(tabElement.id);
    }
  }
}

function updateTabTitle(sessionId, title) {
  const tab = tabs.find(t => t.sessionId === sessionId);
  if (tab) {
    tab.title = title || `Session ${sessionId.substring(0, 8)}`;
    renderTabs();
  }
}

function showSessionHistory() {
  const sessions = getSessionHistory();
  
  if (sessions.length === 0) {
    historyContent.innerHTML = '<div class="history-empty">No previous sessions</div>';
  } else {
    historyContent.innerHTML = sessions.map(session => `
      <div class="history-item" data-session-id="${session.id}">
        <div class="history-icon">💬</div>
        <div class="history-details">
          <div class="history-name">${session.name}</div>
          <div class="history-meta">
            <span>${session.model}</span>
            <span>${formatDate(session.timestamp)}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="history-action" data-action="resume" data-session-id="${session.id}">Resume</button>
          <button class="history-action" data-action="new-tab" data-session-id="${session.id}">New Tab</button>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    historyContent.addEventListener('click', handleHistoryAction);
  }
  
  historyOverlay.classList.add('show');
}

function hideSessionHistory() {
  historyOverlay.classList.remove('show');
}

function handleHistoryAction(e) {
  const action = e.target.dataset.action;
  const sessionId = e.target.dataset.sessionId;
  
  if (!action || !sessionId) return;
  
  if (action === 'resume') {
    resumeSessionInCurrentTab(sessionId);
  } else if (action === 'new-tab') {
    resumeSessionInNewTab(sessionId);
  }
  
  hideSessionHistory();
}

function resumeSessionInCurrentTab(sessionId) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab) {
    currentTab.sessionId = sessionId;
    currentTab.title = `Session ${sessionId.substring(0, 8)}`;
    renderTabs();
  }
  
  resumeSession(sessionId);
}

function resumeSessionInNewTab(sessionId) {
  createNewTab();
  const newTab = tabs[tabs.length - 1];
  newTab.sessionId = sessionId;
  newTab.title = `Session ${sessionId.substring(0, 8)}`;
  renderTabs();
  
  resumeSession(sessionId);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Inline Editing Functions
function createEditableCodeBlock(code, language = 'text', fileName = '') {
  const codeBlockId = `code-block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return `
    <div class="code-block" id="${codeBlockId}">
      <div class="code-block-header">
        <span class="code-block-language">${language}</span>
        ${fileName ? `<span class="code-block-file">${fileName}</span>` : ''}
        <div class="code-block-actions">
          <button class="code-action-btn" onclick="copyCodeBlock('${codeBlockId}')">Copy</button>
          <button class="code-action-btn" onclick="editCodeBlock('${codeBlockId}')">Edit</button>
          <button class="code-action-btn" onclick="applyCodeBlock('${codeBlockId}')">Apply</button>
        </div>
      </div>
      <div class="code-block-content">
        <div class="code-preview" onclick="editCodeBlock('${codeBlockId}')">${escapeHtml(code)}</div>
        <div class="inline-edit-overlay">
          <span class="edit-icon" onclick="editCodeBlock('${codeBlockId}')">✏️</span>
        </div>
      </div>
    </div>
  `;
}

function editCodeBlock(blockId) {
  const codeBlock = document.getElementById(blockId);
  if (!codeBlock) return;
  
  const previewElement = codeBlock.querySelector('.code-preview');
  const currentCode = previewElement.textContent;
  
  // Replace preview with editor
  const editor = document.createElement('textarea');
  editor.className = 'code-editor';
  editor.value = currentCode;
  editor.addEventListener('blur', () => exitEditMode(blockId));
  editor.addEventListener('keydown', handleCodeEditorKeys);
  
  previewElement.style.display = 'none';
  codeBlock.querySelector('.code-block-content').appendChild(editor);
  
  // Focus and select text
  editor.focus();
  editor.setSelectionRange(0, 0);
  
  // Update action buttons
  const editBtn = codeBlock.querySelector('.code-action-btn:nth-child(2)');
  editBtn.textContent = 'Save';
  editBtn.onclick = () => saveCodeBlock(blockId);
}

function saveCodeBlock(blockId) {
  const codeBlock = document.getElementById(blockId);
  if (!codeBlock) return;
  
  const editor = codeBlock.querySelector('.code-editor');
  const previewElement = codeBlock.querySelector('.code-preview');
  
  if (editor) {
    const newCode = editor.value;
    previewElement.textContent = newCode;
    previewElement.style.display = 'block';
    editor.remove();
    
    // Update action buttons
    const editBtn = codeBlock.querySelector('.code-action-btn:nth-child(2)');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => editCodeBlock(blockId);
    
    // Notify of changes
    addSystemMessage(`Code block updated`, 'info');
  }
}

function exitEditMode(blockId) {
  // Delay to allow save button clicks to register
  setTimeout(() => {
    const codeBlock = document.getElementById(blockId);
    if (!codeBlock) return;
    
    const editor = codeBlock.querySelector('.code-editor');
    const previewElement = codeBlock.querySelector('.code-preview');
    
    if (editor) {
      previewElement.style.display = 'block';
      editor.remove();
      
      // Reset action buttons
      const editBtn = codeBlock.querySelector('.code-action-btn:nth-child(2)');
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => editCodeBlock(blockId);
    }
  }, 100);
}

function handleCodeEditorKeys(e) {
  // Save with Ctrl+S
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    const blockId = e.target.closest('.code-block').id;
    saveCodeBlock(blockId);
  }
  
  // Exit with Escape
  if (e.key === 'Escape') {
    const blockId = e.target.closest('.code-block').id;
    exitEditMode(blockId);
  }
}

function copyCodeBlock(blockId) {
  const codeBlock = document.getElementById(blockId);
  if (!codeBlock) return;
  
  const previewElement = codeBlock.querySelector('.code-preview');
  const code = previewElement.textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    addSystemMessage('Code copied to clipboard', 'info');
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    addSystemMessage('Code copied to clipboard', 'info');
  });
}

function applyCodeBlock(blockId) {
  const codeBlock = document.getElementById(blockId);
  if (!codeBlock) return;
  
  const previewElement = codeBlock.querySelector('.code-preview');
  const code = previewElement.textContent;
  const language = codeBlock.querySelector('.code-block-language').textContent;
  const fileName = codeBlock.querySelector('.code-block-file')?.textContent;
  
  // Send to VS Code for application
  vscode.postMessage({
    command: 'applyCode',
    code: code,
    language: language,
    fileName: fileName
  });
  
  addSystemMessage(`Applied ${language} code${fileName ? ` to ${fileName}` : ''}`, 'success');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Enhanced message processing to detect code blocks
function processMessageForCodeBlocks(content) {
  // Simple regex to detect code blocks (```language\ncode\n```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  return content.replace(codeBlockRegex, (match, language, code) => {
    return createEditableCodeBlock(code.trim(), language || 'text');
  });
}

// Functions
function send() {
  if (isProcessing || !input || !input.value || !input.value.trim()) return;
  
  let message = input.value;
  
  // Include attached files and images in the message
  const filesContainer = document.getElementById('files-container');
  if (filesContainer && filesContainer.children.length > 0) {
    const attachments = Array.from(filesContainer.children);
    attachments.forEach(attachment => {
      const fileName = attachment.dataset.fileName;
      const content = attachment.dataset.content;
      const isImage = attachment.dataset.isImage === 'true';
      
      if (isImage) {
        message += `\n\n# Image: ${fileName}\n[Image data: ${content}]`;
      } else {
        message += `\n\n# File: ${fileName}\n${content}`;
      }
    });
    // Clear attachments after sending
    filesContainer.innerHTML = '';
    filesContainer.remove();
  }
  
  // Check for slash commands first
  if (message.trim().startsWith('/')) {
    const command = message.trim();
    const handled = handleSlashCommand(command);
    if (handled) {
      input.value = '';
      return;
    }
  }
  
  addUserMessage(message);
  
  // Add to command history
  addToHistory(message);
  
  // Check for extended thinking mode trigger
  const extendedThinkingTriggers = [
    'think step by step',
    'think carefully',
    'think hard',
    'break this down',
    'analyze thoroughly',
    'consider all aspects'
  ];
  
  const hasExtendedThinking = extendedThinkingTriggers.some(trigger => 
    message.toLowerCase().includes(trigger)
  );
  
  if (hasExtendedThinking) {
    addSystemMessage('🧠 Extended thinking mode detected - Claude will think more carefully', 'info');
  }
  
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
  // Clear current tab instead of global chat
  clearTab(activeTabId);
  
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
    // Process content for code blocks and convert them to editable blocks
    const processedContent = processMessageForCodeBlocks(content);
    contentDiv.innerHTML = processedContent;
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
      
      // Update current tab with session info
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab) {
        currentTab.sessionId = msg.sessionId;
        currentTab.title = `Session ${msg.sessionId.substring(0, 8)}`;
        renderTabs();
      }
      
      // Save session to history
      saveSessionToHistory(msg.sessionId, msg.model);
      
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
      
    case 'shellOutput':
      handleShellOutput(msg);
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

// Memory and CLI Elements
const claudeMdContent = document.getElementById('claude-md-content');
const initClaudeMdButton = document.getElementById('init-claude-md');
const workingDirectories = document.getElementById('working-directories');
const browseDirsButton = document.getElementById('browse-dirs');
const verboseMode = document.getElementById('verbose-mode');
const continueConversation = document.getElementById('continue-conversation');
const resumeSession = document.getElementById('resume-session');
const contextLimit = document.getElementById('context-limit');

// Settings Event Listeners
settingsButton.addEventListener('click', showSettings);
closeSettingsButton.addEventListener('click', hideSettings);
saveSettingsButton.addEventListener('click', saveSettings);
resetSettingsButton.addEventListener('click', resetSettings);
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) hideSettings();
});

// Memory and CLI Event Listeners
initClaudeMdButton.addEventListener('click', initializeClaudeMd);
browseDirsButton.addEventListener('click', browseDirectories);

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

// @ Mention, Slash Command, and Memory Command Functions
function handleInputChange(e) {
  const text = input.value;
  const cursorPos = input.selectionStart;
  
  // Check for memory command (# at start of line or after newline)
  const beforeCursor = text.substring(0, cursorPos);
  const memoryMatch = beforeCursor.match(/(?:^|\n)#([^#\n]*)$/);
  
  if (memoryMatch) {
    isMemoryCommand = true;
    isSlashCommand = false;
    memoryCommandQuery = memoryMatch[1];
    memoryCommandStartPos = beforeCursor.lastIndexOf('#');
    showMemoryCommandPopup();
    return;
  }
  
  // Check for slash command (at start of line or after newline)
  const slashMatch = beforeCursor.match(/(?:^|\n)\/([^\/\s]*)$/);
  
  if (slashMatch) {
    isSlashCommand = true;
    isMemoryCommand = false;
    slashCommandQuery = slashMatch[1];
    slashCommandStartPos = beforeCursor.lastIndexOf('/');
    showSlashCommandPopup();
    return;
  }
  
  // Check for @ mention (including MCP resources like @server:resource://path)
  const mentionMatch = beforeCursor.match(/@([^@\s]*)$/);
  
  if (mentionMatch) {
    isSlashCommand = false;
    isMemoryCommand = false;
    currentMentionQuery = mentionMatch[1];
    mentionStartPos = cursorPos - currentMentionQuery.length - 1;
    
    // Check if this looks like an MCP resource reference
    const isMcpResource = currentMentionQuery.includes(':') || currentMentionQuery.includes('://');
    showMentionPopup(isMcpResource);
  } else {
    hideMentionPopup();
    hideSlashCommandPopup();
    hideMemoryCommandPopup();
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
      if (isMemoryCommand) {
        selectMemoryType(selectedMentionIndex);
      } else if (isSlashCommand) {
        selectSlashCommand(selectedMentionIndex);
      } else {
        selectMention(selectedMentionIndex);
      }
      break;
    case 'Escape':
      hideMentionPopup();
      hideSlashCommandPopup();
      hideMemoryCommandPopup();
      break;
  }
}

function showMentionPopup(isMcpResource = false) {
  if (isMcpResource) {
    vscode.postMessage({ command: 'getMcpResourceSuggestions', query: currentMentionQuery });
  } else {
    vscode.postMessage({ command: 'getMentionSuggestions', query: currentMentionQuery });
  }
  
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

function populateMcpResourcePopup(suggestions) {
  const header = `
    <div class="mcp-popup-header">
      <span class="mcp-icon">🔌</span>
      <div class="mcp-header-text">
        <div class="mcp-title">MCP Resources</div>
        <div class="mcp-subtitle">@server:resource://path</div>
      </div>
    </div>
  `;
  
  const items = suggestions.map((item, index) => {
    const icon = getMcpResourceIcon(item.type);
    return `
      <div class="mention-item mcp-resource-item" data-index="${index}">
        <span class="mention-icon">${icon}</span>
        <div class="mention-text">
          <div class="mention-label">${item.server}:${item.resource}</div>
          <div class="mention-detail">${item.description || item.type}</div>
        </div>
        <span class="mcp-resource-path">${item.path || ''}</span>
      </div>
    `;
  }).join('');
  
  mentionPopup.innerHTML = header + items;
  updateMentionSelection();
}

function getMcpResourceIcon(type) {
  const icons = {
    'file': '📄',
    'directory': '📁',
    'database': '🗄️',
    'api': '🌐',
    'service': '⚙️',
    'tool': '🔧',
    'memory': '🧠',
    'search': '🔍'
  };
  return icons[type] || '🔌';
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

// Slash Command Functions
function showSlashCommandPopup() {
  const slashCommands = getSlashCommands();
  const filtered = slashCommands.filter(cmd => 
    cmd.name.toLowerCase().includes(slashCommandQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(slashCommandQuery.toLowerCase())
  );
  populateSlashCommandPopup(filtered);
  
  // Position popup
  const rect = input.getBoundingClientRect();
  mentionPopup.style.left = '0px';
  mentionPopup.style.bottom = `${input.offsetHeight + 5}px`;
  mentionPopup.classList.add('show');
}

function hideSlashCommandPopup() {
  mentionPopup.classList.remove('show');
  selectedMentionIndex = 0;
  isSlashCommand = false;
}

function getSlashCommands() {
  return [
    { name: 'clear', description: 'Clear conversation history', category: 'session' },
    { name: 'compact', description: 'Compact conversation with optional focus instructions', category: 'session' },
    { name: 'model', description: 'Select or change the AI model', category: 'config' },
    { name: 'memory', description: 'Edit CLAUDE.md memory files', category: 'memory' },
    { name: 'init', description: 'Initialize project with CLAUDE.md guide', category: 'memory' },
    { name: 'status', description: 'View account and system statuses', category: 'info' },
    { name: 'cost', description: 'Show token usage statistics', category: 'info' },
    { name: 'help', description: 'Get usage help', category: 'info' },
    { name: 'review', description: 'Request code review', category: 'dev' },
    { name: 'mcp', description: 'Manage MCP server connections', category: 'config' },
    { name: 'permissions', description: 'View or update permissions', category: 'config' },
    { name: 'add-dir', description: 'Add additional working directories', category: 'config' },
    { name: 'config', description: 'View/modify configuration', category: 'config' },
    { name: 'doctor', description: 'Check Claude Code installation health', category: 'debug' },
    { name: 'vim', description: 'Enter vim mode for alternating insert and command modes', category: 'mode' },
    { name: 'terminal', description: 'Open interactive terminal interface', category: 'dev' },
    { name: 'term', description: 'Quick terminal command execution', category: 'dev' },
    { name: 'shell', description: 'Execute shell commands with output', category: 'dev' },
    { name: 'cmd', description: 'Run command line tools', category: 'dev' },
    { name: 'terminal-setup', description: 'Install Shift+Enter key binding', category: 'setup' },
    { name: 'git-status', description: 'Show git repository status', category: 'git' },
    { name: 'git-diff', description: 'Show git changes (diff)', category: 'git' },
    { name: 'git-log', description: 'Show recent git commits', category: 'git' },
    { name: 'git-branch', description: 'Show current git branch and available branches', category: 'git' },
    { name: 'git-add', description: 'Stage files for commit', category: 'git' },
    { name: 'git-commit', description: 'Create a commit with message', category: 'git' },
    { name: 'git-push', description: 'Push commits to remote', category: 'git' },
    { name: 'git-pull', description: 'Pull latest changes from remote', category: 'git' }
  ];
}

function populateSlashCommandPopup(commands) {
  mentionPopup.innerHTML = commands.map((cmd, index) => {
    const icon = getSlashCommandIcon(cmd.category);
    return `
      <div class="mention-item slash-command-item" data-index="${index}">
        <span class="mention-icon">${icon}</span>
        <div class="mention-text">
          <div class="mention-label">/${cmd.name}</div>
          <div class="mention-detail">${cmd.description}</div>
        </div>
        <span class="slash-category">${cmd.category}</span>
      </div>
    `;
  }).join('');
  
  updateMentionSelection();
}

function getSlashCommandIcon(category) {
  const icons = {
    session: '🔄',
    config: '⚙️',
    memory: '🧠',
    info: 'ℹ️',
    dev: '🔧',
    debug: '🩺',
    mode: '🎯',
    setup: '🛠️',
    git: '📦'
  };
  return icons[category] || '📝';
}

function selectSlashCommand(index) {
  const items = mentionPopup.querySelectorAll('.mention-item');
  if (!items[index]) return;
  
  const text = input.value;
  const beforeSlash = text.substring(0, slashCommandStartPos);
  const afterCursor = text.substring(input.selectionStart);
  const commandName = items[index].querySelector('.mention-label').textContent;
  
  // Replace the partial slash command with the full command
  input.value = beforeSlash + commandName + ' ' + afterCursor;
  input.setSelectionRange(slashCommandStartPos + commandName.length + 1, slashCommandStartPos + commandName.length + 1);
  
  hideSlashCommandPopup();
}

// Memory Command Functions
function showMemoryCommandPopup() {
  const memoryTypes = getMemoryTypes();
  populateMemoryTypePopup(memoryTypes);
  
  // Position popup
  const rect = input.getBoundingClientRect();
  mentionPopup.style.left = '0px';
  mentionPopup.style.bottom = `${input.offsetHeight + 5}px`;
  mentionPopup.classList.add('show');
}

function hideMemoryCommandPopup() {
  mentionPopup.classList.remove('show');
  selectedMentionIndex = 0;
  isMemoryCommand = false;
}

function getMemoryTypes() {
  return [
    { 
      name: 'project', 
      description: 'Project memory (./CLAUDE.md) - Shared with team', 
      category: 'team',
      path: './CLAUDE.md',
      icon: '📁'
    },
    { 
      name: 'user', 
      description: 'User memory (~/.claude/CLAUDE.md) - Personal preferences', 
      category: 'personal',
      path: '~/.claude/CLAUDE.md',
      icon: '👤'
    },
    { 
      name: 'project-local', 
      description: 'Project local memory (./CLAUDE.local.md) - Git ignored', 
      category: 'local',
      path: './CLAUDE.local.md',
      icon: '🔒'
    }
  ];
}

function populateMemoryTypePopup(memoryTypes) {
  mentionPopup.innerHTML = `
    <div class="memory-popup-header">
      <span class="memory-icon">🧠</span>
      <div class="memory-header-text">
        <div class="memory-title">Save to Memory</div>
        <div class="memory-subtitle">Choose where to store this memory</div>
      </div>
    </div>
    ${memoryTypes.map((type, index) => `
      <div class="mention-item memory-type-item" data-index="${index}">
        <span class="mention-icon">${type.icon}</span>
        <div class="mention-text">
          <div class="mention-label">${type.name}</div>
          <div class="mention-detail">${type.description}</div>
        </div>
        <span class="memory-path">${type.path}</span>
      </div>
    `).join('')}
  `;
  
  updateMentionSelection();
}

function selectMemoryType(index) {
  const memoryTypes = getMemoryTypes();
  if (!memoryTypes[index]) return;
  
  const selectedType = memoryTypes[index];
  const text = input.value;
  const beforeMemory = text.substring(0, memoryCommandStartPos);
  const afterCursor = text.substring(input.selectionStart);
  
  // Extract the memory content (everything after #)
  const memoryContent = text.substring(memoryCommandStartPos + 1, input.selectionStart).trim();
  
  if (!memoryContent) {
    hideMemoryCommandPopup();
    return;
  }
  
  // Save to selected memory type
  vscode.postMessage({ 
    command: 'saveToMemory', 
    memoryType: selectedType.name,
    content: memoryContent,
    path: selectedType.path
  });
  
  // Remove the # command from input and show success message
  input.value = beforeMemory + afterCursor;
  input.setSelectionRange(memoryCommandStartPos, memoryCommandStartPos);
  
  // Show confirmation
  addSystemMessage(`💾 Saved to ${selectedType.name} memory: "${memoryContent}"`, 'success');
  
  hideMemoryCommandPopup();
}

// Context Actions
function addCurrentSelection() {
  vscode.postMessage({ command: 'getCurrentSelection' });
}

function addWorkspaceContext() {
  vscode.postMessage({ command: 'getWorkspaceInfo' });
}

function addGitContext() {
  vscode.postMessage({ command: 'getGitStatus' });
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
    appendSystemPrompt: document.getElementById('append-system-prompt').value,
    // Memory and CLI options
    claudeMdContent: document.getElementById('claude-md-content').value,
    workingDirectories: document.getElementById('working-directories').value,
    verboseMode: document.getElementById('verbose-mode').checked,
    continueConversation: document.getElementById('continue-conversation').checked,
    resumeSession: document.getElementById('resume-session').value,
    contextLimit: parseInt(document.getElementById('context-limit').value)
  };
  
  // Save CLAUDE.md content if provided
  if (settings.claudeMdContent) {
    saveClaudeMdContent(settings.claudeMdContent);
  }
  
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
  
  // Memory and context settings
  document.getElementById('claude-md-content').value = settings.claudeMdContent || '';
  document.getElementById('working-directories').value = settings.workingDirectories || '';
  
  // CLI options
  document.getElementById('verbose-mode').checked = settings.verboseMode || false;
  document.getElementById('continue-conversation').checked = settings.continueConversation || false;
  document.getElementById('resume-session').value = settings.resumeSession || '';
  document.getElementById('context-limit').value = settings.contextLimit || 100000;
  
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
    case 'mcpResourceSuggestions':
      populateMcpResourcePopup(message.suggestions);
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
    case 'gitStatus':
      addContextReference('git', 'Git Status', message.status);
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

// Memory Management Functions
function initializeClaudeMd() {
  vscode.postMessage({ command: 'initializeClaudeMd' });
}

function browseDirectories() {
  vscode.postMessage({ command: 'browseDirectories' });
}

function loadClaudeMdContent() {
  vscode.postMessage({ command: 'loadClaudeMdContent' });
}

function saveClaudeMdContent(content) {
  vscode.postMessage({ command: 'saveClaudeMdContent', content });
}

// Initialize Enhanced Features
function initializeEnhancedFeatures() {
  // Load command history from localStorage
  loadHistoryFromStorage();
  
  // Initialize vim mode from localStorage
  const storedVimMode = localStorage.getItem('vimMode');
  if (storedVimMode === 'true') {
    vimMode = true;
    vimCurrentMode = 'normal';
    updateVimModeIndicator();
    updateInputStyle();
  }
  
  // Initialize tabs
  renderTabs();
  
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
    if (!historyOverlay.contains(e.target) || e.target === historyOverlay) {
      hideSessionHistory();
    }
  });
}

// Vim Mode Functions
function toggleVimMode() {
  vimMode = !vimMode;
  if (vimMode) {
    vimCurrentMode = 'normal';
    updateVimModeIndicator();
    updateInputStyle();
    // Position cursor at current location
    vimCursorPosition = input.selectionStart;
  } else {
    removeVimModeIndicator();
    restoreInputStyle();
  }
  
  // Save vim mode preference
  localStorage.setItem('vimMode', vimMode.toString());
  
  addSystemMessage(`Vim mode ${vimMode ? 'enabled' : 'disabled'}`, 'info');
}

function handleVimKeydown(e) {
  vimCursorPosition = input.selectionStart;
  
  switch (vimCurrentMode) {
    case 'normal':
      return handleVimNormalMode(e);
    case 'insert':
      return handleVimInsertMode(e);
    case 'visual':
      return handleVimVisualMode(e);
    default:
      return false;
  }
}

function handleVimNormalMode(e) {
  const text = input.value;
  const lines = text.split('\n');
  const currentLine = getCurrentLine();
  const currentCol = getCurrentColumn();
  
  // Build command buffer for multi-character commands
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    vimCommandBuffer += e.key;
  }
  
  // Check for complete commands
  const command = vimCommandBuffer;
  
  switch (e.key) {
    case 'h': // Move left
      e.preventDefault();
      moveCursor(-1, 0);
      vimCommandBuffer = '';
      return true;
      
    case 'j': // Move down
      e.preventDefault();
      moveCursor(0, 1);
      vimCommandBuffer = '';
      return true;
      
    case 'k': // Move up
      e.preventDefault();
      moveCursor(0, -1);
      vimCommandBuffer = '';
      return true;
      
    case 'l': // Move right
      e.preventDefault();
      moveCursor(1, 0);
      vimCommandBuffer = '';
      return true;
      
    case 'i': // Insert mode
      e.preventDefault();
      enterInsertMode();
      vimCommandBuffer = '';
      return true;
      
    case 'a': // Insert mode (after cursor)
      e.preventDefault();
      moveCursor(1, 0);
      enterInsertMode();
      vimCommandBuffer = '';
      return true;
      
    case 'A': // Insert mode (end of line)
      e.preventDefault();
      moveToEndOfLine();
      enterInsertMode();
      vimCommandBuffer = '';
      return true;
      
    case 'o': // New line below and insert
      e.preventDefault();
      moveToEndOfLine();
      insertText('\n');
      moveCursor(0, 1);
      enterInsertMode();
      vimCommandBuffer = '';
      return true;
      
    case 'O': // New line above and insert
      e.preventDefault();
      moveToBeginningOfLine();
      insertText('\n');
      moveCursor(0, -1);
      enterInsertMode();
      vimCommandBuffer = '';
      return true;
      
    case 'x': // Delete character
      e.preventDefault();
      deleteCharacter();
      vimCommandBuffer = '';
      return true;
      
    case 'v': // Visual mode
      e.preventDefault();
      enterVisualMode();
      vimCommandBuffer = '';
      return true;
      
    case 'y': // Yank (copy)
      if (command === 'yy') {
        e.preventDefault();
        yankLine();
        vimCommandBuffer = '';
        return true;
      }
      break;
      
    case 'p': // Paste
      e.preventDefault();
      paste();
      vimCommandBuffer = '';
      return true;
      
    case 'd': // Delete
      if (command === 'dd') {
        e.preventDefault();
        deleteLine();
        vimCommandBuffer = '';
        return true;
      }
      break;
      
    case '0': // Beginning of line
      e.preventDefault();
      moveToBeginningOfLine();
      vimCommandBuffer = '';
      return true;
      
    case '$': // End of line
      e.preventDefault();
      moveToEndOfLine();
      vimCommandBuffer = '';
      return true;
      
    case 'w': // Next word
      e.preventDefault();
      moveToNextWord();
      vimCommandBuffer = '';
      return true;
      
    case 'b': // Previous word
      e.preventDefault();
      moveToPreviousWord();
      vimCommandBuffer = '';
      return true;
      
    case 'u': // Undo
      e.preventDefault();
      // Simple undo - restore previous text if available
      if (vimLastCommand) {
        addSystemMessage('Undo not fully implemented in vim mode', 'info');
      }
      vimCommandBuffer = '';
      return true;
      
    case 'Escape':
      e.preventDefault();
      vimCommandBuffer = '';
      return true;
      
    case ':': // Command mode
      e.preventDefault();
      handleVimCommand();
      vimCommandBuffer = '';
      return true;
      
    default:
      // Clear command buffer on unknown keys
      if (e.key === 'Escape' || e.key.length > 1) {
        vimCommandBuffer = '';
      }
      return false;
  }
  
  return false;
}

function handleVimInsertMode(e) {
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      exitInsertMode();
      return true;
    default:
      // Allow normal input in insert mode
      return false;
  }
}

function handleVimVisualMode(e) {
  switch (e.key) {
    case 'h':
      e.preventDefault();
      extendSelection(-1, 0);
      return true;
    case 'j':
      e.preventDefault();
      extendSelection(0, 1);
      return true;
    case 'k':
      e.preventDefault();
      extendSelection(0, -1);
      return true;
    case 'l':
      e.preventDefault();
      extendSelection(1, 0);
      return true;
    case 'y':
      e.preventDefault();
      yankSelection();
      exitVisualMode();
      return true;
    case 'd':
      e.preventDefault();
      deleteSelection();
      exitVisualMode();
      return true;
    case 'Escape':
      e.preventDefault();
      exitVisualMode();
      return true;
    default:
      return false;
  }
}

// Vim mode helper functions
function enterInsertMode() {
  vimCurrentMode = 'insert';
  updateVimModeIndicator();
}

function exitInsertMode() {
  vimCurrentMode = 'normal';
  updateVimModeIndicator();
  // Move cursor back one position (vim behavior)
  if (vimCursorPosition > 0) {
    moveCursor(-1, 0);
  }
}

function enterVisualMode() {
  vimCurrentMode = 'visual';
  vimVisualStart = input.selectionStart;
  vimVisualEnd = input.selectionStart;
  updateVimModeIndicator();
}

function exitVisualMode() {
  vimCurrentMode = 'normal';
  vimVisualStart = null;
  vimVisualEnd = null;
  updateVimModeIndicator();
  // Clear selection
  input.setSelectionRange(vimCursorPosition, vimCursorPosition);
}

function moveCursor(deltaX, deltaY) {
  const text = input.value;
  const lines = text.split('\n');
  const currentLine = getCurrentLine();
  const currentCol = getCurrentColumn();
  
  let newLine = Math.max(0, Math.min(lines.length - 1, currentLine + deltaY));
  let newCol = Math.max(0, Math.min(lines[newLine].length, currentCol + deltaX));
  
  // If moving up/down, try to maintain column position
  if (deltaY !== 0) {
    newCol = Math.min(lines[newLine].length, currentCol);
  }
  
  const newPosition = lines.slice(0, newLine).join('\n').length + (newLine > 0 ? 1 : 0) + newCol;
  input.setSelectionRange(newPosition, newPosition);
  vimCursorPosition = newPosition;
}

function getCurrentLine() {
  const text = input.value.substring(0, vimCursorPosition);
  return text.split('\n').length - 1;
}

function getCurrentColumn() {
  const text = input.value.substring(0, vimCursorPosition);
  const lines = text.split('\n');
  return lines[lines.length - 1].length;
}

function moveToBeginningOfLine() {
  const currentLine = getCurrentLine();
  const lines = input.value.split('\n');
  const position = lines.slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
  input.setSelectionRange(position, position);
  vimCursorPosition = position;
}

function moveToEndOfLine() {
  const currentLine = getCurrentLine();
  const lines = input.value.split('\n');
  const position = lines.slice(0, currentLine + 1).join('\n').length;
  input.setSelectionRange(position, position);
  vimCursorPosition = position;
}

function moveToNextWord() {
  const text = input.value;
  let pos = vimCursorPosition;
  
  // Skip current word
  while (pos < text.length && /\w/.test(text[pos])) pos++;
  // Skip whitespace
  while (pos < text.length && /\s/.test(text[pos])) pos++;
  
  input.setSelectionRange(pos, pos);
  vimCursorPosition = pos;
}

function moveToPreviousWord() {
  const text = input.value;
  let pos = vimCursorPosition;
  
  // Move back one if at beginning of word
  if (pos > 0) pos--;
  // Skip whitespace
  while (pos > 0 && /\s/.test(text[pos])) pos--;
  // Skip to beginning of word
  while (pos > 0 && /\w/.test(text[pos - 1])) pos--;
  
  input.setSelectionRange(pos, pos);
  vimCursorPosition = pos;
}

function deleteCharacter() {
  const text = input.value;
  if (vimCursorPosition < text.length) {
    const newText = text.substring(0, vimCursorPosition) + text.substring(vimCursorPosition + 1);
    input.value = newText;
  }
}

function insertText(text) {
  const currentText = input.value;
  const newText = currentText.substring(0, vimCursorPosition) + text + currentText.substring(vimCursorPosition);
  input.value = newText;
  vimCursorPosition += text.length;
  input.setSelectionRange(vimCursorPosition, vimCursorPosition);
}

function yankLine() {
  const lines = input.value.split('\n');
  const currentLine = getCurrentLine();
  vimYankBuffer = lines[currentLine] + '\n';
  addSystemMessage('Line yanked', 'info');
}

function yankSelection() {
  const start = Math.min(vimVisualStart, vimVisualEnd);
  const end = Math.max(vimVisualStart, vimVisualEnd);
  vimYankBuffer = input.value.substring(start, end);
  addSystemMessage('Selection yanked', 'info');
}

function paste() {
  if (vimYankBuffer) {
    insertText(vimYankBuffer);
    addSystemMessage('Pasted', 'info');
  }
}

function deleteLine() {
  const lines = input.value.split('\n');
  const currentLine = getCurrentLine();
  
  if (lines.length === 1) {
    input.value = '';
    vimCursorPosition = 0;
  } else {
    lines.splice(currentLine, 1);
    input.value = lines.join('\n');
    
    // Adjust cursor position
    const newPosition = lines.slice(0, Math.min(currentLine, lines.length - 1)).join('\n').length;
    vimCursorPosition = newPosition;
    input.setSelectionRange(vimCursorPosition, vimCursorPosition);
  }
}

function deleteSelection() {
  const start = Math.min(vimVisualStart, vimVisualEnd);
  const end = Math.max(vimVisualStart, vimVisualEnd);
  const text = input.value;
  input.value = text.substring(0, start) + text.substring(end);
  vimCursorPosition = start;
  input.setSelectionRange(vimCursorPosition, vimCursorPosition);
}

function extendSelection(deltaX, deltaY) {
  moveCursor(deltaX, deltaY);
  vimVisualEnd = vimCursorPosition;
  const start = Math.min(vimVisualStart, vimVisualEnd);
  const end = Math.max(vimVisualStart, vimVisualEnd);
  input.setSelectionRange(start, end);
}

function handleVimCommand() {
  // Simple command mode - just show a message for now
  addSystemMessage('Vim command mode - type ":vim" to toggle vim mode', 'info');
}

function updateVimModeIndicator() {
  let indicator = document.getElementById('vim-mode-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'vim-mode-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
      z-index: 1000;
    `;
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(indicator);
  }
  
  const modeColors = {
    normal: 'var(--vscode-statusBarItem-prominentBackground)',
    insert: 'var(--vscode-statusBarItem-warningBackground)', 
    visual: 'var(--vscode-statusBarItem-errorBackground)'
  };
  
  indicator.textContent = vimCurrentMode.toUpperCase();
  indicator.style.background = modeColors[vimCurrentMode] || modeColors.normal;
}

function removeVimModeIndicator() {
  const indicator = document.getElementById('vim-mode-indicator');
  if (indicator) {
    indicator.remove();
  }
}

function updateInputStyle() {
  if (vimCurrentMode === 'normal') {
    input.style.caretColor = 'transparent';
  } else {
    input.style.caretColor = '';
  }
}

function restoreInputStyle() {
  input.style.caretColor = '';
}

function handleInputBlur() {
  if (vimMode && vimCurrentMode === 'insert') {
    exitInsertMode();
  }
}

function handleInputFocus() {
  if (vimMode) {
    updateVimModeIndicator();
  }
}

// Add vim mode toggle to slash commands
function handleSlashCommand(command) {
  const parts = command.trim().split(' ');
  const cmd = parts[0];
  const args = parts.slice(1).join(' ');
  
  switch (cmd) {
    case '/vim':
      toggleVimMode();
      return true;
    case '/terminal':
    case '/term':
    case '/cmd':
      if (args) {
        executeTerminalCommand(args);
      } else {
        openTerminalInterface();
      }
      return true;
    case '/shell':
      if (args) {
        executeShellCommand(args);
      } else {
        showShellHelp();
      }
      return true;
    default:
      return false;
  }
}

// Shell Output Handling
function handleShellOutput(msg) {
  const { output, isError, isPartial, exitCode } = msg;
  
  // Create or update terminal output container
  let outputContainer = document.getElementById('shell-output-container');
  if (!outputContainer && output) {
    outputContainer = document.createElement('div');
    outputContainer.id = 'shell-output-container';
    outputContainer.className = 'shell-output-container';
    outputContainer.innerHTML = `
      <div class="shell-output-header">
        <span>🐚 Shell Output</span>
        <button class="shell-output-close" onclick="closeShellOutput()">×</button>
      </div>
      <div class="shell-output-content">
        <pre class="shell-output-text" id="shell-output-text"></pre>
      </div>
    `;
    
    // Style the output container
    outputContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 600px;
      height: 400px;
      background: var(--vscode-terminal-background);
      color: var(--vscode-terminal-foreground);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      font-family: var(--vscode-editor-font-family);
    `;
    
    document.body.appendChild(outputContainer);
  }
  
  const outputText = document.getElementById('shell-output-text');
  if (outputText && output) {
    // Append output with proper styling
    const span = document.createElement('span');
    span.textContent = output;
    if (isError) {
      span.style.color = 'var(--vscode-terminal-ansiRed)';
    }
    outputText.appendChild(span);
    
    // Scroll to bottom
    outputText.scrollTop = outputText.scrollHeight;
  }
  
  // Show completion status
  if (!isPartial && exitCode !== undefined) {
    const statusMessage = exitCode === 0 ? '✅ Command completed' : '❌ Command failed';
    addSystemMessage(statusMessage, exitCode === 0 ? 'success' : 'error');
  }
}

function closeShellOutput() {
  const container = document.getElementById('shell-output-container');
  if (container) {
    container.remove();
  }
}

// Terminal Integration Functions
function executeTerminalCommand(command) {
  addSystemMessage(`🖥️ Executing: ${command}`, 'info');
  
  // Send to VS Code for execution
  vscode.postMessage({
    command: 'executeTerminal',
    terminalCommand: command
  });
}

function executeShellCommand(command) {
  addSystemMessage(`🐚 Running shell command: ${command}`, 'info');
  
  // Send to VS Code for execution  
  vscode.postMessage({
    command: 'executeShell',
    shellCommand: command
  });
}

function openTerminalInterface() {
  // Create inline terminal interface
  const terminalContainer = document.createElement('div');
  terminalContainer.className = 'terminal-container';
  terminalContainer.innerHTML = `
    <div class="terminal-header">
      <span>🖥️ Terminal</span>
      <button class="terminal-close" onclick="closeTerminalInterface()">×</button>
    </div>
    <div class="terminal-content">
      <input type="text" class="terminal-input" placeholder="Enter terminal command..." autofocus>
      <button class="terminal-execute" onclick="executeFromTerminal()">Execute</button>
    </div>
    <div class="terminal-output" id="terminal-output"></div>
  `;
  
  // Style the terminal
  terminalContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 300px;
    background: var(--vscode-terminal-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    display: flex;
    flex-direction: column;
  `;
  
  document.body.appendChild(terminalContainer);
  
  // Add event listeners
  const terminalInput = terminalContainer.querySelector('.terminal-input');
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeFromTerminal();
    }
  });
  
  addSystemMessage('Terminal interface opened', 'info');
}

function closeTerminalInterface() {
  const terminal = document.querySelector('.terminal-container');
  if (terminal) {
    terminal.remove();
    addSystemMessage('Terminal interface closed', 'info');
  }
}

function executeFromTerminal() {
  const terminal = document.querySelector('.terminal-container');
  if (!terminal) return;
  
  const input = terminal.querySelector('.terminal-input');
  const command = input.value.trim();
  
  if (command) {
    executeTerminalCommand(command);
    input.value = '';
  }
}

function showShellHelp() {
  const helpMessage = `
**Shell Commands Available:**
- \`/shell ls\` - List directory contents
- \`/shell pwd\` - Show current directory  
- \`/shell cd <path>\` - Change directory
- \`/shell mkdir <name>\` - Create directory
- \`/shell git status\` - Git repository status
- \`/shell npm install\` - Install npm packages
- \`/shell python script.py\` - Run Python scripts
- \`/terminal\` - Open interactive terminal interface

**Examples:**
- \`/shell ls -la\`
- \`/shell git log --oneline -5\`
- \`/terminal\` (opens popup interface)
  `;
  
  addSystemMessage(helpMessage, 'info');
}

// Add terminal commands to the slash command list
function addTerminalToSlashCommands() {
  const existingCommands = getSlashCommands();
  const terminalCommands = [
    { name: 'terminal', description: 'Open interactive terminal interface', category: 'dev' },
    { name: 'term', description: 'Quick terminal command execution', category: 'dev' },
    { name: 'shell', description: 'Execute shell commands', category: 'dev' },
    { name: 'cmd', description: 'Run command line tools', category: 'dev' }
  ];
  
  // This would need to be integrated with the existing system
  // For now, they're handled in the handleSlashCommand function
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEnhancedFeatures);
} else {
  initializeEnhancedFeatures();
}
