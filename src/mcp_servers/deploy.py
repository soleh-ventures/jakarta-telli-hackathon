"""deploy MCP server (mock) — the write path.

rollback(pr_number) flips the deploy to 'rolled_back' and resolves its incident.
Tagged mutating in its description; the spoken-"yes" confirm-gate is enforced
agent-side (Role A), not here.

Run (stdio):  uv run python src/mcp_servers/deploy.py
Self-check:   uv run python src/mcp_servers/deploy.py check   # uses a temp db, never touches incident.db
"""

import os
import sqlite3
import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP

DB_PATH = os.environ.get("INCIDENT_DB") or str(
    Path(__file__).resolve().parents[2] / "incident.db"
)

mcp = FastMCP("deploy")

ETA_MINUTES = 3  # ponytail: canned ETA, real deploys would poll for status


def _rollback(pr_number: int) -> dict:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    row = con.execute(
        "SELECT id, title, status FROM deploys WHERE pr_number = ?", (pr_number,)
    ).fetchone()
    if row is None:
        con.close()
        return {"pr_number": pr_number, "status": "not_found"}
    con.execute("UPDATE deploys SET status = 'rolled_back' WHERE id = ?", (row["id"],))
    con.execute(
        "UPDATE incidents SET status = 'resolved' WHERE deploy_id = ?", (row["id"],)
    )
    con.commit()
    con.close()
    return {
        "pr_number": pr_number,
        "title": row["title"],
        "status": "rolled_back",
        "eta_minutes": ETA_MINUTES,
    }


@mcp.tool()
def rollback(pr_number: int) -> dict:
    """MUTATING. Revert the deploy for the given PR number and redeploy the previous
    version, resolving its incident. Returns the rollback status and ETA in minutes."""
    return _rollback(pr_number)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        import tempfile

        import seed

        tmp = os.path.join(tempfile.mkdtemp(), "incident.db")
        seed.seed(tmp)
        os.environ["INCIDENT_DB"] = tmp
        DB_PATH = tmp
        out = _rollback(seed.PR_NUMBER)
        assert out["status"] == "rolled_back" and out["eta_minutes"] == ETA_MINUTES, out
        con = sqlite3.connect(tmp)
        assert (
            con.execute("SELECT status FROM incidents WHERE deploy_id=1").fetchone()[0]
            == "resolved"
        )
        con.close()
        assert _rollback(9999)["status"] == "not_found"
        print("check ok:", out)
    else:
        mcp.run()
