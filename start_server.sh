#!/bin/bash

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY environment variable is not set."
    echo "Please set it with: export ANTHROPIC_API_KEY='your-api-key'"
    exit 1
fi

# Check if Claude Code CLI is installed
if ! command -v claude &> /dev/null; then
    echo "Warning: Claude Code CLI not found."
    echo "Please install it with: npm install -g @anthropic-ai/claude-code"
fi

# Start the server
echo "Starting Claude Code Server..."
python src/claude_code_server.py "$@" 