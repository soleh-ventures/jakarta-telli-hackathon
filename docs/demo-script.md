# HandFree — 2-minute demo / recording script

> **Story:** You are the on-call lead. It's 2am. A production incident fires — and instead of
> a cryptic pager buzz, **your phone rings and an AI briefs you on the incident**, then takes
> your decision. The whole demo is one real phone call, placed autonomously by the agent.

This is the verified, deployed path: monitor/trigger → agent dispatched on LiveKit Cloud →
**real outbound call to the lead's phone** → agent briefs, converses, captures the decision.
No engineer driving by voice, no other tools required.

---

## The roles

- **You = the on-call lead.** You hold the phone. You do almost nothing but answer it and talk.
- **HandFree = the AI first responder.** It detects the incident and calls you.
- **The trigger** = stands in for the monitor (Datadog/alertmanager). One command, fired by a
  teammate off-camera, or auto-fired by a fake "system failure" script.

---

## Pre-flight checklist (5 min before)

- [ ] Cloud agent up: `lk agent status` → `CA_MfdPFN2yVfMJ` **Running** (eu-central).
- [ ] **Do NOT run `agent.py dev` locally** — it competes with the Cloud agent for dispatches.
- [ ] Trigger terminal ready (teammate's laptop), env loaded:
      `export SSL_CERT_FILE="$(uv run python -c 'import certifi; print(certifi.where())')"`
- [ ] Your phone: **charged, unlocked, ringer ON, max volume, speakerphone ready**, near the room mic.
- [ ] Twilio has balance + destination country enabled.
- [ ] Trigger command pre-typed in the terminal — just hit Enter on cue.
- [ ] Fallback recording open in a tab.

---

## The 2-minute script (timed)

### 0:00–0:20 — Set the scene
> **Say (you, to the audience):** "I'm on call tonight. It's 2am, I'm asleep, my laptop is
> shut. Normally a pager buzzes a cryptic alert and I stumble to four dashboards to figure
> out what's even broken. Tonight, something different happens."

*(Teammate hits Enter on the trigger now — gives ~5s before the phone rings.)*

### 0:20–0:35 — The phone rings
> **Do:** Your phone rings on stage. Pick up on **speaker** so the room hears it.
> **Say:** "It's not a human. It's our incident agent — it detected the failure and called me."

### 0:35–1:25 — The call (the whole demo)
The agent speaks first and briefs you. Then have a short, natural back-and-forth:

> **Agent (approx):** "Hi, this is HandFree, the on-call assistant. Checkout API is throwing
> elevated 500s after the 1:40 deploy — p99 latency is about four seconds, started six minutes
> ago. The likely cause is PR 2231, the payment-retry change. How would you like to proceed?"
>
> **You:** "What's the blast radius — is payments down completely?"
> **Agent:** *(answers from the brief / reasons about it)*
> **You:** "Okay. Roll back PR 2231 and page me again if it's not green in five minutes."
> **Agent:** "Understood — rolling back PR 2231, and I'll follow up if recovery stalls. Anything else?"
> **You:** "No, thanks." *(hang up)*

*(The point lands here: a real AI, on a real phone call, briefing a human and taking direction.)*

### 1:25–1:45 — The reveal
> **Say:** "No dashboards, no laptop, no typing. The system detected the incident, figured out
> the likely cause, and **called the responsible human on a real phone line** — then acted on
> my decision. The agent doesn't know what DevOps is; it speaks MCP and reaches people in the
> real world over LiveKit telephony."

### 1:45–2:00 — Close
> **Say:** "Swap the tools and the same agent calls a warehouse manager, an on-call nurse, a
> field tech. HandFree — when something breaks, it doesn't page you. It calls you, and it
> already knows what to do. Speak once; your agents act."

---

## The trigger command (fires the call)

The Cloud agent answers automatically. This stands in for the monitor that detects the failure:

```bash
uv run python -m outbound_call \
  --to +4917628950549 \
  --incident-id inc_2231 \
  --service checkout-api \
  --severity critical \
  --brief "Checkout API is returning elevated 500s after the 1:40 deploy. p99 latency ~4 seconds, started 6 minutes ago. Likely cause: PR 2231, the payment-retry change." \
  --lead-name "Lead"
```

What the agent says is driven by `--brief`, `--service`, `--severity`, `--lead-name`. Tune that
text and the agent's opening changes to match.

> **Make it feel automatic (optional):** wrap that command in a tiny `detect_failure.sh` that
> prints "⚠️ ALERT: checkout-api 500s spiking… escalating to on-call" then runs the trigger.
> Now the audience sees a "monitor" fire the call, not a person typing.

---

## Honest scope (so nothing surprises you on stage)

- ✅ **Verified:** detection-trigger → autonomous outbound call → agent briefs the lead →
  two-way conversation. This is the whole demo and it's deployed on LiveKit Cloud.
- ⚠️ **The agent talks about the rollback but doesn't execute it.** It briefs and takes your
  decision; actually running the rollback/Slack post would need those tools wired (teammates'
  MCP work). For the demo, the human decision *is* the beat — don't claim it auto-remediates
  unless that tool exists. If asked, say: "remediation tools are the next integration; tonight
  the agent's job is to reach the right human, fast, with full context."

---

## Fallback plan

1. Phone doesn't ring → re-run the trigger once. If it 403s, it's Twilio (balance/geo/creds) —
   cut to the recording, don't debug on stage.
2. Audio choppy/dead → the agent is on Cloud now (eu-central), so this is unlikely; if it
   happens, play the pre-recorded clean run.
3. **Record a clean run in advance** (screen + room audio) as the safety net.
