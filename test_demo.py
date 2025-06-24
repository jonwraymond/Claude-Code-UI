#!/usr/bin/env python3
"""Demo test script to show testing in action without needing API key."""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from tests.conftest import claude_server
from src.claude_code_server import ClaudeCodeServer


async def test_server_basics():
    """Test basic server functionality."""
    print("🧪 Testing Claude Code Server (No API Key Required)")
    print("=" * 50)
    
    # Test 1: Server initialization
    print("\n1. Testing server initialization...")
    server = ClaudeCodeServer()
    assert server.host == "127.0.0.1"
    assert server.port == 8765
    print("   ✅ Server initialized with correct defaults")
    
    # Test 2: Route configuration
    print("\n2. Testing route configuration...")
    routes = [str(route) for route in server.app.router.routes()]
    required_routes = ["/ws", "/query", "/health", "/continue", "/resume"]
    
    for route in required_routes:
        found = any(route in r for r in routes)
        if found:
            print(f"   ✅ Route {route} configured")
        else:
            print(f"   ❌ Route {route} missing")
    
    # Test 3: CORS configuration
    print("\n3. Testing CORS configuration...")
    # Check if CORS is set up (it adds OPTIONS routes)
    options_routes = [r for r in routes if "OPTIONS" in r]
    if options_routes:
        print(f"   ✅ CORS configured ({len(options_routes)} OPTIONS routes)")
    else:
        print("   ❌ CORS not configured")
    
    # Test 4: Session management
    print("\n4. Testing session management...")
    assert hasattr(server, 'active_sessions')
    assert isinstance(server.active_sessions, dict)
    print("   ✅ Session management initialized")
    
    print("\n" + "=" * 50)
    print("✨ Basic tests completed!")
    print("\nTo run full tests with mocked API:")
    print("  pytest tests/unit/test_server.py -v")
    print("\nTo test with real API:")
    print("  export ANTHROPIC_API_KEY=your-key")
    print("  python test_quick.py")


if __name__ == "__main__":
    asyncio.run(test_server_basics())