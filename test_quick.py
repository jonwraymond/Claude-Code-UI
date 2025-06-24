#!/usr/bin/env python3
"""Quick test script to verify Claude Code server is working."""

import asyncio
import aiohttp
import json
import sys

SERVER_URL = "http://127.0.0.1:8765"


async def test_health():
    """Test the health endpoint."""
    print("Testing health endpoint...")
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{SERVER_URL}/health") as resp:
                data = await resp.json()
                print(f"✅ Health check: {data}")
                return resp.status == 200
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False


async def test_query():
    """Test a simple query."""
    print("\nTesting query endpoint...")
    async with aiohttp.ClientSession() as session:
        payload = {
            "message": "Say hello and tell me you're working correctly in one sentence.",
            "options": {"model": "claude-3-5-sonnet-20241022", "maxTurns": 1},
        }

        try:
            async with session.post(f"{SERVER_URL}/query", json=payload) as resp:
                data = await resp.json()
                if resp.status == 200:
                    print("✅ Query successful!")
                    print(f"   Session ID: {data.get('sessionId', 'N/A')}")
                    print(f"   Model: {data.get('model', 'N/A')}")
                    if "response" in data:
                        print(f"   Response: {data['response'][:100]}...")
                    return True
                else:
                    print(f"❌ Query failed: {data}")
                    return False
        except Exception as e:
            print(f"❌ Query failed: {e}")
            return False


async def test_websocket():
    """Test WebSocket connection."""
    print("\nTesting WebSocket endpoint...")
    try:
        session = aiohttp.ClientSession()
        ws = await session.ws_connect("ws://127.0.0.1:8765/ws")

        # Send a test message
        await ws.send_json(
            {
                "type": "query",
                "message": "Count to 3.",
                "options": {"model": "claude-3-5-sonnet-20241022", "maxTurns": 1},
            }
        )

        # Read responses
        message_count = 0
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)
                message_count += 1

                if data["type"] == "token":
                    print(f"   Token: {data['content']}", end="", flush=True)
                elif data["type"] == "session":
                    print(f"\n✅ WebSocket session started: {data['sessionId']}")
                elif data["type"] == "complete":
                    print("\n✅ WebSocket complete")
                    break
                elif data["type"] == "error":
                    print(f"\n❌ WebSocket error: {data['error']}")
                    break

                if message_count > 100:  # Safety limit
                    break
            elif msg.type == aiohttp.WSMsgType.ERROR:
                print(f"❌ WebSocket error: {ws.exception()}")
                break

        await ws.close()
        await session.close()
        return True

    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        return False


async def main():
    """Run all tests."""
    print(f"Testing Claude Code Server at {SERVER_URL}")
    print("=" * 50)

    results = []

    # Test health
    results.append(await test_health())

    # Only continue if health check passed
    if results[0]:
        results.append(await test_query())
        results.append(await test_websocket())
    else:
        print("\n⚠️  Skipping other tests since health check failed")
        print("Make sure the server is running: python src/claude_code_server.py")

    # Summary
    print("\n" + "=" * 50)
    print("Test Summary:")
    print(f"  Health Check: {'✅' if results[0] else '❌'}")
    if len(results) > 1:
        print(f"  Query Test: {'✅' if results[1] else '❌'}")
        print(f"  WebSocket Test: {'✅' if results[2] else '❌'}")

    return all(results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
