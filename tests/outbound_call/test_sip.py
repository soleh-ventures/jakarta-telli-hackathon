import pytest

from outbound_call.sip import (
    OutboundCallConfigError,
    OutboundCallSettings,
    build_sip_participant_request,
    outbound_call_settings_from_env,
    place_outbound_call,
)


def test_builds_request_with_stored_trunk_id() -> None:
    request = build_sip_participant_request(
        OutboundCallSettings(
            room_name="incident-room",
            to_phone_number="+15105550123",
            trunk_id="ST_abc123",
            participant_identity="oncall-lead",
            participant_name="Priya",
        )
    )

    assert request.sip_trunk_id == "ST_abc123"
    assert request.sip_call_to == "+15105550123"
    assert request.room_name == "incident-room"
    assert request.participant_identity == "oncall-lead"
    assert request.participant_name == "Priya"
    assert request.wait_until_answered is True
    assert request.krisp_enabled is True


def test_builds_request_with_inline_twilio_trunk_config() -> None:
    request = build_sip_participant_request(
        OutboundCallSettings(
            room_name="incident-room",
            to_phone_number="+15105550123",
            from_phone_number="+14155550100",
            trunk_hostname="handfree.pstn.twilio.com",
            trunk_auth_username="twilio-user",
            trunk_auth_password="twilio-pass",
            participant_identity="oncall-lead",
        )
    )

    assert request.trunk.hostname == "handfree.pstn.twilio.com"
    assert request.trunk.destination_country == "US"
    assert request.trunk.auth_username == "twilio-user"
    assert request.trunk.auth_password == "twilio-pass"
    assert request.sip_number == "+14155550100"
    assert request.sip_call_to == "+15105550123"


def test_env_prefers_stored_trunk_id_over_inline_config() -> None:
    settings = outbound_call_settings_from_env(
        room_name="incident-room",
        to_phone_number="+15105550123",
        environ={
            "SIP_TRUNK_ID": "ST_abc123",
            "SIP_TRUNK_HOSTNAME": "handfree.pstn.twilio.com",
            "SIP_AUTH_USERNAME": "twilio-user",
            "SIP_AUTH_PASSWORD": "twilio-pass",
            "SIP_FROM_NUMBER": "+14155550100",
        },
    )

    request = build_sip_participant_request(settings)

    assert request.sip_trunk_id == "ST_abc123"
    assert not request.HasField("trunk")


def test_missing_trunk_config_raises_clear_error() -> None:
    with pytest.raises(OutboundCallConfigError, match="Outbound calls need"):
        build_sip_participant_request(
            OutboundCallSettings(
                room_name="incident-room",
                to_phone_number="+15105550123",
            )
        )


def test_rejects_non_e164_phone_number() -> None:
    with pytest.raises(OutboundCallConfigError, match=r"E\.164"):
        build_sip_participant_request(
            OutboundCallSettings(
                room_name="incident-room",
                to_phone_number="5105550123",
                trunk_id="ST_abc123",
            )
        )


@pytest.mark.asyncio
async def test_place_outbound_call_uses_livekit_sip_client() -> None:
    class FakeSipClient:
        def __init__(self) -> None:
            self.request = None

        async def create_sip_participant(self, request):
            self.request = request
            return {"ok": True}

    class FakeLiveKitAPI:
        def __init__(self) -> None:
            self.sip = FakeSipClient()

    fake_api = FakeLiveKitAPI()

    result = await place_outbound_call(
        fake_api,
        OutboundCallSettings(
            room_name="incident-room",
            to_phone_number="+15105550123",
            trunk_id="ST_abc123",
        ),
    )

    assert result == {"ok": True}
    assert fake_api.sip.request.sip_trunk_id == "ST_abc123"
