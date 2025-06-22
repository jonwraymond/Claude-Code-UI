"""Minimal async example for the Claude Code Python SDK.

This script streams a simple prompt to the Claude Code CLI. It requires:

1. The Claude Code CLI installed via ``npm install -g @anthropic-ai/claude-code``
2. ``ANTHROPIC_API_KEY`` set in your environment.
"""

import anyio
from claude_code_sdk import query, ClaudeCodeOptions, Message
from claude_code_sdk._errors import CLINotFoundError

async def main() -> None:
    messages: list[Message] = []
    async for message in query(
        prompt="Write a haiku about foo.py",
        options=ClaudeCodeOptions(max_turns=3),
    ):
        messages.append(message)

    print(messages)

if __name__ == "__main__":
    try:
        anyio.run(main)
    except CLINotFoundError as exc:  # pragma: no cover - user facing message
        print(f"Claude Code CLI not found: {exc}")
