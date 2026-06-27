# HandFree — Voice-Driven DevOps, end-to-end plan

> **One-liner:** Speak once, your agents act. HandFree is a voice layer over the MCP ecosystem — query systems, write changes, and place real calls, completely hands-free. Demo vertical: **2am on-call incident response.**

> **Built on:** LiveKit (telli's stack) for voice + WebRTC + SIP telephony, and the Model Context Protocol for tools. The real outbound phone call is placed with **LiveKit SIP** (Twilio trunk).

---

## 1. The problem (pitch hook)

Every engineer has been paged at 2am. The current "modern" answer is ChatOps — you still open a laptop and type into Slack. 2026 incident tools (AWS DevOps Agent, OpenSRE, SlackClaw) all converged on **text in Slack**. Nobody shipped **voice**. HandFree closes that gap: you handle a production incident with your voice while your hands are nowhere near a keyboard.

The deeper bet: HandFree is **not a DevOps app** — it's the universal hands-free interface for any MCP-enabled tool. DevOps is just the hero demo. Swap the MCP servers and the same agent runs a warehouse, a clinic, a kitchen.

---

## 2. What we are NOT building (scope discipline)

To survive a 4-hour build, we ruthlessly cut:
- No custom STT/TTS — use the provider baked into the LiveKit starter.
- No auth, no multi-user, no persistence beyond a SQLite file.
- No UI beyond a terminal log + (optional) a tiny status web page.
- Only **3 MCP tools wired**, not a generic registry. Hardcode the persona and voice.
- No new features after the 3-hour mark. Hour 4 is freeze + rehearse.

---

## 3. The demo script (the thing judges actually see)

**Setting:** "It's 2am. Checkout is throwing 500s. Watch me fix prod without touching a keyboard."

| # | Engineer says | HandFree does | HandFree replies |
|---|---------------|--------------------------|------------------|
| 1 | "What's failing?" | `monitoring.get_incidents()` (mock Datadog) | "Checkout API. 500s spiking, p99 at 4 seconds since the 1:40 deploy." |
| 2 | "Who shipped it?" | `github.get_recent_commits()` (real GitHub MCP) | "Priya, PR 2231 — payment retry logic, merged 1:38." |
| 3 | "Roll it back." | **confirm-gate** → `deploy.rollback(pr=2231)` (mock) | "Confirm: revert PR 2231 and redeploy? …Rolling back now, ETA 3 minutes." |
| 4 | "Tell the team." | `slack.post(channel, msg)` (real or mock Slack MCP) | "Posted to #incidents." |
| 5 | "Call the on-call lead and brief them." | **LiveKit SIP outbound call** → agent dials the lead's real phone | "Calling now… Done. Lead acknowledged, joining the bridge." |

**The mic-drop close:** "Four tools, one real phone call, zero screens, 50 seconds. And HandFree doesn't know what DevOps is — it just speaks MCP. Swap the servers, and this same agent runs your warehouse floor or your hospital ward."

**Why this wins:** universal gut-resonance (everyone's been paged), shows the abstraction (4 unrelated MCP servers, no glue code), shows production-grade judgment (confirm-gate on writes), and ends with a **real outbound phone call** — the agent acting in the physical world.

---

## 4. Architecture

```
  ┌─────────────┐  WebRTC   ┌────────────────────────────┐
  │  Operator    │◄────────►│  LiveKit Agent (HandFree)   │
  │  (web UI)    │  audio   │  STT → LLM → TTS loop       │
  └─────────────┘           │                              │
                            │  ┌──────────────────────┐   │
                            │  │  MCP Client / router  │   │
                            │  └──────────┬───────────┘   │
       outbound SIP call    │             │ MCP (stdio/HTTP)
  ┌─────────────┐  ◄────────┤             │
  │ Human's      │          └─────────────┼───────────────┐
  │ phone        │                        │               │
  └─────────────┘     ┌──────────────┬────┴──────┬────────────┐
                      ▼              ▼            ▼            ▼
                monitoring MCP   github MCP   deploy MCP   slack MCP
                 (mock,SQLite)   (official)  (mock,SQLite) (real/mock)
```

- **LLM** decides which MCP tool to call from the transcript and fills arguments.
- **Two outbound channels reach the human, both agent-initiated (no inbound):** WebRTC (operator web UI) and a real **outbound phone call over LiveKit SIP**. Redundant — if one fails to reach the human, the other does.
- **Confirm-gate**: any tool tagged `mutating: true` (rollback, slack.post, the outbound call) requires a spoken "yes" before execution. This is both a safety story and a demo beat.
- **Mock servers** are ~30-line Python MCP servers reading/writing a seeded SQLite DB so the data looks real and consistent across the demo.

---

## 5. Tech stack

- **Voice/runtime:** LiveKit Agents (Python), scaffolded from the `agent-starter-python` template. Use sponsor API credits.
- **MCP wiring:** use **LiveKit Agents' native MCP support** — pass our MCP servers straight into the agent session. No third-party glue repo needed.
- **STT / LLM / TTS:** whatever the starter ships (Deepgram / OpenAI / Cartesia via LiveKit Inference). Don't swap.
- **MCP servers:** official Python MCP SDK for our mock servers; official **GitHub MCP server** for the real one.
- **Outbound call:** **LiveKit SIP** via a Twilio Elastic SIP Trunk. The agent dispatches into a room and dials the human's phone into it. See [docs/outbound-calling.md](docs/outbound-calling.md). **No telli MCP.**
- **Web UI:** LiveKit React/Next.js frontend (`agents-react/`) — the operator's WebRTC interface and tool-call feed.
- **Data:** one seeded SQLite file (`incident.db`) shared by the mock servers.

---

## 6. The real-world actuator (the "wow")

The showstopper is that HandFree **acts in the physical world**: a real phone rings. When the agent decides to reach the human, it places a **real outbound phone call over LiveKit SIP** (Twilio trunk) — the agent is dispatched into a room and the human's phone is dialed in, where the agent briefs them by voice.

Two outbound channels carry this, for demo resilience: the **WebRTC** web UI and the **phone (SIP)** call. Both are outbound and agent-initiated; there is no inbound path. If venue wifi or browser audio kills one channel, the other still reaches the human.

Framing for judges: voice in → reason over MCP → the agent executes a **real call in the physical world**.

---

## 7. Three-person split (vertical slices)

Owners are split by **vertical slice, not by layer**, so nobody is blocked waiting on another. Each owns a stub from minute 20 and grows it.

**Roles**
- **A — Voice core (the brain):** the LiveKit agent. Owns the audio loop, LLM tool-routing, and the **confirm-gate** for mutating calls. Is the live driver in the demo.
- **B — MCP tools (the hands):** seed `incident.db`; build the mock `monitoring` + `deploy` MCP servers; wire the real **GitHub MCP**; later add Slack MCP. Owns data realism.
- **C — UI + outbound call (the wow + the face):** the **LiveKit SIP outbound call** to the human (`src/outbound_call/` package), plus the web **WebRTC UI + tool-call feed** (`agents-react/`). Owns the demo's two showstoppers.

**Shared first step (everyone, first 20 min):** run the LiveKit agent, confirm one voice round-trip works (speak → hear reply) on LiveKit access. Don't build until that's green.

**Hour 0–1 — stubs up**
- A: Bare voice loop running; map the LLM's tool-call output to MCP calls.
- B: `incident.db` seeded; `monitoring.get_incidents` + `deploy.rollback` mock servers (read paths first).
- C: Outbound SIP call stub (canned success); skeleton WebRTC web page that can render tool-call cards.

**Hour 1–2 — read paths end to end**
- A: Wire MCP servers into the agent session (native LiveKit MCP); script steps 1–2 answering by voice.
- B: Real **GitHub MCP** connected, returns PR 2231; tune `monitoring` numbers to be consistent/believable.
- C: UI shows live transcript + tool-call feed from the agent's events.

**Hour 2–3 — writes + the money beats**
- A: Implement **confirm-gating** (spoken "yes" required for `mutating` tools); wire rollback + slack.post.
- B: Slack MCP (real if token handy, else mock); tighten the agent's spoken replies.
- C: Make the **outbound SIP call** place a **real** call to a teammate's phone; UI confirm-banner flashes on gated calls. Mock fallback behind same trigger.

**Hour 3–4 — FREEZE + rehearse**
- No new features. Bug-fix only.
- Rehearse the exact 5-step script ×3; lock the phrasing of every command.
- C records a screen+audio **fallback video**; C drafts the 90-sec pitch. A drives live, B watches logs and hot-fixes.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Live audio/mic fails on stage | Pre-recorded fallback video of a clean run. |
| STT mishears the command | Hardcode short, distinct trigger phrases; rehearse exact wording. |
| Outbound call flaky over venue wifi | Mock path behind the same trigger; the WebRTC channel is the redundant reach. |
| Judge knows `voice-mcp-agent` exists | Lead with execution: confirm-gating + multi-tool + a real outbound call. That repo is a single-tool toy; we out-execute it. |
| "Universal" reads as unfocused | Anchor the whole live demo in DevOps; reveal vertical-swap only as the closing line. |
| Scope creep kills the build | Hard freeze at hour 3. One vertical, 3 tools + the real call, no UI polish. |

---

## 9. The 90-second pitch (outline)

1. **Hook:** "Everyone here has been paged at 2am. You still had to open a laptop." (1 line)
2. **Live demo:** run the 5-step script. Let it breathe. (50s)
3. **The reveal:** "HandFree doesn't know what DevOps is. It speaks MCP. Swap the servers — warehouse, clinic, kitchen." (10s)
4. **The real-world beat:** "And when it needs to act in the real world, it places a real outbound phone call." (5s)
5. **Close:** "HandFree — the voice layer for the entire MCP ecosystem." (1 line)

---

## 10. Definition of done (what "shippable in 4h" means)

- [ ] Voice loop: speak → agent reasons → speaks back.
- [ ] 3 MCP tools answering: monitoring (read), github (read), deploy (write).
- [ ] Confirm-gate enforced on at least one mutating call (rollback).
- [ ] Slack post works (real or mock).
- [ ] Outbound SIP call fires to a real phone (mock acceptable as fallback).
- [ ] Full 5-step script runs clean 3× in rehearsal.
- [ ] Fallback recording captured.
- [ ] 90-second pitch locked, driver assigned.
