"""The agent's onboarding + place-call wiring: read frontend attributes, dial the lead."""

from types import SimpleNamespace

import agent


def _room(*attrs: dict):
    """Fake room whose remote participants carry the given attribute dicts."""
    parts = {str(i): SimpleNamespace(attributes=a) for i, a in enumerate(attrs)}
    return SimpleNamespace(remote_participants=parts)


# --- phone normalization ---------------------------------------------------


def test_e164_strips_display_formatting():
    assert agent.to_e164("+1 555 010 1234") == "+15550101234"


def test_e164_rejects_empty_or_garbage():
    assert agent.to_e164("") is None
    assert agent.to_e164(None) is None
    assert agent.to_e164("123") is None  # too short


# --- onboarding from frontend attributes -----------------------------------


def test_onboarding_read_from_participant_attributes():
    room = _room(
        {
            "primary_name": "Alex",
            "primary_phone": "+1 555 010 1234",
            "github_repo": "soleh-ventures/jakarta-telli-hackathon",
        }
    )
    cfg = agent.read_onboarding(room)
    assert cfg.primary_name == "Alex"
    assert cfg.primary_phone == "+15550101234"  # normalized
    assert cfg.github_repo == "soleh-ventures/jakarta-telli-hackathon"


def test_lead_number_prefers_primary_then_backup_then_env():
    primary = _room(
        {"primary_phone": "+1 555 010 1234", "backup_phone": "+1 999 999 9999"}
    )
    assert agent.lead_number_from_room(primary, environ={}) == "+15550101234"

    backup_only = _room({"backup_phone": "+1 999 999 9999"})
    assert agent.lead_number_from_room(backup_only, environ={}) == "+19999999999"

    none_set = _room({})
    assert (
        agent.lead_number_from_room(
            none_set, environ={"ONCALL_LEAD_PHONE": "+15105550000"}
        )
        == "+15105550000"
    )


# --- dialing ---------------------------------------------------------------


async def test_dial_lead_places_call_with_resolved_number():
    calls = []

    async def fake_place(*, room_name, to_phone_number, **kw):
        calls.append((room_name, to_phone_number))

    msg = await agent.dial_lead("incident-room", "+15550101234", place=fake_place)
    assert calls == [("incident-room", "+15550101234")]
    assert "lead" in msg.lower()


async def test_no_number_does_not_call():
    called = False

    async def fake_place(**kw):
        nonlocal called
        called = True

    msg = await agent.dial_lead("room", None, place=fake_place)
    assert called is False
    assert "number" in msg.lower()


async def test_call_failure_is_reported_not_raised():
    async def fake_place(**kw):
        raise RuntimeError("sip trunk down")

    msg = await agent.dial_lead("room", "+15550101234", place=fake_place)
    assert "couldn't" in msg.lower()
