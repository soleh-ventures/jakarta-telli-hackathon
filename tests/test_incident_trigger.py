"""The UI 'Trigger incident' flow: dial the lead, then open the incident by voice."""

from types import SimpleNamespace

import agent


def _ctx_with_lead(phone: str | None):
    parts = {}
    if phone is not None:
        parts["u"] = SimpleNamespace(attributes={"primary_phone": phone})
    room = SimpleNamespace(
        name="incident-room",
        remote_participants=parts,
        on=lambda *a, **k: None,  # handler registration not under test here
    )
    return SimpleNamespace(room=room)


async def test_trigger_dials_lead_then_opens_incident():
    dialed, replies = [], []

    async def fake_place(*, room_name, to_phone_number):
        dialed.append((room_name, to_phone_number))

    async def fake_reply(*, instructions):
        replies.append(instructions)

    session = SimpleNamespace(generate_reply=fake_reply)
    run = agent.attach_incident_trigger(
        session, _ctx_with_lead("+1 555 010 1234"), place=fake_place
    )

    await run()
    assert dialed == [("incident-room", "+15550101234")]  # normalized
    assert replies and "Checkout" in replies[0]

    # second fire is a no-op (one incident per session)
    await run()
    assert len(dialed) == 1


async def test_trigger_still_opens_when_no_number():
    replies = []

    async def fake_place(**kw):
        raise AssertionError("should not dial without a number")

    async def fake_reply(*, instructions):
        replies.append(instructions)

    session = SimpleNamespace(generate_reply=fake_reply)
    run = agent.attach_incident_trigger(session, _ctx_with_lead(None), place=fake_place)

    await run()
    assert replies  # still briefs even if it couldn't dial
