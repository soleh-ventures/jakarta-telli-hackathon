# Outbound incident calls (Twilio + LiveKit SIP)

How HandFree places a real automated phone call to the on-call lead when an
incident fires **outside any active agent session**.

## Flow

```
monitor/webhook  ->  trigger_incident_call()
                       1. agent_dispatch.create_dispatch()  -> starts agent in incident-<id> room
                       2. sip.create_sip_participant()       -> dials lead into the same room
                     lead picks up  ->  agent briefs them by voice
```

Code:
- `src/outbound_call/sip.py` — builds/sends the SIP participant request (the phone leg).
- `src/outbound_call/trigger.py` — dispatches the agent + dials the lead (the trigger).
- `src/agent.py` — reads `ctx.job.metadata` and opens the call with an incident brief.

## One-time Twilio setup

1. In the Twilio Console, create an **Elastic SIP Trunk**, add a **Termination SIP URI**
   (`<your-trunk>.pstn.twilio.com`), add **Credential List** auth, and assign your US number.
2. Edit `scripts/outbound-trunk.json`: set `address` (the termination URI) and `numbers`.
3. Create the LiveKit stored outbound trunk:

   ```bash
   export SIP_AUTH_USERNAME=...   # Twilio termination credential username
   export SIP_AUTH_PASSWORD=...   # Twilio termination credential password
   ./scripts/setup_twilio_trunk.sh
   ```

4. Copy the printed `SIPTrunkID` into `.env.local` as `LIVEKIT_SIP_TRUNK_ID`.
   (Alternative: skip the stored trunk and set the inline `SIP_*` vars from `.env.example`.)

## Fire a test call

Start the agent worker (so dispatch has something to start):

```bash
uv run python src/agent.py dev
```

Then, from anywhere, trigger the call:

```bash
uv run python -m outbound_call \
  --to +15105550123 \
  --incident-id inc_123 \
  --service checkout-api \
  --severity critical \
  --brief "Checkout API is returning elevated 500s after the latest deploy." \
  --lead-name Priya
```

## Integrating into a backend/webhook

```python
from outbound_call import IncidentCall, trigger_incident_call

await trigger_incident_call(
    IncidentCall(
        lead_phone_number="+15105550123",
        incident_id="inc_123",
        service="checkout-api",
        severity="critical",
        brief="Checkout API is returning elevated 500s after the latest deploy.",
        lead_name="Priya",
    )
)
```

Docs: https://docs.livekit.io/telephony/making-calls/outbound-calls/ ·
https://docs.livekit.io/reference/recipes/make_call/
