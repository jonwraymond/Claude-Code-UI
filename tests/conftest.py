"""Common test fixtures and configuration."""

import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator, Dict, Any
from unittest.mock import AsyncMock, patch

import pytest
import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from src.claude_code_server import ClaudeCodeServer


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def claude_server() -> ClaudeCodeServer:
    """Create a Claude Code server instance for testing."""
    server = ClaudeCodeServer(host="127.0.0.1", port=0)  # Port 0 for random port
    return server


@pytest.fixture
async def test_client(claude_server: ClaudeCodeServer) -> AsyncGenerator[TestClient, None]:
    """Create a test client for the Claude Code server."""
    async with TestClient(TestServer(claude_server.app)) as client:
        yield client


@pytest.fixture
def mock_claude_sdk():
    """Mock the Claude Code SDK query function."""
    with patch("src.claude_code_server.query") as mock_query:
        # Create a mock async generator
        async def mock_generator():
            yield {"type": "session", "sessionId": "test-session-123"}
            yield {"type": "token", "content": "Hello from test!"}
            yield {"type": "complete"}
        
        mock_query.return_value = mock_generator()
        yield mock_query


@pytest.fixture
def sample_query_payload() -> Dict[str, Any]:
    """Sample query payload for testing."""
    return {
        "message": "Test message",
        "options": {
            "model": "claude-3-5-sonnet-20241022",
            "maxTurns": 3,
        }
    }


@pytest.fixture
def sample_websocket_message() -> Dict[str, Any]:
    """Sample WebSocket message for testing."""
    return {
        "type": "query",
        "message": "Test WebSocket message",
        "options": {
            "model": "claude-3-5-sonnet-20241022",
            "maxTurns": 1,
        }
    }


@pytest.fixture
def mock_mcp_config(tmp_path: Path) -> Path:
    """Create a mock MCP configuration file."""
    config = {
        "mcpServers": {
            "test-server": {
                "command": "echo",
                "args": ["test"]
            }
        }
    }
    config_path = tmp_path / "test-mcp-config.json"
    config_path.write_text(json.dumps(config))
    return config_path


@pytest.fixture
async def mock_websocket():
    """Create a mock WebSocket for testing."""
    ws = AsyncMock(spec=aiohttp.ClientWebSocketResponse)
    ws.closed = False
    ws.close = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_str = AsyncMock()
    return ws