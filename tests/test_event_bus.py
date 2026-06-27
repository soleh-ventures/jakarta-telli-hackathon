"""tool_event() maps executed tool calls to dashboard timeline entries."""

import agent


def test_maps_known_tools_to_system_and_label():
    assert agent.tool_event("get_incidents", "Checkout API down")["system"] == "datadog"
    assert agent.tool_event("list_commits", "PR #2")["system"] == "github"
    assert agent.tool_event("rollback", "{}")["label"] == "Deploy Rollback"
    assert agent.tool_event("post", "ok")["system"] == "slack"
    assert agent.tool_event("call_on_call_lead", "dialing")["system"] == "telli"


def test_unknown_tool_falls_back():
    ev = agent.tool_event("mystery_tool", "x")
    assert ev["system"] == "logs"
    assert ev["label"] == "mystery_tool"


def test_finding_is_collapsed_and_truncated():
    ev = agent.tool_event("get_incidents", "  line one\n  line two  ")
    assert ev["finding"] == "line one line two"
    assert len(agent.tool_event("x", "y" * 500)["finding"]) <= 140


def test_none_output_is_error_status():
    ev = agent.tool_event("rollback", None, status="error")
    assert ev["status"] == "error"
    assert ev["finding"] == "Done"  # empty output -> placeholder, not crash
