"""The agent's place-call tool: resolve the lead's number, then dial them in."""

from types import SimpleNamespace

import agent


def _room(*attrs: dict):
    """Fake room whose remote participants carry the given attribute dicts."""
    parts = {str(i): SimpleNamespace(attributes=a) for i, a in enumerate(attrs)}
    return SimpleNamespace(remote_participants=parts)


def test_number_comes_from_frontend_participant_attribute():
    room = _room({"lead_phone": "+15105550123"})
    assert agent.lead_number_from_room(room, environ={}) == "+15105550123"


def test_number_falls_back_to_env_when_frontend_sends_none():
    room = _room({})  # participant present, no lead_phone set
    assert (
        agent.lead_number_from_room(room, environ={"ONCALL_LEAD_PHONE": "+15105550999"})
        == "+15105550999"
    )


async def test_dial_lead_places_call_with_resolved_number():
    calls = []

    async def fake_place(*, room_name, to_phone_number, **kw):
        calls.append((room_name, to_phone_number))

    msg = await agent.dial_lead("incident-room", "+15105550123", place=fake_place)
    assert calls == [("incident-room", "+15105550123")]
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

    msg = await agent.dial_lead("room", "+15105550123", place=fake_place)
    assert "couldn't" in msg.lower()
