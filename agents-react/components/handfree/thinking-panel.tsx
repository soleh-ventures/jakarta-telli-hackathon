'use client';

import { Sparkles } from 'lucide-react';
import type { AgentState, ToolEvent } from '@/hooks/use-handfree-events';
import { Pulse, T } from './ui';

const STATE_LABEL: Record<string, string> = {
  initializing: 'Starting up…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

/** Live side panel: the agent's current state plus the tools it has run, newest first. */
export function ThinkingPanel({
  agentState,
  tools,
}: {
  agentState: AgentState;
  tools: ToolEvent[];
}) {
  const status = STATE_LABEL[agentState] ?? 'Standing by…';
  const recent = [...tools].reverse().slice(0, 6);
  const busy = agentState === 'thinking' || agentState === 'initializing';

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-[#1f2024] bg-[#0c0d10] p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-[#a5a3f8]" />
        <span className="text-[13px] font-semibold tracking-tight">What HandFree is doing</span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-[#a5a3f8]">
        <Pulse color={T.accent} size={7} />
        <span className={busy ? 'animate-pulse' : undefined}>{status}</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {recent.length === 0 ? (
          <div className="rounded-lg border border-[#1a1b1f] bg-[#121317] px-3 py-2.5 text-[13px] text-[#6a6a73]">
            No actions yet. HandFree acts as you talk.
          </div>
        ) : (
          recent.map((t, i) => (
            <div
              key={`${t.ts}-${i}`}
              className="flex items-start gap-2.5 rounded-lg border border-[#1a1b1f] bg-[#121317] px-3 py-2.5 text-[13px] text-[#bcbcc2]"
              style={{ opacity: i === 0 ? 1 : 0.6 }}
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#6e6bf2]" />
              <span>
                <span className="font-medium text-[#dcdce0]">{t.label}</span>
                {t.finding && t.finding !== 'Done' ? ` — ${t.finding}` : ''}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto rounded-xl border border-[#1f2024] bg-[#121317] p-3.5 text-[12.5px] leading-relaxed text-[#6a6a73]">
        HandFree reasons over your systems continuously and only interrupts you when a human
        decision is genuinely required.
      </div>
    </aside>
  );
}
