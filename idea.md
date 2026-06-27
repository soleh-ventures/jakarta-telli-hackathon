# HandFree — Voice-Driven DevOps, end-to-end plan

> **One-liner:** Speak once, your agents act. HandFree is a voice layer over the MCP ecosystem — query systems, write changes, and place real calls, completely hands-free. Demo vertical: **2am on-call incident response.**

> **Built on:** LiveKit (telli's stack) + Model Context Protocol + telli outbound calling as an MCP actuator.

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

| # | Engineer says | HandFree does (MCP call) | HandFree replies |
|---|---------------|--------------------------|------------------|
| 1 | "What's failing?" | `monitoring.get_incidents()` (mock Datadog) | "Checkout API. 500s spiking, p99 at 4 seconds since the 1:40 deploy." |
| 2 | "Who shipped it?" | `github.get_recent_commits()` (real GitHub MCP) | "Priya, PR 2231 — payment retry logic, merged 1:38." |
| 3 | "Roll it back." | **confirm-gate** → `deploy.rollback(pr=2231)` (mock) | "Confirm: revert PR 2231 and redeploy? …Rolling back now, ETA 3 minutes." |
| 4 | "Tell the team." | `slack.post(channel, msg)` (real or mock Slack MCP) | "Posted to #incidents." |
| 5 | "Call the on-call lead and brief them." | **telli MCP** → real outbound phone call | "Calling now… Done. Lead acknowledged, joining the bridge." |

**The mic-drop close:** "Four tools, one real phone call, zero screens, 50 seconds. And HandFree doesn't know what DevOps is — it just speaks MCP. Swap the servers, and this same agent runs your warehouse floor or your hospital ward."

**Why this wins:** universal gut-resonance (everyone's been paged), shows the abstraction (4 unrelated MCP servers, no glue code), shows production-grade judgment (confirm-gate on writes), and pulls telli in as a real actuator (sponsor prize).

---

## 4. Architecture

```
  ┌─────────┐   audio    ┌────────────────────────────┐
  │  Phone  │◄──────────►│  LiveKit Agent (telli kit)  │
  │ / Web   │   WebRTC   │  STT → LLM → TTS loop       │
  └─────────┘            │                              │
                         │  ┌──────────────────────┐   │
                         │  │  MCP Client / router  │   │
                         │  └──────────┬───────────┘   │
                         └─────────────┼───────────────┘
                                       │ MCP (stdio/HTTP)
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        ▼              ▼               ▼               ▼              ▼
  monitoring MCP   github MCP     deploy MCP       slack MCP      telli MCP
   (mock,SQLite)   (official)   (mock,SQLite)   (real or mock)  (wrap telli API)
```

- **LLM** decides which MCP tool to call from the transcript and fills arguments.
- **Confirm-gate**: any tool tagged `mutating: true` (rollback, slack.post, telli.call) requires a spoken "yes" before execution. This is both a safety story and a demo beat.
- **Mock servers** are ~30-line Python MCP servers reading/writing a seeded SQLite DB so the data looks real and consistent across the demo.

---

## 5. Tech stack

- **Voice/runtime:** LiveKit Agents (Python) — start from telli's `telli-ai/livekit-agents` fork or `livekit-examples/voice-agent-hackathon`.
- **STT / LLM / TTS:** whatever the starter ships (AssemblyAI / OpenAI / Cartesia). Don't swap.
- **MCP:** official Python MCP SDK for our mock servers; official **GitHub MCP server** for the real one.
- **telli:** wrap telli's outbound-call API in a thin MCP server exposing one tool: `telli.place_call(number, brief)`.
- **Data:** one seeded SQLite file (`incident.db`) shared by the mock servers.
- **Repo to study first:** `den-vasyliev/voice-mcp-agent` (LiveKit + MCP already wired) — clone, understand, strip down.

---

## 6. The telli angle (sponsor prize)

telli is outbound voice. We make **telli a tool HandFree calls**, not a competitor. Wrap telli's calling API as an MCP server with one verb: `place_call(number, brief)`. In the demo, "Call the on-call lead and brief them" triggers a *real outbound phone call placed by telli*, which reports back into the voice loop.

Framing for judges: HandFree turns telli from a product into critical infrastructure inside a bigger agentic loop. Voice in → reason over MCP → telli executes a real call in the physical world.

---

## 7. Four-hour task split (3 people)

**Hour 0–1 — foundation (everyone)**
- A: Clone starter, get the bare voice loop running (speak → hear reply). Owns the LiveKit agent + LLM tool-calling glue.
- B: Stand up the MCP layer — seed `incident.db`, write `monitoring` + `deploy` mock MCP servers (read paths first).
- C: Get the **official GitHub MCP** server connected and authenticated; start the **telli MCP** wrapper.

**Hour 1–2 — read paths working end to end**
- A: Wire MCP client into the agent; get steps 1 & 2 of the script (get_incidents, get_commits) answering by voice.
- B: Finish `deploy.rollback` + `monitoring` data so numbers are consistent and believable.
- C: telli MCP `place_call` stub returning a canned success; confirm GitHub MCP returns PR 2231.

**Hour 2–3 — writes + confirm-gate (the money hour)**
- A: Implement confirm-gating for `mutating` tools (spoken "yes" required). Wire rollback + slack.post.
- B: Slack MCP (real if a token is handy, else mock). Make the agent's spoken replies tight and scripted-feeling.
- C: Make telli `place_call` place a **real** call to a teammate's phone; fallback to mock if flaky.

**Hour 3–4 — FREEZE + rehearse**
- No new features. Bug-fix only.
- Rehearse the exact 5-step script ×3. Lock the phrasing of each command.
- Record a screen+audio **fallback video** in case live audio dies on stage.
- C drafts the 90-second pitch; A is the live driver; B watches logs and can hot-fix.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Live audio/mic fails on stage | Pre-recorded fallback video of a clean run. |
| STT mishears the command | Hardcode short, distinct trigger phrases; rehearse exact wording. |
| telli call flaky over venue wifi | Mock path behind the same MCP verb; flip a flag. |
| Judge knows `voice-mcp-agent` exists | Lead with execution: confirm-gating + multi-tool + telli actuator. That repo is a single-tool toy; we out-execute it. |
| "Universal" reads as unfocused | Anchor the whole live demo in DevOps; reveal vertical-swap only as the closing line. |
| Scope creep kills the build | Hard freeze at hour 3. One vertical, 3+telli tools, no UI polish. |

---

## 9. The 90-second pitch (outline)

1. **Hook:** "Everyone here has been paged at 2am. You still had to open a laptop." (1 line)
2. **Live demo:** run the 5-step script. Let it breathe. (50s)
3. **The reveal:** "HandFree doesn't know what DevOps is. It speaks MCP. Swap the servers — warehouse, clinic, kitchen." (10s)
4. **The telli beat:** "And when it needs to act in the real world, it places a real call through telli." (5s)
5. **Close:** "HandFree — the voice layer for the entire MCP ecosystem." (1 line)

---

## 10. Definition of done (what "shippable in 4h" means)

- [ ] Voice loop: speak → agent reasons → speaks back.
- [ ] 3 MCP tools answering: monitoring (read), github (read), deploy (write).
- [ ] Confirm-gate enforced on at least one mutating call (rollback).
- [ ] Slack post works (real or mock).
- [ ] telli `place_call` fires (real preferred, mock acceptable).
- [ ] Full 5-step script runs clean 3× in rehearsal.
- [ ] Fallback recording captured.
- [ ] 90-second pitch locked, driver assigned.