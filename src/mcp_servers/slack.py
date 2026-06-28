"""slack MCP server — post(channel, message). Real if SLACK_BOT_TOKEN is set, else mock.

Same verb either way (idea.md §8 flag-flip fallback). Real path = chat.postMessage,
needs a bot token (xoxb-, chat:write scope) with the bot invited to the channel.

Run (stdio):  uv run python src/mcp_servers/slack.py
Self-check:   uv run python src/mcp_servers/slack.py check   # mock path, no network
"""

import json
import os
import sys
import urllib.request

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("slack")


def _post(channel: str, message: str) -> dict:
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        return {"ok": True, "channel": channel, "mock": True}  # ponytail: fallback path
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps({"channel": channel, "text": message}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.load(resp)
    # surface Slack's own error (e.g. not_in_channel) instead of pretending success
    return {"ok": body.get("ok", False), "channel": channel, "error": body.get("error")}


@mcp.tool()
def post(channel: str, message: str) -> dict:
    """Post a message to a Slack channel (e.g. '#incidents'). Returns {ok, channel}."""
    return _post(channel, message)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        os.environ.pop("SLACK_BOT_TOKEN", None)  # force mock path
        out = _post("#incidents", "test")
        assert out == {"ok": True, "channel": "#incidents", "mock": True}, out
        print("check ok (mock):", out)
    else:
        mcp.run()
