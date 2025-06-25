# Claude Code React UI - Quick Start

## 🚀 Quick Start (One Command)

```bash
cd /Users/jraymond/Projects/Claude-Code-UI/web-ui
npm start
```

This will:
1. Install all dependencies
2. Start the Claude CLI server on port 3000
3. Start the React UI on port 5173
4. Open http://localhost:5173 in your browser

## 🔧 Manual Start

If the above doesn't work, try these steps:

### Terminal 1 - Start the server:
```bash
cd /Users/jraymond/Projects/Claude-Code-UI/web-ui
npm install
node server-enhanced.js
```

### Terminal 2 - Start the UI:
```bash
cd /Users/jraymond/Projects/Claude-Code-UI/web-ui
npm run dev
```

Then open http://localhost:5173

## 🎯 Features

- **Tabs**: Multiple chat sessions
- **File Attachments**: Drag & drop or click 📎
- **Authentication**: Claude CLI or API key
- **Chat History**: Click clock icon
- **Model Selection**: Choose Claude model
- **Dark Theme**: VS Code style

## 🔑 Authentication

### Option 1: Claude CLI
Make sure you're logged in:
```bash
claude login
```

### Option 2: API Key
Set environment variable:
```bash
export ANTHROPIC_API_KEY=your-key-here
```

Or enter it in the UI when prompted.

## ❓ Troubleshooting

1. **Port already in use**: Kill existing processes
   ```bash
   lsof -ti:5173 | xargs kill -9
   lsof -ti:3000 | xargs kill -9
   ```

2. **Dependencies missing**: Reinstall
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Can't connect**: Check both servers are running
   - Server should show: "🚀 Claude Code Web UI Server running on http://localhost:3000"
   - Vite should show: "VITE v7.0.0 ready"