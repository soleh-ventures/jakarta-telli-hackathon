"""Trigger an automated outbound call when an incident fires outside an agent session.

The DevOps use case is machine-driven: a monitor detects a failure and HandFree must
call the responsible lead. There is no live agent session at trigger time, so this
module does the two things the LiveKit recipe requires, in order:

1. Dispatch the voice agent into a fresh room (carrying the incident as metadata).
2. Dial the lead's phone into that same room over an outbound SIP trunk.

The SIP details (trunk id or inline Twilio config) are reused from ``outbound_call.sip``.

Example (e.g. from a webhook handler)::

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

See https://docs.livekit.io/telephony/making-calls/outbound-calls/
and https://docs.livekit.io/reference/recipes/make_call/
"""

from __future__ import annotations

import argparse
import json
import os
import uuid
from collections.abc import Mapping
from dataclasses import asdict, dataclass

from livekit import api

from outbound_call.sip import (
    build_sip_participant_request,
    outbound_call_settings_from_env,
    place_outbound_call,
)

DEFAULT_AGENT_NAME = "my-agent"


@dataclass(frozen=True)
class IncidentCall:
    """An incident that should trigger an automated outbound call to a lead."""

    lead_phone_number: str
    incident_id: str | None = None
    service: str | None = None
    severity: str = "critical"
    brief: str = ""
    lead_name: str = "On-call lead"

    def to_json(self) -> str:
        """Serialize the incident for the agent dispatch metadata field."""
        return json.dumps(asdict(self))


@dataclass(frozen=True)
class TriggeredCall:
    """Result of dispatching the agent and dialing the lead."""

    room_name: str
    agent_name: str
    dispatch: object
    participant: object


def parse_incident_metadata(raw: str | None) -> IncidentCall | None:
    """Reconstruct an ``IncidentCall`` from agent dispatch metadata.

    The agent job reads ``ctx.job.metadata`` and passes it here to learn which
    lead to brief and why. Returns ``None`` when there is no metadata.
    """
    if not raw:
        return None
    data = json.loads(raw)
    fields = set(IncidentCall.__dataclass_fields__)
    return IncidentCall(**{k: v for k, v in data.items() if k in fields})


def incident_room_name(incident: IncidentCall, *, prefix: str = "incident") -> str:
    """Build a room name for the incident, stable when an incident id is present."""
    suffix = incident.incident_id or uuid.uuid4().hex[:8]
    return f"{prefix}-{suffix}"


async def trigger_incident_call(
    incident: IncidentCall,
    *,
    livekit_api: api.LiveKitAPI | None = None,
    environ: Mapping[str, str] | None = None,
    agent_name: str | None = None,
    room_name: str | None = None,
) -> TriggeredCall:
    """Dispatch the agent and dial the lead for an incident.

    Reads SIP trunk config from the environment (see ``outbound_call``). The SIP
    request is built and validated *before* any agent is dispatched, so a broken
    trunk config never leaves a stray agent running in an empty room.
    """
    env = environ if environ is not None else os.environ
    agent_name = agent_name or env.get("LIVEKIT_AGENT_NAME", DEFAULT_AGENT_NAME)
    room_name = room_name or incident_room_name(incident)

    settings = outbound_call_settings_from_env(
        room_name=room_name,
        to_phone_number=incident.lead_phone_number,
        environ=env,
        participant_name=incident.lead_name,
    )
    # Fail fast on bad trunk/phone config before dispatching an agent.
    build_sip_participant_request(settings)

    if livekit_api is not None:
        return await _dispatch_and_dial(
            livekit_api, agent_name, room_name, incident, settings
        )

    owned_api = api.LiveKitAPI()
    try:
        return await _dispatch_and_dial(
            owned_api, agent_name, room_name, incident, settings
        )
    finally:
        await owned_api.aclose()


async def _dispatch_and_dial(
    livekit_api: api.LiveKitAPI,
    agent_name: str,
    room_name: str,
    incident: IncidentCall,
    settings,
) -> TriggeredCall:
    dispatch = await livekit_api.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
            agent_name=agent_name,
            room=room_name,
            metadata=incident.to_json(),
        )
    )
    participant = await place_outbound_call(livekit_api, settings)
    return TriggeredCall(
        room_name=room_name,
        agent_name=agent_name,
        dispatch=dispatch,
        participant=participant,
    )


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Trigger an automated outbound incident call: dispatch the HandFree "
            "agent into a room and dial the on-call lead over an outbound SIP trunk."
        )
    )
    parser.add_argument(
        "--to",
        required=True,
        dest="lead_phone_number",
        help="Lead phone number in E.164 format, e.g. +15105550123",
    )
    parser.add_argument("--incident-id", default=None, help="Stable incident id")
    parser.add_argument("--service", default=None, help="Affected service name")
    parser.add_argument("--severity", default="critical", help="Incident severity")
    parser.add_argument("--brief", default="", help="What to brief the lead on")
    parser.add_argument(
        "--lead-name", default="On-call lead", help="Display name for the lead"
    )
    parser.add_argument(
        "--agent-name",
        default=None,
        help="Agent to dispatch (defaults to LIVEKIT_AGENT_NAME or 'my-agent')",
    )
    parser.add_argument(
        "--room", default=None, help="Room name (defaults to incident-<id>)"
    )
    return parser


async def _main_async(args) -> None:
    incident = IncidentCall(
        lead_phone_number=args.lead_phone_number,
        incident_id=args.incident_id,
        service=args.service,
        severity=args.severity,
        brief=args.brief,
        lead_name=args.lead_name,
    )
    result = await trigger_incident_call(
        incident, agent_name=args.agent_name, room_name=args.room
    )
    print(
        f"Dispatched '{result.agent_name}' into room '{result.room_name}' "
        f"and dialed {incident.lead_phone_number}."
    )


def main() -> None:
    """CLI entrypoint: ``uv run python -m outbound_call.trigger --to +1...``."""
    import asyncio

    from dotenv import load_dotenv

    load_dotenv(".env.local")
    args = _build_arg_parser().parse_args()
    asyncio.run(_main_async(args))


if __name__ == "__main__":
    main()
