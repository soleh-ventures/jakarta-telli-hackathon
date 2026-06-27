"""Seed incident.db — the single source of truth for the mock MCP servers.

Numbers here MUST match the demo script in idea.md §3:
  "Checkout API. 500s spiking, p99 at 4 seconds since the 1:40 deploy."
  "Priya, PR 2231 — payment retry logic, merged 1:38."  (PR# is the cross-server contract)

Run:  uv run python src/mcp_servers/seed.py
Idempotent: drops and recreates every time.
"""

import os
import sqlite3
from pathlib import Path

# repo-root/incident.db, overridable so servers + seed always agree
DB_PATH = os.environ.get("INCIDENT_DB") or str(
    Path(__file__).resolve().parents[2] / "incident.db"
)

# Cross-server contract: must match the REAL merged GitHub PR (github MCP reads it live).
# PR #2 "payment retry logic" by hudaif747, merged 2026-06-27T11:57:09Z.
# Deploy + incident times aligned to that merge so monitoring (mock) and github (real) agree.
PR_NUMBER = 2
AUTHOR = "hudaif747"
DEPLOY_AT = "2026-06-27T11:57:09Z"
INCIDENT_AT = "2026-06-27T11:58:30Z"


def seed(db_path: str = DB_PATH) -> None:
    con = sqlite3.connect(db_path)
    con.executescript(
        """
        DROP TABLE IF EXISTS incidents;
        DROP TABLE IF EXISTS deploys;

        CREATE TABLE deploys (
            id          INTEGER PRIMARY KEY,
            pr_number   INTEGER NOT NULL,
            title       TEXT    NOT NULL,
            author      TEXT    NOT NULL,
            deployed_at TEXT    NOT NULL,
            status      TEXT    NOT NULL   -- 'live' | 'rolled_back'
        );

        CREATE TABLE incidents (
            id           INTEGER PRIMARY KEY,
            service      TEXT    NOT NULL,
            symptom      TEXT    NOT NULL,
            p99_seconds  REAL    NOT NULL,
            status       TEXT    NOT NULL, -- 'firing' | 'resolved'
            started_at   TEXT    NOT NULL,
            deploy_id    INTEGER REFERENCES deploys(id)
        );
        """
    )
    con.execute(
        "INSERT INTO deploys (id, pr_number, title, author, deployed_at, status) VALUES (?,?,?,?,?,?)",
        (1, PR_NUMBER, "payment retry logic", AUTHOR, DEPLOY_AT, "live"),
    )
    con.execute(
        "INSERT INTO incidents (id, service, symptom, p99_seconds, status, started_at, deploy_id) VALUES (?,?,?,?,?,?,?)",
        (1, "Checkout API", "500s spiking", 4.0, "firing", INCIDENT_AT, 1),
    )
    con.commit()
    con.close()


if __name__ == "__main__":
    seed()
    # self-check: the two facts the demo depends on
    con = sqlite3.connect(DB_PATH)
    inc = con.execute(
        "SELECT i.service, i.symptom, i.p99_seconds, d.pr_number, d.author, d.status "
        "FROM incidents i JOIN deploys d ON d.id = i.deploy_id WHERE i.status='firing'"
    ).fetchone()
    con.close()
    assert inc == ("Checkout API", "500s spiking", 4.0, PR_NUMBER, AUTHOR, "live"), inc
    print(
        f"seeded {DB_PATH}: {inc[0]} {inc[1]}, p99 {inc[2]}s, PR {inc[3]} by {inc[4]} ({inc[5]})"
    )
