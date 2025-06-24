"""Unit tests for the Claude Code server."""

import json
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
import aiohttp
from aiohttp import web

from src.claude_code_server import ClaudeCodeServer


class TestClaudeCodeServer:
    """Test the ClaudeCodeServer class."""

    @pytest.mark.unit
    async def test_server_initialization(self):
        """Test server initialization with default and custom parameters."""
        # Default initialization
        server = ClaudeCodeServer()
        assert server.host == "127.0.0.1"
        assert server.port == 8765
        assert isinstance(server.app, web.Application)
        assert server.active_sessions == {}

        # Custom initialization
        server = ClaudeCodeServer(host="0.0.0.0", port=9999)
        assert server.host == "0.0.0.0"
        assert server.port == 9999

    @pytest.mark.unit
    async def test_routes_setup(self):
        """Test that all routes are properly configured."""
        server = ClaudeCodeServer()
        routes = [str(route) for route in server.app.router.routes()]
        
        # Check required routes exist
        assert any("GET /ws" in route for route in routes)
        assert any("POST /query" in route for route in routes)
        assert any("GET /health" in route for route in routes)
        assert any("POST /continue" in route for route in routes)
        assert any("POST /resume" in route for route in routes)

    @pytest.mark.unit
    async def test_health_endpoint(self, test_client):
        """Test the health check endpoint."""
        resp = await test_client.get("/health")
        assert resp.status == 200
        
        data = await resp.json()
        assert data["status"] == "healthy"
        assert "version" in data

    @pytest.mark.unit
    async def test_query_endpoint_success(self, test_client, sample_query_payload, mock_claude_sdk):
        """Test successful query endpoint request."""
        resp = await test_client.post("/query", json=sample_query_payload)
        assert resp.status == 200
        
        data = await resp.json()
        assert "sessionId" in data
        assert "response" in data
        assert data["model"] == sample_query_payload["options"]["model"]

    @pytest.mark.unit
    async def test_query_endpoint_missing_message(self, test_client):
        """Test query endpoint with missing message."""
        payload = {"options": {"model": "claude-3-5-sonnet-20241022"}}
        resp = await test_client.post("/query", json=payload)
        assert resp.status == 400
        
        data = await resp.json()
        assert "error" in data
        assert "message" in data["error"].lower()

    @pytest.mark.unit
    async def test_query_endpoint_invalid_json(self, test_client):
        """Test query endpoint with invalid JSON."""
        resp = await test_client.post("/query", data="invalid json")
        assert resp.status == 400

    @pytest.mark.unit
    async def test_continue_endpoint(self, test_client, mock_claude_sdk):
        """Test the continue conversation endpoint."""
        # First create a session
        query_resp = await test_client.post("/query", json={
            "message": "Initial message",
            "options": {"model": "claude-3-5-sonnet-20241022"}
        })
        query_data = await query_resp.json()
        session_id = query_data["sessionId"]

        # Continue the conversation
        continue_payload = {
            "sessionId": session_id,
            "message": "Continue message"
        }
        resp = await test_client.post("/continue", json=continue_payload)
        assert resp.status == 200

    @pytest.mark.unit
    async def test_continue_endpoint_invalid_session(self, test_client):
        """Test continue endpoint with invalid session ID."""
        payload = {
            "sessionId": "invalid-session-id",
            "message": "Continue message"
        }
        resp = await test_client.post("/continue", json=payload)
        assert resp.status == 404

    @pytest.mark.unit
    async def test_resume_endpoint(self, test_client, mock_claude_sdk):
        """Test the resume conversation endpoint."""
        payload = {
            "sessionId": "existing-session-123",
            "options": {"model": "claude-3-5-sonnet-20241022"}
        }
        
        # Mock the SDK's resume function
        with patch("src.claude_code_server.resume") as mock_resume:
            async def mock_generator():
                yield {"type": "session", "sessionId": "existing-session-123"}
                yield {"type": "complete"}
            
            mock_resume.return_value = mock_generator()
            
            resp = await test_client.post("/resume", json=payload)
            assert resp.status == 200


class TestWebSocketHandler:
    """Test WebSocket functionality."""

    @pytest.mark.unit
    async def test_websocket_connection(self, test_client):
        """Test establishing a WebSocket connection."""
        async with test_client.ws_connect("/ws") as ws:
            assert not ws.closed
            await ws.close()

    @pytest.mark.unit
    async def test_websocket_query(self, test_client, sample_websocket_message, mock_claude_sdk):
        """Test sending a query through WebSocket."""
        async with test_client.ws_connect("/ws") as ws:
            # Send query
            await ws.send_json(sample_websocket_message)
            
            # Receive responses
            messages = []
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    messages.append(data)
                    if data.get("type") == "complete":
                        break
            
            # Verify we got expected message types
            message_types = [msg.get("type") for msg in messages]
            assert "session" in message_types
            assert "complete" in message_types

    @pytest.mark.unit
    async def test_websocket_invalid_message(self, test_client):
        """Test sending invalid message through WebSocket."""
        async with test_client.ws_connect("/ws") as ws:
            # Send invalid message
            await ws.send_str("invalid json")
            
            # Should receive error response
            msg = await ws.receive()
            data = json.loads(msg.data)
            assert data["type"] == "error"

    @pytest.mark.unit
    async def test_websocket_continue(self, test_client, mock_claude_sdk):
        """Test continue functionality through WebSocket."""
        async with test_client.ws_connect("/ws") as ws:
            # Initial query
            await ws.send_json({
                "type": "query",
                "message": "Initial message",
                "options": {"model": "claude-3-5-sonnet-20241022"}
            })
            
            # Wait for session
            session_id = None
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    if data.get("type") == "session":
                        session_id = data["sessionId"]
                    elif data.get("type") == "complete":
                        break
            
            assert session_id is not None
            
            # Send continue
            await ws.send_json({
                "type": "continue",
                "sessionId": session_id,
                "message": "Continue message"
            })


class TestErrorHandling:
    """Test error handling scenarios."""

    @pytest.mark.unit
    async def test_sdk_error_handling(self, test_client):
        """Test handling of SDK errors."""
        with patch("src.claude_code_server.query") as mock_query:
            mock_query.side_effect = Exception("SDK Error")
            
            resp = await test_client.post("/query", json={
                "message": "Test",
                "options": {"model": "claude-3-5-sonnet-20241022"}
            })
            
            assert resp.status == 500
            data = await resp.json()
            assert "error" in data

    @pytest.mark.unit
    async def test_websocket_connection_error(self, test_client):
        """Test WebSocket connection error handling."""
        with patch.object(aiohttp.web.WebSocketResponse, "prepare") as mock_prepare:
            mock_prepare.side_effect = Exception("Connection failed")
            
            with pytest.raises(aiohttp.ClientError):
                async with test_client.ws_connect("/ws"):
                    pass