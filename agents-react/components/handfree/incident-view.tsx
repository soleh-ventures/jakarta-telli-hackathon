'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, Check, ChevronRight, Loader2, PhoneCall, X } from 'lucide-react';
import { useDataChannel, useSessionContext } from '@livekit/components-react';
import { useHandFreeEvents } from '@/hooks/use-handfree-events';
import { RECOMMENDATIONS, type Recommendation } from './mock-data';
import { ThinkingPanel } from './thinking-panel';
import type { HandFreeConfig } from './types';
import { Card, SectionLabel, SystemIcon, T } from './ui';
import { VoiceDock } from './voice-dock';

const CONTROL_TOPIC = 'handfree-control';

/**
 * Fires the demo flow: connect the session (so the agent joins), then signal the
 * agent to call the on-call lead and open the incident on that phone call.
 */
function TriggerIncidentButton() {
  const session = useSessionContext();
  const { send } = useDataChannel();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed || !session.isConnected) return;
    void send(new TextEncoder().encode(JSON.stringify({ action: 'trigger_incident' })), {
      topic: CONTROL_TOPIC,
      reliable: true,
    });
    setArmed(false);
  }, [armed, session.isConnected, send]);

  return (
    <button
      onClick={() => {
        if (!session.isConnected) void session.start();
        setArmed(true);
      }}
      disabled={armed}
      className="inline-flex items-center gap-2 rounded-lg bg-[#b3261e] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#9e211a] disabled:opacity-60"
    >
      <PhoneCall className="size-4" />
      {armed ? 'Calling on-call…' : 'Trigger incident'}
    </button>
  );
}

export function IncidentView({ config }: { config: HandFreeConfig }) {
  // Live investigation: each step is a real tool the agent executed (see agent.py
  // attach_event_bus). No timers, no mock data — the pipeline grows as it works.
  const { tools, agentState } = useHandFreeEvents();
  const working = agentState === 'thinking' || agentState === 'initializing';

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 pt-8 pb-40">
          {/* Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-[#4a1d1d] bg-gradient-to-r from-[#1f1011] to-[#141518] p-6">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-40 opacity-30 blur-2xl"
              style={{ background: `radial-gradient(circle, ${T.red}, transparent 70%)` }}
            />
            <div className="relative flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-[#2a1414]">
                <AlertTriangle className="size-6 text-[#f25555]" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[12px] font-bold tracking-widest text-[#f25555] uppercase">
                    Incident detected
                  </span>
                  <span className="rounded-md bg-[#2a1414] px-2 py-0.5 text-[11px] font-semibold text-[#f25555]">
                    Severity High
                  </span>
                </div>
                <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Checkout API</h1>
              </div>
              <div className="flex flex-col items-end gap-2">
                <TriggerIncidentButton />
                <div className="text-[12px] text-[#6a6a73]">{config.githubRepo.split('/')[1]}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[1.25fr_1fr]">
            {/* Investigation pipeline — live */}
            <div>
              <SectionLabel>AI investigation</SectionLabel>
              <div className="space-y-3">
                {tools.length === 0 && !working && (
                  <Card className="p-4 text-[13px] text-[#6a6a73]">
                    Listening for incident activity… ask HandFree what&apos;s failing to begin.
                  </Card>
                )}

                {tools.map((t, i) => (
                  <PipelineStep
                    key={`${t.ts}-${i}`}
                    icon={t.system}
                    label={t.label}
                    finding={t.finding}
                    state={t.status === 'error' ? 'error' : 'done'}
                    connector={i < tools.length - 1 || working}
                  />
                ))}

                {working && (
                  <PipelineStep
                    icon="metrics"
                    label="Analyzing…"
                    finding=""
                    state="active"
                    connector={false}
                  />
                )}
              </div>
            </div>

            {/* Suggested actions — advisory; appears once the investigation is underway */}
            {tools.length > 0 && (
              <div>
                <SectionLabel>Suggested actions</SectionLabel>
                <div className="space-y-3">
                  {RECOMMENDATIONS.map((r) => (
                    <RecommendationCard key={r.label} rec={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ThinkingPanel agentState={agentState} tools={tools} />

      {/* Voice lives in a bottom dock so the investigation stays the focus. */}
      <VoiceDock config={config} />
    </div>
  );
}

function PipelineStep({
  icon,
  label,
  finding,
  state,
  connector,
}: {
  icon: string;
  label: string;
  finding: string;
  state: 'done' | 'active' | 'error';
  connector: boolean;
}) {
  const isActive = state === 'active';
  return (
    <div className="relative">
      <Card className="flex items-start gap-3.5 p-4">
        <span
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full"
          style={{
            backgroundColor:
              state === 'done' ? '#11281a' : state === 'error' ? '#2a1414' : '#16162a',
          }}
        >
          {state === 'done' ? (
            <Check className="size-4 text-[#35c98e]" />
          ) : state === 'error' ? (
            <X className="size-4 text-[#f25555]" />
          ) : (
            <Loader2 className="size-4 animate-spin text-[#a5a3f8]" />
          )}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <SystemIcon id={icon} className="size-4 text-[#9b9ba3]" />
            <span className="text-[14.5px] font-medium">{label}</span>
            <ChevronRight className="ml-auto size-4 text-[#3a3b42]" />
          </div>
          {finding && !isActive && <p className="mt-1.5 text-[13px] text-[#9b9ba3]">{finding}</p>}
          {isActive && <p className="mt-1.5 text-[13px] text-[#6a6a73]">Working…</p>}
        </div>
      </Card>
      {connector && (
        <div className="flex justify-center py-0.5 text-[#2c2d33]">
          <ArrowDown className="size-3.5" />
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Card
      className={
        rec.primary
          ? 'border-[#37356f] bg-[#16162a] p-4'
          : 'p-4 transition-colors hover:border-[#2c2d33]'
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{rec.label}</span>
        <span
          className="text-[15px] font-semibold tabular-nums"
          style={{ color: rec.primary ? T.accentSoft : T.textDim }}
        >
          {rec.confidence}%
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#23242b]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${rec.confidence}%`,
            background: rec.primary ? `linear-gradient(90deg, ${T.accent}, #9d6bf2)` : '#3a3b42',
          }}
        />
      </div>
      {rec.primary && (
        <button className="mt-3.5 w-full rounded-lg bg-[#6e6bf2] py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#5d5ae6]">
          Approve &amp; execute
        </button>
      )}
    </Card>
  );
}
