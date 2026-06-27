from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

from livekit import api
from livekit.protocol.sip import CreateSIPParticipantRequest, SIPOutboundConfig


class OutboundCallConfigError(ValueError):
    """Raised when outbound SIP call configuration is incomplete."""


class OutboundCallError(RuntimeError):
    """Raised when LiveKit rejects or cannot complete the outbound call."""

    def __init__(
        self,
        message: str,
        *,
        sip_status_code: str | None = None,
        sip_status: str | None = None,
    ) -> None:
        super().__init__(message)
        self.sip_status_code = sip_status_code
        self.sip_status = sip_status


@dataclass(frozen=True)
class OutboundCallSettings:
    """Configuration for calling a phone number into a LiveKit room.

    LiveKit outbound calls need either:
    - a stored LiveKit SIP outbound trunk ID, or
    - inline SIP trunk details such as a Twilio Elastic SIP Trunk hostname.
    """

    room_name: str
    to_phone_number: str
    trunk_id: str | None = None
    from_phone_number: str | None = None
    trunk_hostname: str | None = None
    trunk_auth_username: str | None = None
    trunk_auth_password: str | None = None
    destination_country: str = "US"
    participant_identity: str | None = None
    participant_name: str = "On-call lead"
    wait_until_answered: bool = True
    krisp_enabled: bool = True
    play_dialtone: bool = False
    display_name: str | None = None
    dtmf: str | None = None


def outbound_call_settings_from_env(
    *,
    room_name: str,
    to_phone_number: str,
    environ: Mapping[str, str] | None = None,
    participant_identity: str | None = None,
    participant_name: str = "On-call lead",
    wait_until_answered: bool = True,
    krisp_enabled: bool = True,
    play_dialtone: bool = False,
) -> OutboundCallSettings:
    """Build outbound call settings from environment variables.

    Supported environment variables:
    - LIVEKIT_SIP_TRUNK_ID or SIP_TRUNK_ID for a stored LiveKit outbound trunk.
    - SIP_TRUNK_HOSTNAME or TWILIO_SIP_TRUNK_HOSTNAME for inline trunk config.
    - SIP_AUTH_USERNAME and SIP_AUTH_PASSWORD for inline trunk auth.
    - SIP_FROM_NUMBER or TWILIO_FROM_NUMBER for the Twilio caller ID number.
    - SIP_DESTINATION_COUNTRY, defaults to US.
    """

    # Note: `environ or os.environ` would wrongly fall back on an empty dict
    # (an empty mapping is falsy), so an explicit None check is required.
    env = environ if environ is not None else os.environ

    return OutboundCallSettings(
        room_name=room_name,
        to_phone_number=to_phone_number,
        trunk_id=_first_env(env, "LIVEKIT_SIP_TRUNK_ID", "SIP_TRUNK_ID"),
        from_phone_number=_first_env(env, "SIP_FROM_NUMBER", "TWILIO_FROM_NUMBER"),
        trunk_hostname=_first_env(
            env, "SIP_TRUNK_HOSTNAME", "TWILIO_SIP_TRUNK_HOSTNAME"
        ),
        trunk_auth_username=env.get("SIP_AUTH_USERNAME"),
        trunk_auth_password=env.get("SIP_AUTH_PASSWORD"),
        destination_country=env.get("SIP_DESTINATION_COUNTRY", "US"),
        participant_identity=participant_identity,
        participant_name=participant_name,
        wait_until_answered=wait_until_answered,
        krisp_enabled=krisp_enabled,
        play_dialtone=play_dialtone,
    )


def build_sip_participant_request(
    settings: OutboundCallSettings,
) -> CreateSIPParticipantRequest:
    """Create the LiveKit SIP participant request for an outbound call."""

    _validate_phone_number(settings.to_phone_number, field_name="to_phone_number")
    if settings.from_phone_number:
        _validate_phone_number(
            settings.from_phone_number, field_name="from_phone_number"
        )
    if not settings.room_name.strip():
        raise OutboundCallConfigError("room_name is required")

    participant_identity = (
        settings.participant_identity or f"phone:{settings.to_phone_number}"
    )
    base_kwargs = {
        "sip_call_to": settings.to_phone_number,
        "room_name": settings.room_name,
        "participant_identity": participant_identity,
        "participant_name": settings.participant_name,
        "wait_until_answered": settings.wait_until_answered,
        "krisp_enabled": settings.krisp_enabled,
        "play_dialtone": settings.play_dialtone,
    }

    if settings.display_name is not None:
        base_kwargs["display_name"] = settings.display_name
    if settings.dtmf is not None:
        base_kwargs["dtmf"] = settings.dtmf

    if settings.trunk_id:
        return CreateSIPParticipantRequest(
            sip_trunk_id=settings.trunk_id,
            **base_kwargs,
        )

    inline_trunk_missing = [
        name
        for name, value in {
            "trunk_hostname": settings.trunk_hostname,
            "trunk_auth_username": settings.trunk_auth_username,
            "trunk_auth_password": settings.trunk_auth_password,
            "from_phone_number": settings.from_phone_number,
        }.items()
        if not value
    ]
    if inline_trunk_missing:
        missing = ", ".join(inline_trunk_missing)
        raise OutboundCallConfigError(
            "Outbound calls need LIVEKIT_SIP_TRUNK_ID/SIP_TRUNK_ID or complete "
            f"inline SIP trunk config. Missing: {missing}"
        )

    return CreateSIPParticipantRequest(
        trunk=SIPOutboundConfig(
            hostname=settings.trunk_hostname,
            destination_country=settings.destination_country,
            auth_username=settings.trunk_auth_username,
            auth_password=settings.trunk_auth_password,
        ),
        sip_number=settings.from_phone_number,
        **base_kwargs,
    )


async def place_outbound_call(
    livekit_api: api.LiveKitAPI,
    settings: OutboundCallSettings,
):
    """Dial a phone number into a LiveKit room using the provided API client."""

    request = build_sip_participant_request(settings)
    try:
        return await livekit_api.sip.create_sip_participant(request)
    except api.TwirpError as exc:
        sip_status_code = exc.metadata.get("sip_status_code")
        sip_status = exc.metadata.get("sip_status")
        raise OutboundCallError(
            f"Outbound call failed: {exc.message}",
            sip_status_code=sip_status_code,
            sip_status=sip_status,
        ) from exc


async def place_outbound_call_from_env(
    *,
    room_name: str,
    to_phone_number: str,
    livekit_api: api.LiveKitAPI | None = None,
    environ: Mapping[str, str] | None = None,
    participant_name: str = "On-call lead",
):
    """Convenience helper for tools or scripts that should read config from env."""

    settings = outbound_call_settings_from_env(
        room_name=room_name,
        to_phone_number=to_phone_number,
        environ=environ,
        participant_name=participant_name,
    )

    if livekit_api is not None:
        return await place_outbound_call(livekit_api, settings)

    owned_api = api.LiveKitAPI()
    try:
        return await place_outbound_call(owned_api, settings)
    finally:
        await owned_api.aclose()


def _first_env(env: Mapping[str, str], *names: str) -> str | None:
    for name in names:
        value = env.get(name)
        if value:
            return value
    return None


def _validate_phone_number(value: str, *, field_name: str) -> None:
    if not value or not value.startswith("+") or not value[1:].isdigit():
        raise OutboundCallConfigError(
            f"{field_name} must be an E.164 phone number, for example +15105550123"
        )
