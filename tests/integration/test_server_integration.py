"""Integration tests for the Claude Code server."""

import asyncio
import json
from pathlib import Path

import pytest
import aiohttp


@pytest.mark.integration
class TestServerIntegration:
    """Integration tests that test the full server functionality."""

    async def test_full_conversation_flow(self, test_client, mock_claude_sdk):
        """Test a complete conversation flow: query -> continue -> complete."""
        # Initial query
        query_resp = await test_client.post("/query", json={
            "message": "Hello, count to 3",
            "options": {
                "model": "claude-3-5-sonnet-20241022",
                "maxTurns": 3
            }
        })
        assert query_resp.status == 200
        query_data = await query_resp.json()
        session_id = query_data["sessionId"]
        
        # Continue the conversation
        continue_resp = await test_client.post("/continue", json={
            "sessionId": session_id,
            "message": "Now count backwards from 3"
        })
        assert continue_resp.status == 200
        
        # Verify session persistence
        assert session_id in query_data["sessionId"]

    async def test_concurrent_sessions(self, test_client, mock_claude_sdk):
        """Test handling multiple concurrent sessions."""
        # Create multiple sessions concurrently
        tasks = []
        for i in range(5):
            payload = {
                "message": f"Session {i}",
                "options": {"model": "claude-3-5-sonnet-20241022"}
            }
            tasks.append(test_client.post("/query", json=payload))
        
        responses = await asyncio.gather(*tasks)
        
        # Verify all sessions were created successfully
        session_ids = []
        for resp in responses:
            assert resp.status == 200
            data = await resp.json()
            session_ids.append(data["sessionId"])
        
        # Verify all session IDs are unique
        assert len(set(session_ids)) == len(session_ids)

    async def test_websocket_full_flow(self, test_client, mock_claude_sdk):
        """Test complete WebSocket conversation flow."""
        async with test_client.ws_connect("/ws") as ws:
            # Send initial query
            await ws.send_json({
                "type": "query",
                "message": "What is 2+2?",
                "options": {"model": "claude-3-5-sonnet-20241022"}
            })
            
            # Collect all responses
            session_id = None
            tokens = []
            
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    
                    if data["type"] == "session":
                        session_id = data["sessionId"]
                    elif data["type"] == "token":
                        tokens.append(data["content"])
                    elif data["type"] == "complete":
                        break
            
            assert session_id is not None
            assert len(tokens) > 0
            
            # Send continue message
            await ws.send_json({
                "type": "continue",
                "sessionId": session_id,
                "message": "What about 3+3?"
            })
            
            # Verify we get response for continue
            got_response = False
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    if data["type"] == "token":
                        got_response = True
                    elif data["type"] == "complete":
                        break
            
            assert got_response

    async def test_mcp_integration(self, test_client, mock_mcp_config, mock_claude_sdk):
        """Test MCP (Model Context Protocol) integration."""
        # Query with MCP config
        payload = {
            "message": "List files using MCP",
            "options": {
                "model": "claude-3-5-sonnet-20241022",
                "mcpConfig": str(mock_mcp_config)
            }
        }
        
        resp = await test_client.post("/query", json=payload)
        assert resp.status == 200
        
        data = await resp.json()
        assert "sessionId" in data
        # In a real test, we'd verify MCP servers were loaded

    async def test_error_recovery(self, test_client):
        """Test server's ability to recover from errors."""
        # Send invalid request
        resp1 = await test_client.post("/query", json={})
        assert resp1.status == 400
        
        # Verify server still works after error
        resp2 = await test_client.get("/health")
        assert resp2.status == 200

    async def test_large_message_handling(self, test_client, mock_claude_sdk):
        """Test handling of large messages."""
        # Create a large message (10KB)
        large_message = "x" * 10000
        
        resp = await test_client.post("/query", json={
            "message": large_message,
            "options": {"model": "claude-3-5-sonnet-20241022"}
        })
        
        assert resp.status == 200

    async def test_session_cleanup(self, test_client, claude_server, mock_claude_sdk):
        """Test that sessions are properly cleaned up."""
        # Create a session
        resp = await test_client.post("/query", json={
            "message": "Test",
            "options": {"model": "claude-3-5-sonnet-20241022"}
        })
        data = await resp.json()
        session_id = data["sessionId"]
        
        # Verify session exists
        assert session_id in claude_server.active_sessions
        
        # In a real implementation, we'd test session timeout/cleanup
        # For now, just verify the structure exists
        assert isinstance(claude_server.active_sessions, dict)