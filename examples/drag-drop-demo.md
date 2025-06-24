# Claude Code VS Code UI - Drag & Drop Demo

## How to Use Drag & Drop

### 1. Drag Files
- Open the Claude Code panel in VS Code
- Drag any file from your file explorer or VS Code's file tree
- Drop it onto the chat interface
- You'll see a visual overlay saying "Drop files here"
- The file will appear as an attachment with an appropriate icon

### 2. Supported File Types with Icons
- Python files (.py) → 🐍
- JavaScript/TypeScript (.js/.ts) → 📄/📘
- React files (.jsx/.tsx) → ⚛️
- Java files (.java) → ☕
- Go files (.go) → 🐹
- Rust files (.rs) → 🦀
- And many more!

### 3. Multiple Files
You can drag and drop multiple files at once. They will all appear as separate attachments.

### 4. Remove Files
Click the × button on any attachment to remove it before sending.

### 5. Text/Code Snippets
Select any text in VS Code and drag it directly into the chat input area.

## Example Workflow

1. Open Claude Code panel
2. Drag `myfile.py` into the chat
3. Type: "Can you review this Python code and suggest improvements?"
4. Click Send
5. Claude will analyze the attached file and provide feedback

## Tips
- Files are included in your message when you click Send
- Large files are handled gracefully
- The interface shows file sizes for each attachment
- You can mix regular text input with file attachments 