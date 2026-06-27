"""Outbound calling feature for HandFree.

On a detected failure, the agent reaches OUT to a human by placing a real outbound
phone call over LiveKit SIP (Twilio trunk). The trigger works outside an active agent
session: it dispatches the agent into a room, then dials the human into that same room.

Public API (import straight from the package):

    from outbound_call import IncidentCall, trigger_incident_call, parse_incident_metadata

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

Layout:
- ``outbound_call.sip``     — builds/sends the SIP participant request (the phone leg).
- ``outbound_call.trigger`` — dispatch + dial orchestration, plus a CLI.

See docs/outbound-calling.md for setup, the Twilio trunk, and a runnable demo.
"""

from outbound_call.sip import (
    OutboundCallConfigError,
    OutboundCallError,
    OutboundCallSettings,
    build_sip_participant_request,
    outbound_call_settings_from_env,
    place_outbound_call,
    place_outbound_call_from_env,
)
from outbound_call.trigger import (
    IncidentCall,
    TriggeredCall,
    incident_room_name,
    parse_incident_metadata,
    trigger_incident_call,
)

__all__ = [
    "IncidentCall",
    "OutboundCallConfigError",
    "OutboundCallError",
    "OutboundCallSettings",
    "TriggeredCall",
    "build_sip_participant_request",
    "incident_room_name",
    "outbound_call_settings_from_env",
    "parse_incident_metadata",
    "place_outbound_call",
    "place_outbound_call_from_env",
    "trigger_incident_call",
]
