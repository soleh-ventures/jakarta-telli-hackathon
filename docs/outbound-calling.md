# Outbound calling (HandFree) — handoff doc

> Branch: `feature/outbound-sip-call` (based on the new `master` with `agents-react/`).
> Owner: Kemal. Status: working, trunk provisioned, not yet load-tested with a live call.

This is the "**Call the on-call lead and brief them**" beat of the demo (step 5 in `idea.md`).
It places a **real outbound phone call** when an incident fires, with **no human in a session** —
the trigger is machine-driven (a monitor/webhook), not a person clicking a button.

---

## What I did

1. **Outbound call via LiveKit SIP** — the agent dials a real phone number into a LiveKit room.
2. **Trigger that works outside an active session** — on an incident, it (a) dispatches the
   voice agent into a fresh room and (b) dials the lead into that same room. This is the
   LiveKit [`make_call` recipe](https://docs.livekit.io/reference/recipes/make_call/).
3. **Agent briefs the lead** — when dispatched for an incident, the agent reads the incident
   from job metadata and speaks first to brief the lead by name/service/severity.
4. **Twilio Elastic SIP Trunk → LiveKit outbound trunk** provisioned and wired.

### Flow

```
monitor / webhook
   └─ trigger_incident_call(IncidentCall(...))
        1. agent_dispatch.create_dispatch()  → starts "my-agent" in room "incident-<id>"
        2. sip.create_sip_participant()        → dials the lead into that same room
   lead picks up  →  agent briefs them by voice
```

### Decision (locked)

- **Outbound only.** On a detected failure, the AI agent reaches *out* to the human. There is no
  inbound path — nobody dials in.
- **No telli MCP.** The real outbound call is done with **LiveKit SIP**, not a telli MCP wrapper.
  (`idea.md` still mentions a telli `place_call` MCP — it is now out of date.)
- **Two outbound channels, both agent-initiated, for redundancy:** WebRTC and phone (SIP). If one
  channel fails to reach the human, the other still does. Both are outbound — the agent calls the human.

### How it fits the new stack (after the React frontend was merged)

```
failure detected
   └─ src/agent.py (LiveKit Agents) understands the failure
        ├─ WebRTC channel  (agents-react) ──outbound──► human         (teammate)
        └─ phone channel   (SIP trunk)    ──outbound──► human's phone  (this work)
```

Same agent, same room model — only the outbound transport differs (WebRTC vs SIP). Neither is inbound.

---

## Files

| File | What |
|---|---|
| `src/outbound_call/` | The feature package. Import the public API straight from it: `from outbound_call import IncidentCall, trigger_incident_call, parse_incident_metadata`. |
| `src/outbound_call/sip.py` | Builds/sends the SIP participant request (the phone leg). Stored-trunk or inline Twilio config. |
| `src/outbound_call/trigger.py` | `IncidentCall` + `trigger_incident_call()` (dispatch → dial). Validates SIP config before dispatching. |
| `src/outbound_call/__main__.py` | CLI: `python -m outbound_call --to +1...`. |
| `src/agent.py` | Reads `ctx.job.metadata` via `parse_incident_metadata()`; agent speaks first to brief the lead on incident calls. (Additive — normal sessions unchanged.) |
| `tests/outbound_call/` | `test_sip.py` + `test_trigger.py` — 15 unit tests, run without credentials (use fakes). |
| `scripts/setup_twilio_trunk.sh`, `scripts/outbound-trunk.json`, `scripts/README.md` | One-time Twilio → LiveKit trunk setup. |
| `.env.example` | Documents the SIP / agent env vars. |

---

## Setup already done

- Twilio Elastic SIP Trunk: termination `handfree.pstn.twilio.com`, number `+19802233365`,
  credential-list auth (`handfree_telli`).
- LiveKit stored outbound trunk created: **`ST_BfZBhPxM86JE`** (verify: `lk sip outbound list`).
- `.env.local` holds the LiveKit creds + `LIVEKIT_SIP_TRUNK_ID="ST_BfZBhPxM86JE"`.
  Credentials are baked into the LiveKit trunk, **not** stored in `.env.local`. `.env.local` is gitignored.

> Teammates cloning fresh: get your own `.env.local` with `lk app env --write --destination .env.local`,
> then set `LIVEKIT_SIP_TRUNK_ID="ST_BfZBhPxM86JE"`. The trunk is shared at the project level — no need to recreate it.

---

## End-to-end test status (2026-06-27) — ✅ PASSED

Real call placed to `+4917628950549`:
- ✅ Worker registers (`my-agent`) → trigger creates dispatch → agent joins room
  `incident-inc_demo_003`, logs `Dispatched for incident on service 'checkout-api'`.
- ✅ Outbound SIP call connects: phone participant `phone:+4917628950549` joins, two-way audio
  streams, agent briefs the lead. Caller hung up after ~19s (clean `CLIENT_INITIATED` disconnect).

The full path works: trigger → dispatch → agent → outbound SIP → phone answers → two-way voice.

### Gotcha hit during bring-up: Twilio `403 Forbidden` → auth

The first attempts returned `403 Forbidden` (Twilio error **`32202` — "Authentication failure, bad
user credentials"**). Cause: the SIP credential (username/password) baked into the LiveKit trunk
didn't match the Twilio **Credential List**. Fixed by resetting the Twilio credential and syncing
the trunk in place:

```bash
lk sip outbound update --id ST_BfZBhPxM86JE --auth-user "handfree_telli" --auth-pass "<password>"
```

If you see `403` again, read **Twilio Console → Monitor → Logs → Errors** for the exact code
(`32202` = bad credentials, `13225` = geo permission, trial-account = unverified destination).
Also confirm the Twilio trunk's **Secure Trunking is OFF** (our LiveKit trunk uses `Encryption: DISABLE`).

### Local-run gotcha: SSL certs

On macOS framework Python, the worker and trigger may fail with
`CERTIFICATE_VERIFY_FAILED` connecting to LiveKit Cloud. Point them at certifi's bundle first:

```bash
export SSL_CERT_FILE="$(uv run python -c 'import certifi; print(certifi.where())')"
```

## Run a live test call

```bash
# (first, the SSL_CERT_FILE export above, in each terminal)
# terminal 1 — agent worker
uv run python src/agent.py dev

# terminal 2 — fire the incident call (use a real phone for --to)
uv run python -m outbound_call \
  --to +1XXXXXXXXXX \
  --incident-id inc_123 --service checkout-api --severity critical \
  --brief "Checkout API is returning elevated 500s after the latest deploy." \
  --lead-name Priya
```

Run the tests anytime (no creds needed):

```bash
uv run pytest tests/outbound_call
```

### Integration for the agent (backend / MCP)

```python
from outbound_call import IncidentCall, trigger_incident_call

await trigger_incident_call(IncidentCall(
    lead_phone_number="+15105550123",
    incident_id="inc_123", service="checkout-api", severity="critical",
    brief="Checkout API is returning elevated 500s after the latest deploy.",
    lead_name="Priya",
))
```

---

## TODO / open items

- [x] ~~Decision: LiveKit SIP vs telli MCP~~ → **LiveKit SIP, no telli MCP.**
- [x] ~~Inbound vs outbound~~ → **outbound only**, both channels (WebRTC + phone) agent-initiated. No inbound.
- [x] ~~Update `idea.md`~~ → done, telli MCP references removed.
- [x] ~~Place one real end-to-end call~~ → **PASSED** 2026-06-27: real call to `+4917628950549` connected with two-way voice.
- [ ] **Twilio go-live checks:** number assigned to the trunk, account has calling balance, destination
      country/geo-permissions enabled. First call may fail on these.
- [ ] **Confirm-gate the call.** Per the demo's safety story, an outbound call should require a spoken
      "yes" before dialing. Currently `trigger_incident_call` dials immediately (it's the machine-trigger
      path). If the operator triggers it by voice, add the confirm-gate in the agent.
- [ ] **Wire the trigger to a real/mock monitor** (the "system failure detected" event) instead of the CLI.
- [ ] **Surface call status in the React UI** — show "Calling lead… / Lead joined" as a tool-call card,
      using the `sip.callStatus` participant attribute.
- [ ] **Hang-up / cleanup** — decide when to end the room after the lead call completes.
- [ ] **Agent eval test for the incident brief** (TDD per AGENTS.md) — needs `LIVEKIT_API_KEY` in CI.
- [ ] **Mock fallback** behind the same entrypoint for flaky-venue-wifi (per `idea.md` risk table).

---

## Docs referenced

- Outbound calls: https://docs.livekit.io/telephony/making-calls/outbound-calls/
- Outbound trunk: https://docs.livekit.io/telephony/making-calls/outbound-trunk/
- Make-call recipe: https://docs.livekit.io/reference/recipes/make_call/
- Twilio trunk setup: https://docs.livekit.io/sip/quickstarts/configuring-twilio-trunk/
