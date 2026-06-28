'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowDown, Check, ChevronRight, Copy, Loader2, X } from 'lucide-react';
import { useSessionContext, useSessionMessages } from '@livekit/components-react';
import { type AgentState, type ToolEvent, useHandFreeEvents } from '@/hooks/use-handfree-events';
import type { HandFreeConfig, IncidentRecord, TranscriptTurn } from './types';
import { Card, Pulse, SectionLabel, SystemIcon, T } from './ui';

// The real systems HandFree acts through (shown on the standby screen).
const INTEGRATIONS = [
  { id: 'github', name: 'GitHub' },
  { id: 'datadog', name: 'Monitoring' },
  { id: 'slack', name: 'Slack' },
  { id: 'telli', name: 'Telephony' },
];

/**
 * The whole product surface: one adaptive console. Before the agent is doing
 * anything it shows a calm standby/paging state; once it's on the call and
 * working, it switches to the live incident view. No tabs, no trigger button —
 * opening the console pages the lead (see AutoStartIncident in handfree-app).
 */
export function IncidentConsole({ config }: { config: HandFreeConfig }) {
  const { tools, agentState } = useHandFreeEvents();
  const live = tools.length > 0 || agentState === 'speaking';
  return live ? (
    <ActiveIncident config={config} tools={tools} agentState={agentState} />
  ) : (
    <Standby config={config} />
  );
}

function repoName(config: HandFreeConfig) {
  return config.githubRepo.split('/')[1] || 'your service';
}

function Standby({ config }: { config: HandFreeConfig }) {
  const lead = config.primaryName || 'the on-call lead';
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <Pulse color={T.accent} size={12} />
      <h1 className="mt-5 text-[22px] font-semibold tracking-tight">Paging {lead}…</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#5b5b66]">
        HandFree picked up an incident on {repoName(config)} and is calling the on-call lead. The
        live investigation appears here as it works.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        {INTEGRATIONS.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e6ea] bg-white px-3 py-1.5 text-[12.5px] text-[#5b5b66]"
          >
            <SystemIcon id={s.id} className="size-3.5" /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActiveIncident({
  config,
  tools,
  agentState,
}: {
  config: HandFreeConfig;
  tools: ToolEvent[];
  agentState: AgentState;
}) {
  const working = agentState === 'thinking';
  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-6 pt-7 pb-10">
      {/* Incident banner — calm, one line of identity */}
      <div className="flex items-center gap-3.5 rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-[#fde7e7]">
          <AlertTriangle className="size-5 text-[#f25555]" />
        </span>
        <div>
          <span className="text-[11px] font-bold tracking-widest text-[#f25555] uppercase">
            Incident · Critical
          </span>
          <h1 className="text-[19px] font-semibold tracking-tight">Checkout API</h1>
        </div>
        <span className="ml-auto text-[12.5px] text-[#82828d]">{repoName(config)}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Live investigation — each step is a real tool the agent ran */}
        <section>
          <SectionLabel>Investigation</SectionLabel>
          <div className="space-y-2.5">
            {tools.length === 0 && (
              <Card className="p-4 text-[13px] text-[#82828d]">Briefing the lead…</Card>
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
              <PipelineStep icon="metrics" label="Analyzing…" finding="" state="active" connector={false} />
            )}
          </div>
        </section>

        {/* Actions + the live call transcript */}
        <aside className="space-y-6">
          <section>
            <SectionLabel>Actions</SectionLabel>
            <div className="space-y-2.5">
              {deriveActions(tools).map((a) => (
                <ActionCard key={a.label} action={a} />
              ))}
            </div>
          </section>
          <section>
            <SectionLabel>Live call</SectionLabel>
            <Transcript leadName={config.primaryName} />
          </section>
        </aside>
      </div>
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
            backgroundColor: state === 'done' ? '#e6f6ee' : state === 'error' ? '#fde7e7' : '#eeeefb',
          }}
        >
          {state === 'done' ? (
            <Check className="size-4 text-[#35c98e]" />
          ) : state === 'error' ? (
            <X className="size-4 text-[#f25555]" />
          ) : (
            <Loader2 className="size-4 animate-spin text-[#6e6bf2]" />
          )}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <SystemIcon id={icon} className="size-4 text-[#5b5b66]" />
            <span className="text-[14.5px] font-medium">{label}</span>
            <ChevronRight className="ml-auto size-4 text-[#b8b8c0]" />
          </div>
          {finding && !isActive && <p className="mt-1.5 text-[13px] text-[#5b5b66]">{finding}</p>}
          {isActive && <p className="mt-1.5 text-[13px] text-[#82828d]">Working…</p>}
        </div>
      </Card>
      {connector && (
        <div className="flex justify-center py-0.5 text-[#d8d8df]">
          <ArrowDown className="size-3.5" />
        </div>
      )}
    </div>
  );
}

