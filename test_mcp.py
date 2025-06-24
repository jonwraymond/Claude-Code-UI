#!/usr/bin/env python3
"""Test MCP (Model Context Protocol) functionality."""

import asyncio
import aiohttp
import json
import sys
from pathlib import Path

SERVER_URL = "http://127.0.0.1:8765"

# Create a test MCP config
TEST_MCP_CONFIG = {
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
        }
    }
}


async def setup_mcp_config():
    """Create a test MCP configuration file."""
    config_path = Path("test-mcp-config.json")
    with open(config_path, "w") as f:
        json.dump(TEST_MCP_CONFIG, f, indent=2)
    print(f"✅ Created test MCP config at: {config_path}")
    return str(config_path)


async def test_mcp_query():
    """Test a query using MCP tools."""
    print("\nTesting MCP functionality...")

    # Setup MCP config
    config_path = await setup_mcp_config()

    async with aiohttp.ClientSession() as session:
        payload = {
            "message": "Use the filesystem MCP tool to list files in the current directory",
            "options": {
                "model": "claude-3-5-sonnet-20241022",
                "maxTurns": 3,
                "mcpConfig": config_path,
            },
        }

        try:
            async with session.post(f"{SERVER_URL}/query", json=payload) as resp:
                data = await resp.json()
                if resp.status == 200:
                    print("✅ MCP Query successful!")
                    print(f"   Session ID: {data.get('sessionId', 'N/A')}")

                    # Check if MCP servers were loaded
                    if "mcpServers" in data:
                        print(f"   MCP Servers: {list(data['mcpServers'].keys())}")

                    # Check for tool usage
                    if "toolUsage" in data:
                        for tool in data["toolUsage"]:
                            print(f"   Tool Used: {tool.get('name', 'Unknown')}")

                    return True
                else:
                    print(f"❌ MCP Query failed: {data}")
                    return False
        except Exception as e:
            print(f"❌ MCP Query failed: {e}")
            return False


async def test_mcp_websocket():
    """Test MCP functionality over WebSocket."""
    print("\nTesting MCP over WebSocket...")

    config_path = await setup_mcp_config()

    try:
        session = aiohttp.ClientSession()
        ws = await session.ws_connect("ws://127.0.0.1:8765/ws")

        # Send a test message using MCP
        await ws.send_json(
            {
                "type": "query",
                "message": "Use the filesystem MCP to read the README.md file if it exists",
                "options": {
                    "model": "claude-3-5-sonnet-20241022",
                    "maxTurns": 3,
                    "mcpConfig": config_path,
                },
            }
        )

        # Track tool usage
        tool_uses = []

        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)

                if data["type"] == "session":
                    print("✅ Session started with MCP")
                    if "mcpServers" in data:
                        print(
                            f"   Available MCP servers: {list(data.get('mcpServers', {}).keys())}"
                        )
                elif data["type"] == "toolUse":
                    tool_name = data.get("toolName", "Unknown")
                    tool_uses.append(tool_name)
                    print(f"   🔧 Tool used: {tool_name}")
                elif data["type"] == "complete":
                    print("✅ WebSocket complete")
                    break
                elif data["type"] == "error":
                    print(f"❌ Error: {data['error']}")
                    break
            elif msg.type == aiohttp.WSMsgType.ERROR:
                print(f"❌ WebSocket error: {ws.exception()}")
                break

        await ws.close()
        await session.close()

        if tool_uses:
            print(f"   Total tools used: {len(tool_uses)}")
            print(f"   Tools: {', '.join(tool_uses)}")

        return True

    except Exception as e:
        print(f"❌ MCP WebSocket test failed: {e}")
        return False


async def cleanup():
    """Clean up test files."""
    config_path = Path("test-mcp-config.json")
    if config_path.exists():
        config_path.unlink()
        print("🧹 Cleaned up test MCP config")


async def main():
    """Run MCP tests."""
    print("Testing MCP (Model Context Protocol) Functionality")
    print("=" * 50)
    print("⚠️  Note: This requires MCP server packages to be installed")
    print("   Run: npm install -g @modelcontextprotocol/server-filesystem")
    print("=" * 50)

    results = []

    # Test basic MCP query
    results.append(await test_mcp_query())

    # Test MCP over WebSocket
    results.append(await test_mcp_websocket())

    # Cleanup
    await cleanup()

    # Summary
    print("\n" + "=" * 50)
    print("MCP Test Summary:")
    print(f"  MCP Query Test: {'✅' if results[0] else '❌'}")
    print(f"  MCP WebSocket Test: {'✅' if results[1] else '❌'}")

    if not any(results):
        print("\n⚠️  MCP tests failed. Make sure:")
        print("  1. The Claude Code server is running")
        print("  2. MCP server packages are installed")
        print("  3. Your system allows npx to run")

    return all(results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
