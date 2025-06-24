import json
import logging
import os
import sys
from typing import List, Dict, Any
from pathlib import Path
import argparse

# Web server imports
import aiohttp
from aiohttp import web
from aiohttp.web import Request, Response, WebSocketResponse
import aiohttp_cors

# Claude Code SDK imports
from claude_code_sdk import query, ClaudeCodeOptions, Message

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ClaudeCodeServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8765):
        self.host = host
        self.port = port
        self.app = web.Application()
        self.active_sessions: Dict[str, Any] = {}
        self._setup_routes()
        self._setup_cors()

    def _setup_routes(self):
        """Set up the HTTP and WebSocket routes."""
        self.app.router.add_get("/ws", self.websocket_handler)
        self.app.router.add_post("/query", self.query_handler)
        self.app.router.add_get("/health", self.health_handler)
        self.app.router.add_post("/continue", self.continue_handler)
        self.app.router.add_post("/resume", self.resume_handler)

    def _setup_cors(self):
        """Set up CORS for all routes."""
        cors = aiohttp_cors.setup(
            self.app,
            defaults={
                "*": aiohttp_cors.ResourceOptions(
                    allow_credentials=True,
                    expose_headers="*",
                    allow_headers="*",
                    allow_methods="*",
                )
            },
        )
        for route in list(self.app.router.routes()):
            cors.add(route)

    async def health_handler(self, request: Request) -> Response:
        """Health check endpoint."""
        # Check if Claude Code CLI is installed
        claude_installed = os.system("which claude > /dev/null 2>&1") == 0

        return web.json_response(
            {
                "status": "healthy",
                "service": "claude-code-server",
                "claude_cli_installed": claude_installed,
                "api_key_set": bool(os.environ.get("ANTHROPIC_API_KEY")),
            }
        )

    def _prepare_options(self, options_dict: dict) -> dict:
        """Prepare options for Claude Code SDK with proper formatting."""
        # Handle MCP config file loading
        if options_dict.get("mcp_config_path"):
            mcp_path = Path(options_dict.pop("mcp_config_path"))
            if mcp_path.exists():
                try:
                    with open(mcp_path, "r") as f:
                        options_dict["mcp_config"] = json.load(f)
                except Exception as e:
                    logger.error(f"Failed to load MCP config: {e}")

        # Convert allowed_tools and disallowed_tools to proper format
        if "allowed_tools" in options_dict and isinstance(
            options_dict["allowed_tools"], list
        ):
            # Join list into comma-separated string
            options_dict["allowed_tools"] = ",".join(options_dict["allowed_tools"])

        if "disallowed_tools" in options_dict and isinstance(
            options_dict["disallowed_tools"], list
        ):
            options_dict["disallowed_tools"] = ",".join(
                options_dict["disallowed_tools"]
            )

        # Ensure output format is set for streaming
        if "output_format" not in options_dict:
            options_dict["output_format"] = "stream-json"

        # Handle file paths (convert to Path objects where needed)
        if "cwd" in options_dict and options_dict["cwd"]:
            options_dict["cwd"] = Path(options_dict["cwd"])

        return options_dict

    async def query_handler(self, request: Request) -> Response:
        """Handle single query requests."""
        try:
            data = await request.json()
            prompt = data.get("prompt", "")
            options_dict = data.get("options", {})

            # Prepare options
            options_dict = self._prepare_options(options_dict)

            # Convert options dict to ClaudeCodeOptions
            options = ClaudeCodeOptions(**options_dict)

            messages: List[Message] = []
            async for message in query(prompt=prompt, options=options):
                messages.append(message)

            # Return the final result
            result = next(
                (msg for msg in reversed(messages) if msg.get("type") == "result"), None
            )
            if result:
                return web.json_response(result)
            else:
                return web.json_response({"error": "No result received"}, status=500)

        except Exception as e:
            logger.error(f"Error in query_handler: {str(e)}")
            return web.json_response({"error": str(e)}, status=500)

    async def continue_handler(self, request: Request) -> Response:
        """Handle continue conversation requests."""
        try:
            data = await request.json()
            prompt = data.get("prompt", "")
            options_dict = data.get("options", {})

            # Add continue flag
            options_dict["continue_"] = True

            # Prepare options
            options_dict = self._prepare_options(options_dict)
            options = ClaudeCodeOptions(**options_dict)

            messages: List[Message] = []
            async for message in query(prompt=prompt, options=options):
                messages.append(message)

            result = next(
                (msg for msg in reversed(messages) if msg.get("type") == "result"), None
            )
            if result:
                return web.json_response(result)
            else:
                return web.json_response({"error": "No result received"}, status=500)

        except Exception as e:
            logger.error(f"Error in continue_handler: {str(e)}")
            return web.json_response({"error": str(e)}, status=500)

    async def resume_handler(self, request: Request) -> Response:
        """Handle resume conversation requests."""
        try:
            data = await request.json()
            session_id = data.get("session_id", "")
            prompt = data.get("prompt", "")
            options_dict = data.get("options", {})

            # Add resume flag
            options_dict["resume"] = session_id

            # Prepare options
            options_dict = self._prepare_options(options_dict)
            options = ClaudeCodeOptions(**options_dict)

            messages: List[Message] = []
            async for message in query(prompt=prompt, options=options):
                messages.append(message)

            result = next(
                (msg for msg in reversed(messages) if msg.get("type") == "result"), None
            )
            if result:
                return web.json_response(result)
            else:
                return web.json_response({"error": "No result received"}, status=500)

        except Exception as e:
            logger.error(f"Error in resume_handler: {str(e)}")
            return web.json_response({"error": str(e)}, status=500)

    async def websocket_handler(self, request: Request) -> WebSocketResponse:
        """Handle WebSocket connections for streaming responses."""
        ws = WebSocketResponse()
        await ws.prepare(request)

        session_id = str(id(ws))
        self.active_sessions[session_id] = ws

        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        command = data.get("command")

                        if command == "query":
                            await self._handle_websocket_query(ws, data)
                        elif command == "continue":
                            await self._handle_websocket_continue(ws, data)
                        elif command == "resume":
                            await self._handle_websocket_resume(ws, data)
                        elif command == "cancel":
                            # Handle cancellation if needed
                            pass

                    except json.JSONDecodeError:
                        await ws.send_json({"type": "error", "message": "Invalid JSON"})
                    except Exception as e:
                        await ws.send_json({"type": "error", "message": str(e)})

                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")

        except Exception as e:
            logger.error(f"WebSocket handler error: {str(e)}")
        finally:
            del self.active_sessions[session_id]
            await ws.close()

        return ws

    async def _handle_websocket_query(self, ws: WebSocketResponse, data: dict):
        """Handle a query command over WebSocket."""
        prompt = data.get("prompt", "")
        options_dict = data.get("options", {})

        # Prepare options
        options_dict = self._prepare_options(options_dict)

        # Convert options dict to ClaudeCodeOptions
        options = ClaudeCodeOptions(**options_dict)

        try:
            async for message in query(prompt=prompt, options=options):
                # Enhanced message handling
                if message.get("type") == "system" and message.get("subtype") == "init":
                    # Add MCP server information if available
                    if message.get("mcp_servers"):
                        message["mcp_servers_available"] = True

                await ws.send_json(message)
        except Exception as e:
            await ws.send_json({"type": "error", "message": str(e)})

    async def _handle_websocket_continue(self, ws: WebSocketResponse, data: dict):
        """Handle a continue command over WebSocket."""
        prompt = data.get("prompt", "")
        options_dict = data.get("options", {})

        # Add continue flag
        options_dict["continue_"] = True

        # Prepare options
        options_dict = self._prepare_options(options_dict)
        options = ClaudeCodeOptions(**options_dict)

        try:
            async for message in query(prompt=prompt, options=options):
                await ws.send_json(message)
        except Exception as e:
            await ws.send_json({"type": "error", "message": str(e)})

    async def _handle_websocket_resume(self, ws: WebSocketResponse, data: dict):
        """Handle a resume command over WebSocket."""
        session_id = data.get("session_id", "")
        prompt = data.get("prompt", "")
        options_dict = data.get("options", {})

        # Add resume flag
        options_dict["resume"] = session_id

        # Prepare options
        options_dict = self._prepare_options(options_dict)
        options = ClaudeCodeOptions(**options_dict)

        try:
            async for message in query(prompt=prompt, options=options):
                await ws.send_json(message)
        except Exception as e:
            await ws.send_json({"type": "error", "message": str(e)})

    def run(self):
        """Start the server."""
        logger.info(f"Starting Claude Code Server on {self.host}:{self.port}")
        web.run_app(self.app, host=self.host, port=self.port)


def main():
    parser = argparse.ArgumentParser(
        description="Claude Code Server for VS Code Extension"
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind to")
    args = parser.parse_args()

    # Ensure ANTHROPIC_API_KEY is set
    if not os.environ.get("ANTHROPIC_API_KEY"):
        logger.error("ANTHROPIC_API_KEY environment variable is not set")
        sys.exit(1)

    # Check if Claude Code CLI is installed
    if os.system("which claude > /dev/null 2>&1") != 0:
        logger.warning(
            "Claude Code CLI not found. Please install it with: npm install -g @anthropic-ai/claude-code"
        )

    server = ClaudeCodeServer(host=args.host, port=args.port)
    server.run()


if __name__ == "__main__":
    main()
