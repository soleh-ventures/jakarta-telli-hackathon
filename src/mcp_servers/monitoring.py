"""monitoring MCP server (mock Datadog) — read path.

Exposes one tool, get_incidents(), reading the seeded incident.db.
Run as the agent sees it (stdio):   uv run python src/mcp_servers/monitoring.py
Self-check:                         uv run python src/mcp_servers/monitoring.py check
"""

import os
import sqlite3
import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP

# same default + env override as seed.py, so server and seed never drift
DB_PATH = os.environ.get("INCIDENT_DB") or str(
    Path(__file__).resolve().parents[2] / "incident.db"
)

mcp = FastMCP("monitoring")


def _firing_incidents() -> list[dict]:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        "SELECT i.service, i.symptom, i.p99_seconds, i.started_at, "
        "       d.pr_number, d.author "
        "FROM incidents i LEFT JOIN deploys d ON d.id = i.deploy_id "
        "WHERE i.status = 'firing'"
    ).fetchall()
    con.close()
    return [dict(r) for r in rows]


@mcp.tool()
def get_incidents() -> list[dict]:
    """Current firing production incidents: service, symptom, p99 latency (s),
    start time, and the suspect deploy's PR number and author."""
    return _firing_incidents()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        import seed

        inc = _firing_incidents()
        assert (
            inc
            and inc[0]["service"] == "Checkout API"
            and inc[0]["pr_number"] == seed.PR_NUMBER
        ), inc
        print("check ok:", inc[0])
    else:
        mcp.run()
