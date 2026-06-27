'use client';

import { useState } from 'react';
import { useDataChannel } from '@livekit/components-react';

/** A tool the agent executed, shaped for the investigation timeline (see agent.py tool_event). */
export type ToolEvent = {
  kind: 'tool';
  system: string; // SystemIcon id: datadog | github | slack | telli | metrics | logs ...
  label: string;
  finding: string;
  status: 'done' | 'error';
  ts: number;
};

export type AgentState = 'initializing' | 'listening' | 'thinking' | 'speaking' | string;

/**
 * Subscribes to the agent's "handfree" data topic and accumulates live events:
 * the tool calls it makes and its current state. Replaces mock-data.ts on the
 * incident screen.
 */
export function useHandFreeEvents() {
  const [tools, setTools] = useState<ToolEvent[]>([]);
  const [agentState, setAgentState] = useState<AgentState>('initializing');

  useDataChannel('handfree', (msg) => {
    try {
      const ev = JSON.parse(new TextDecoder().decode(msg.payload));
      if (ev.kind === 'tool') setTools((prev) => [...prev, ev as ToolEvent]);
      else if (ev.kind === 'state') setAgentState(ev.state as AgentState);
    } catch {
      // ignore malformed payloads
    }
  });

  return { tools, agentState };
}