type ActionItem = { label: string; done: boolean; primary?: boolean };

/** Derive the actions panel from the agent's live tool events — what HandFree has
 *  already done (rollback / Slack / call) and what it recommends next. No mock data. */
function deriveActions(tools: { system: string; label: string }[]): ActionItem[] {
  const rolledBack = tools.some((t) => /rollback|deploy/i.test(t.label));
  const posted = tools.some((t) => t.system === 'slack');
  const called = tools.some((t) => t.system === 'telli');
  return [
    {
      label: rolledBack ? 'Suspect deploy rolled back' : 'Roll back the suspect deploy',
      done: rolledBack,
      primary: !rolledBack,
    },
    { label: posted ? 'Incident posted to #incidents' : 'Notify the team on Slack', done: posted },
    { label: called ? 'On-call lead called' : 'Call the on-call lead', done: called },
  ];
}

function ActionCard({ action }: { action: ActionItem }) {
  const highlight = action.primary && !action.done;
  return (
    <Card className={highlight ? 'border-[#c9c8f2] bg-[#eeeefb] p-4' : 'p-4'}>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium">{action.label}</span>
        {action.done ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#35c98e]">
            <Check className="size-4" /> Done
          </span>
        ) : highlight ? (
          <span className="rounded-md bg-[#e7e7fb] px-2 py-0.5 text-[11px] font-semibold text-[#6e6bf2]">
            Recommended
          </span>
        ) : (
          <span className="text-[12px] text-[#82828d]">Suggested</span>
        )}
      </div>
    </Card>
  );
}

/** The live call transcript. The lead is the SIP participant (identity phone:<num>);
 *  everyone else in the room is HandFree. */
