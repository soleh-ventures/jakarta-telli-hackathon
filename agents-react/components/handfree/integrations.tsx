'use client';

import { Check, Plus } from 'lucide-react';
import type { HandFreeConfig } from './types';
import { Card, SectionLabel, SystemIcon } from './ui';

type Item = { id: string; name: string; desc: string; connected: boolean };

const ITEMS: Item[] = [
  // Connected — the systems HandFree actually reads/acts through today.
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Finds the suspect deploy and who shipped it. Opens a revert PR on rollback.',
    connected: true,
  },
  {
    id: 'datadog',
    name: 'Datadog',
    desc: 'Error rate, p99 latency, and when the incident started.',
    connected: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Posts the incident report to #incidents when the lead approves.',
    connected: true,
  },
  {
    id: 'telephony',
    name: 'Telephony (SIP)',
    desc: 'Places the real outbound call to the on-call lead.',
    connected: true,
  },
  // Available — relevant integrations, UI-first (not wired yet).
  { id: 'pagerduty', name: 'PagerDuty', desc: 'On-call schedules and escalation policies.', connected: false },
  { id: 'opsgenie', name: 'Opsgenie', desc: 'Alert routing and on-call rotations.', connected: false },
  { id: 'sentry', name: 'Sentry', desc: 'Group the errors and surface the offending release.', connected: false },
  { id: 'grafana', name: 'Grafana', desc: 'Pull the dashboard panels the lead needs to see.', connected: false },
  { id: 'prometheus', name: 'Prometheus', desc: 'Query live metrics during triage.', connected: false },
  { id: 'kubernetes', name: 'Kubernetes', desc: 'Pod health, restarts, and rollout status.', connected: false },
  { id: 'cloudwatch', name: 'AWS CloudWatch', desc: 'Logs and alarms across AWS services.', connected: false },
  { id: 'jira', name: 'Jira', desc: 'Open an incident ticket and track follow-ups.', connected: false },
  { id: 'linear', name: 'Linear', desc: 'File post-incident action items automatically.', connected: false },
  { id: 'statuspage', name: 'Statuspage', desc: 'Post customer-facing status updates.', connected: false },
  { id: 'splunk', name: 'Splunk', desc: 'Search logs across the fleet during triage.', connected: false },
  { id: 'honeycomb', name: 'Honeycomb', desc: 'Trace the slow path with high-cardinality data.', connected: false },
];

function IntegrationCard({ item }: { item: Item }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-[#f1f1f4]">
          <SystemIcon id={item.id} className="size-4 text-[#5b5b66]" />
        </span>
        <span className="text-[14.5px] font-semibold">{item.name}</span>
        {item.connected ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#e9f6ef] px-2 py-0.5 text-[11px] font-semibold text-[#35c98e]">
            <Check className="size-3" /> Connected
          </span>
        ) : (
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#e6e6ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#5b5b66] transition-colors hover:bg-[#f1f1f4]"
          >
            <Plus className="size-3" /> Connect
          </button>
        )}
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#5b5b66]">{item.desc}</p>
    </Card>
  );
}

export function Integrations({ config }: { config: HandFreeConfig }) {
  const connected = ITEMS.filter((i) => i.connected);
  const available = ITEMS.filter((i) => !i.connected);
  return (
    <div className="mx-auto max-w-5xl px-6 pt-8 pb-12">
      <h1 className="text-[24px] font-semibold tracking-tight">Integrations</h1>
      <p className="mt-1 text-[14px] text-[#5b5b66]">
        The systems HandFree reads and acts through during an incident.
      </p>

      <div className="mt-6">
        <SectionLabel>Connected · {connected.length}</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connected.map((it) => (
            <IntegrationCard key={it.id} item={it} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel>Available</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((it) => (
            <IntegrationCard key={it.id} item={it} />
          ))}
        </div>
      </div>

      <p className="mt-6 text-[12px] text-[#82828d]">Repository: {config.githubRepo}</p>
    </div>
  );
}
