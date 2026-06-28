"""Role B's deliverable to Role A: the three MCP servers, wired and ready.

    from mcp_servers.servers import build_mcp_servers
    session = AgentSession(..., mcp_servers=build_mcp_servers())

- monitoring / deploy: local stdio Python servers reading the seeded incident.db.
- github: GitHub's HOSTED MCP server (https://api.githubcopilot.com/mcp/), bearer auth.
  Token from $GITHUB_TOKEN, else `gh auth token`. allowed_tools keeps the LLM's
  tool list lean (latency) — read-only PR/commit lookups only.
"""

import os
import subprocess
import sys
from pathlib import Path

from livekit.agents.llm.mcp import MCPServer, MCPServerHTTP, MCPServerStdio

_HERE = Path(__file__).resolve().parent
GITHUB_MCP_URL = "https://api.githubcopilot.com/mcp/"
# repo + the PR the demo narrates (kept in sync with incident.db's deploys.pr_number)
GITHUB_OWNER, GITHUB_REPO = "soleh-ventures", "jakarta-telli-hackathon"


def _github_token() -> str | None:
    """GitHub token from env or the gh CLI. None (not a crash) when unavailable —
    a fresh deploy (LiveKit Cloud) has neither GITHUB_TOKEN nor the gh CLI."""
    tok = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if tok:
        return tok
    try:
        return (
            subprocess.check_output(["gh", "auth", "token"], text=True).strip() or None
        )
    except Exception:
        return None


def build_mcp_servers() -> list[MCPServer]:
    py = sys.executable
    env = dict(
        os.environ
    )  # forward SLACK_BOT_TOKEN / INCIDENT_DB to the stdio subprocesses

    # Seed the mock incident DB so monitoring/deploy have data even in a fresh
    # container (incident.db isn't shipped in the image). Idempotent; never blocks.
    try:
        from mcp_servers import seed

        seed.seed()
    except Exception:
        pass

    servers: list[MCPServer] = [
        MCPServerStdio(command=py, args=[str(_HERE / "monitoring.py")], env=env),
        MCPServerStdio(command=py, args=[str(_HERE / "deploy.py")], env=env),
        MCPServerStdio(command=py, args=[str(_HERE / "slack.py")], env=env),
    ]

    # GitHub MCP is optional: include it only when a token is available, so a
    # missing token degrades the "who shipped it" lookup instead of crashing.
    token = _github_token()
    if token:
        servers.append(
            MCPServerHTTP(
                url=GITHUB_MCP_URL,
                headers={"Authorization": f"Bearer {token}"},
                allowed_tools=[
                    "list_pull_requests",
                    "list_commits",
                    "pull_request_read",
                ],
            )
        )
    else:
        print(
            "[mcp] no GitHub token (set GITHUB_TOKEN) — GitHub MCP disabled",
            file=sys.stderr,
        )
    return servers


if __name__ == "__main__":
    servers = build_mcp_servers()
    assert len(servers) >= 3  # 3 local + optional GitHub MCP
    print("built", len(servers), "MCP servers:", [type(s).__name__ for s in servers])
