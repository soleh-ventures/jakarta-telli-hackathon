"""deploy MCP server (mock) — the write path.

rollback(pr_number) flips the deploy to 'rolled_back' and resolves its incident.
Tagged mutating in its description; the spoken-"yes" confirm-gate is enforced
agent-side (Role A), not here.

Run (stdio):  uv run python src/mcp_servers/deploy.py
Self-check:   uv run python src/mcp_servers/deploy.py check   # uses a temp db, never touches incident.db
"""

import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from mcp.server.fastmcp import FastMCP

DB_PATH = os.environ.get("INCIDENT_DB") or str(
    Path(__file__).resolve().parents[2] / "incident.db"
)

mcp = FastMCP("deploy")

ETA_MINUTES = 3  # ponytail: canned ETA, real deploys would poll for status

# Real rollback artifact: open a revert PR on the actual repo. Must match the repo
# the github MCP reads (servers.py) and the seeded PR (seed.py).
GH_API = "https://api.github.com"
GH_OWNER, GH_REPO = "soleh-ventures", "jakarta-telli-hackathon"


def _gh(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        GH_API + path,
        method=method,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "handfree-agent",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)


def _create_revert_pr(pr_number: int, token: str) -> str | None:
    """Open a (non-merged) revert PR on GitHub for a merged PR by rebuilding the
    base tree with each changed file restored to its pre-merge state. Returns the
    PR URL, or None if the PR isn't merged. Raises on API errors (caller catches)."""
    pr = _gh("GET", f"/repos/{GH_OWNER}/{GH_REPO}/pulls/{pr_number}", token)
    if not pr.get("merged") or not pr.get("merge_commit_sha"):
        return None
    base = pr["base"]["ref"]
    parent_sha = _gh(
        "GET", f"/repos/{GH_OWNER}/{GH_REPO}/commits/{pr['merge_commit_sha']}", token
    )["parents"][0]["sha"]
    files = _gh(
        "GET", f"/repos/{GH_OWNER}/{GH_REPO}/pulls/{pr_number}/files?per_page=100", token
    )

    # Base branch tip + its tree to layer the reverted files onto.
    base_sha = _gh("GET", f"/repos/{GH_OWNER}/{GH_REPO}/git/ref/heads/{base}", token)[
        "object"
    ]["sha"]
    base_tree = _gh("GET", f"/repos/{GH_OWNER}/{GH_REPO}/git/commits/{base_sha}", token)[
        "tree"
    ]["sha"]

    tree: list[dict] = []
    for f in files:
        path, status = f["filename"], f["status"]
        if status == "renamed" and f.get("previous_filename"):
            tree.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
            path, status = f["previous_filename"], "modified"
        if status == "added":
            # File was introduced by the PR -> remove it to revert.
            tree.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
        else:
            # modified/removed -> restore the parent's blob (binary-safe via sha).
            try:
                blob_sha = _gh(
                    "GET",
                    f"/repos/{GH_OWNER}/{GH_REPO}/contents/{path}?ref={parent_sha}",
                    token,
                )["sha"]
                tree.append(
                    {"path": path, "mode": "100644", "type": "blob", "sha": blob_sha}
                )
            except urllib.error.HTTPError:
                tree.append(
                    {"path": path, "mode": "100644", "type": "blob", "sha": None}
                )

    new_tree = _gh(
        "POST",
        f"/repos/{GH_OWNER}/{GH_REPO}/git/trees",
        token,
        {"base_tree": base_tree, "tree": tree},
    )["sha"]
    revert_sha = _gh(
        "POST",
        f"/repos/{GH_OWNER}/{GH_REPO}/git/commits",
        token,
        {
            "message": f"Revert PR #{pr_number} (HandFree automated rollback)",
            "tree": new_tree,
            "parents": [base_sha],
        },
    )["sha"]
    branch = f"handfree-rollback-pr-{pr_number}-{int(time.time())}"
    _gh(
        "POST",
        f"/repos/{GH_OWNER}/{GH_REPO}/git/refs",
        token,
        {"ref": f"refs/heads/{branch}", "sha": revert_sha},
    )
    opened = _gh(
        "POST",
        f"/repos/{GH_OWNER}/{GH_REPO}/pulls",
        token,
        {
            "title": f"Rollback: revert PR #{pr_number}",
            "head": branch,
            "base": base,
            "body": (
                "Automated rollback opened by HandFree during a production incident. "
                f"Reverts the suspect deploy (PR #{pr_number}). Not auto-merged — "
                "review and merge to complete the rollback."
            ),
        },
    )
    return opened["html_url"]


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
    version, resolving its incident. Opens a revert pull request on GitHub when a
    token is available. Returns the rollback status, ETA in minutes, and PR url."""
    result = _rollback(pr_number)
    # Open a real (non-merged) revert PR on GitHub. Best-effort: a missing token or
    # any API failure degrades to the mock result instead of failing the rollback.
    if result.get("status") == "rolled_back":
        token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
        if token:
            try:
                url = _create_revert_pr(pr_number, token)
                if url:
                    result["revert_pr_url"] = url
            except Exception as exc:  # surface the error, never crash the tool
                result["revert_pr_error"] = str(exc)[:140]
    return result


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