function Transcript({ leadName }: { leadName?: string }) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);

  if (!messages.length) {
    return <Card className="p-4 text-[13px] text-[#82828d]">Connecting the call…</Card>;
  }
  return (
    <Card className="max-h-[44vh] space-y-2.5 overflow-y-auto p-4">
      {messages.map((m, i) => {
        const isLead = (m.from?.identity || '').startsWith('phone:');
        return (
          <div key={i} className={isLead ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                isLead
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#6e6bf2] px-3 py-1.5 text-[13.5px] text-white'
                  : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f1f1f4] px-3 py-1.5 text-[13.5px] text-[#24242b]'
              }
            >
              <span
                className={
                  isLead
                    ? 'mb-0.5 block text-[10px] font-semibold tracking-wide text-white/80 uppercase'
                    : 'mb-0.5 block text-[10px] font-semibold tracking-wide text-[#6e6bf2] uppercase'
                }
              >
                {isLead ? leadName || 'On-call lead' : 'HandFree'}
              </span>
              {m.message}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/** Read-only view of a past incident, reconstructed from a stored record. */
export function IncidentDetail({ record }: { record: IncidentRecord }) {
  const when = new Date(record.startedAt).toLocaleString();
  const resolved = record.status === 'resolved';
  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-6 pt-7 pb-10">
      <div
        className={`flex items-center gap-3.5 rounded-2xl border px-5 py-4 ${
          resolved ? 'border-[#cdedd9] bg-[#e9f6ef]' : 'border-[#f3c9c9] bg-[#fdeeee]'
        }`}
      >
        <span
          className={`grid size-10 place-items-center rounded-xl ${
            resolved ? 'bg-[#d7efe0]' : 'bg-[#fde7e7]'
          }`}
        >
          {resolved ? (
            <Check className="size-5 text-[#35c98e]" />
          ) : (
            <AlertTriangle className="size-5 text-[#f25555]" />
          )}
        </span>
        <div>
          <span
            className={`text-[11px] font-bold tracking-widest uppercase ${
              resolved ? 'text-[#35c98e]' : 'text-[#f25555]'
            }`}
          >
            {resolved ? 'Resolved' : 'Active'} · {record.severity}
          </span>
          <h1 className="text-[19px] font-semibold tracking-tight">{record.service}</h1>
        </div>
        <span className="ml-auto text-right text-[12px] text-[#82828d]">
          {when}
          <br />
          Lead: {record.lead}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <SectionLabel>Investigation</SectionLabel>
          <div className="space-y-2.5">
            {record.tools.length === 0 && (
              <Card className="p-4 text-[13px] text-[#82828d]">No tool activity recorded.</Card>
            )}
            {record.tools.map((t, i) => (
              <PipelineStep
                key={`${t.ts}-${i}`}
                icon={t.system}
                label={t.label}
                finding={t.finding}
                state={t.status === 'error' ? 'error' : 'done'}
                connector={i < record.tools.length - 1}
              />
            ))}
          </div>
        </section>
        <aside className="space-y-6">
          <section>
            <SectionLabel>Actions</SectionLabel>
            <div className="space-y-2.5">
              {deriveActions(record.tools).map((a) => (
                <ActionCard key={a.label} action={a} />
              ))}
            </div>
          </section>
          <section>
            <SectionLabel>Call transcript</SectionLabel>
            <RecordTranscript transcript={record.transcript} leadName={record.lead} />
          </section>
        </aside>
      </div>

      <Postmortem record={record} />
    </div>
  );
}

/** Build a postmortem draft from the recorded incident — timeline, actions, decisions. */
function postmortemText(r: IncidentRecord): string {
  const start = new Date(r.startedAt);
  const durS = r.endedAt ? Math.round((r.endedAt - r.startedAt) / 1000) : null;
  const dur = durS != null ? `${Math.floor(durS / 60)}m ${durS % 60}s` : 'ongoing';
  const done = deriveActions(r.tools).filter((a) => a.done);
  return [
    `# Postmortem — ${r.service}`,
    ``,
    `Severity: ${r.severity}   Status: ${r.status}   Lead: ${r.lead}`,
    `Started: ${start.toLocaleString()}   Duration: ${dur}`,
    ``,
    `## Summary`,
    `${r.service} hit a ${r.severity} incident. HandFree paged ${r.lead} and worked it on a live call.`,
    ``,
    `## Timeline`,
    ...(r.tools.length
      ? r.tools.map((t) => `- ${new Date(t.ts).toLocaleTimeString()} — ${t.label}: ${t.finding}`)
      : ['- No tool activity recorded.']),
    ``,
    `## Actions taken`,
    ...(done.length ? done.map((a) => `- ${a.label}`) : ['- None recorded.']),
    ``,
    `## Decisions (from the call)`,
    ...(r.transcript.length
      ? r.transcript.slice(-8).map((t) => `> ${t.who === 'lead' ? r.lead : 'HandFree'}: ${t.text}`)
      : ['- No transcript captured.']),
  ].join('\n');
}

function Postmortem({ record }: { record: IncidentRecord }) {
  const [copied, setCopied] = useState(false);
  const text = postmortemText(record);
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel>Postmortem · auto-generated</SectionLabel>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6ea] px-2.5 py-1 text-[12px] text-[#5b5b66] transition-colors hover:text-[#16161a]"
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <Card className="p-0">
        <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed text-[#24242b]">
          {text}
        </pre>
      </Card>
    </section>
  );
}

function RecordTranscript({
  transcript,
  leadName,
}: {
  transcript: TranscriptTurn[];
  leadName: string;
}) {
  if (!transcript.length) {
    return <Card className="p-4 text-[13px] text-[#82828d]">No transcript captured.</Card>;
  }
  return (
    <Card className="max-h-[44vh] space-y-2.5 overflow-y-auto p-4">
      {transcript.map((t, i) => {
        const isLead = t.who === 'lead';
        return (
          <div key={i} className={isLead ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                isLead
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#6e6bf2] px-3 py-1.5 text-[13.5px] text-white'
                  : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f1f1f4] px-3 py-1.5 text-[13.5px] text-[#24242b]'
              }
            >
              <span
                className={
                  isLead
                    ? 'mb-0.5 block text-[10px] font-semibold tracking-wide text-white/80 uppercase'
                    : 'mb-0.5 block text-[10px] font-semibold tracking-wide text-[#6e6bf2] uppercase'
                }
              >
                {isLead ? leadName : 'HandFree'}
              </span>
              {t.text}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
