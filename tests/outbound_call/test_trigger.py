import json

import pytest

from outbound_call import (
    IncidentCall,
    OutboundCallConfigError,
    incident_room_name,
    parse_incident_metadata,
    trigger_incident_call,
)

TRUNK_ENV = {"LIVEKIT_SIP_TRUNK_ID": "ST_abc123"}

INLINE_ENV = {
    "SIP_TRUNK_HOSTNAME": "handfree.pstn.twilio.com",
    "SIP_AUTH_USERNAME": "twilio-user",
    "SIP_AUTH_PASSWORD": "twilio-pass",
    "SIP_FROM_NUMBER": "+14155550100",
}


class FakeAgentDispatch:
    def __init__(self) -> None:
        self.request = None

    async def create_dispatch(self, request):
        self.request = request
        return {"dispatch_id": "AD_fake"}


class FakeSipClient:
    def __init__(self) -> None:
        self.request = None

    async def create_sip_participant(self, request):
        self.request = request
        return {"participant": "ok"}


class FakeLiveKitAPI:
    def __init__(self) -> None:
        self.agent_dispatch = FakeAgentDispatch()
        self.sip = FakeSipClient()


def _incident() -> IncidentCall:
    return IncidentCall(
        lead_phone_number="+15105550123",
        incident_id="inc_123",
        service="checkout-api",
        severity="critical",
        brief="Checkout API is returning elevated 500s after the latest deploy.",
        lead_name="Priya",
    )


def test_room_name_derives_from_incident_id() -> None:
    assert incident_room_name(_incident()) == "incident-inc_123"


def test_room_name_falls_back_to_random_suffix_without_id() -> None:
    incident = IncidentCall(lead_phone_number="+15105550123")
    name = incident_room_name(incident)
    assert name.startswith("incident-")
    assert name != "incident-"


def test_metadata_round_trips_incident_fields() -> None:
    incident = _incident()
    parsed = parse_incident_metadata(incident.to_json())
    assert parsed == incident


def test_parse_incident_metadata_handles_empty() -> None:
    assert parse_incident_metadata(None) is None
    assert parse_incident_metadata("") is None


@pytest.mark.asyncio
async def test_trigger_dispatches_agent_then_dials_into_same_room() -> None:
    fake_api = FakeLiveKitAPI()
    incident = _incident()

    result = await trigger_incident_call(
        incident,
        livekit_api=fake_api,
        environ=TRUNK_ENV,
        agent_name="my-agent",
    )

    dispatch_req = fake_api.agent_dispatch.request
    sip_req = fake_api.sip.request

    # The agent is dispatched into a fresh room with the incident metadata.
    assert dispatch_req.agent_name == "my-agent"
    assert dispatch_req.room == "incident-inc_123"
    assert parse_incident_metadata(dispatch_req.metadata) == incident

    # The phone call dials the lead into that same room.
    assert sip_req.room_name == "incident-inc_123"
    assert sip_req.sip_call_to == "+15105550123"
    assert sip_req.sip_trunk_id == "ST_abc123"
    assert sip_req.participant_name == "Priya"

    assert result.room_name == "incident-inc_123"
    assert result.agent_name == "my-agent"
    assert result.dispatch == {"dispatch_id": "AD_fake"}
    assert result.participant == {"participant": "ok"}


@pytest.mark.asyncio
async def test_trigger_works_with_inline_twilio_trunk() -> None:
    fake_api = FakeLiveKitAPI()

    await trigger_incident_call(
        _incident(),
        livekit_api=fake_api,
        environ=INLINE_ENV,
    )

    sip_req = fake_api.sip.request
    assert sip_req.trunk.hostname == "handfree.pstn.twilio.com"
    assert sip_req.sip_number == "+14155550100"


@pytest.mark.asyncio
async def test_trigger_validates_config_before_dispatching() -> None:
    fake_api = FakeLiveKitAPI()

    with pytest.raises(OutboundCallConfigError):
        await trigger_incident_call(
            _incident(),
            livekit_api=fake_api,
            environ={},  # no trunk config at all
        )

    # No agent should be dispatched if the call can never be placed.
    assert fake_api.agent_dispatch.request is None
    assert fake_api.sip.request is None


@pytest.mark.asyncio
async def test_trigger_defaults_agent_name_from_env() -> None:
    fake_api = FakeLiveKitAPI()

    await trigger_incident_call(
        _incident(),
        livekit_api=fake_api,
        environ={**TRUNK_ENV, "LIVEKIT_AGENT_NAME": "handfree"},
    )

    assert fake_api.agent_dispatch.request.agent_name == "handfree"


def test_metadata_is_valid_json_with_expected_keys() -> None:
    data = json.loads(_incident().to_json())
    assert data["lead_phone_number"] == "+15105550123"
    assert data["incident_id"] == "inc_123"
    assert data["service"] == "checkout-api"
    assert data["brief"].startswith("Checkout API")
