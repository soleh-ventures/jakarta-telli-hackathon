'use client';

import { type LucideIcon, Activity, CheckCircle2, Clock, Phone } from 'lucide-react';
import { useIncidents } from '@/hooks/use-incidents';
import type { HandFreeConfig, NavKey } from './types';
import { Card, PhoneNumber, Pulse, SectionLabel, SystemIcon, T } from './ui';

const INTEGRATIONS = [
  { id: 'github', name: 'GitHub' },
  { id: 'datadog', name: 'Monitoring' },
  { id: 'slack', name: 'Slack' },
  { id: 'telli', name: 'Telephony' },
];

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Overview({
  config,
  onOpenIncident,
  onNav,
}: {
  config: HandFreeConfig;
  onOpenIncident: (id: string) => void;
  onNav: (k: NavKey) => void;
}) {
  const incidents = useIncidents();
  const active = incidents.find((i) => i.status === 'active');
  const resolved = incidents.filter((i) => i.status === 'resolved');
  const repo = config.githubRepo.split('/')[1] || 'your service';

  return (
    <div className="mx-auto max-w-5xl px-6 pt-8 pb-12">
      <h1 className="text-[24px] font-semibold tracking-tight">Overview</h1>
      <p className="mt-1 text-[14px] text-[#5b5b66]">Voice-first incident response for {repo}.</p>

      <div
        className={`mt-6 flex items-center gap-3 rounded-2xl border px-5 py-4 ${
          active ? 'border-[#f3c9c9] bg-[#fdeeee]' : 'border-[#cdedd9] bg-[#e9f6ef]'
        }`}
      >
        <Pulse color={active ? T.red : T.green} size={9} />
        <div>
          <div className="text-[15px] font-semibold">
            {active ? 'Active incident in progress' : 'All systems operational'}
          </div>
          <div className="text-[12.5px] text-[#5b5b66]">
            {active
              ? `HandFree is on a call with ${active.lead}.`
              : 'HandFree is monitoring. It calls the on-call lead the moment something breaks.'}
          </div>
        </div>
        {active && (
          <button
            onClick={() => onOpenIncident(active.id)}
            className="ml-auto rounded-lg bg-[#6e6bf2] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#5d5ae6]"
          >
            View live
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={Activity} label="Incidents handled" value={String(incidents.length)} />
        <Stat icon={Phone} label="Calls placed" value={String(incidents.length)} />
        <Stat icon={CheckCircle2} label="Resolved" value={String(resolved.length)} />
        <Stat icon={Clock} label="Last incident" value={incidents[0] ? ago(incidents[0].startedAt) : '—'} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <SectionLabel>On-call</SectionLabel>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#eeeefb] text-[14px] font-semibold text-[#6e6bf2]">
              {(config.primaryName || '?').slice(0, 1)}
            </span>
            <div>
              <div className="text-[15px] font-medium">{config.primaryName || 'Unassigned'}</div>
              <PhoneNumber value={config.primaryPhone} className="text-[12.5px] text-[#82828d]" />
            </div>
            <span className="ml-auto rounded-full bg-[#e9f6ef] px-2.5 py-1 text-[11.5px] font-semibold text-[#35c98e]">
              Primary
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-[#e6e6ea] pt-3">
            <span className="grid size-9 place-items-center rounded-full bg-[#f1f1f4] text-[13px] font-medium text-[#5b5b66]">
              {(config.backupName || '?').slice(0, 1)}
            </span>
            <div>
              <div className="text-[14px]">{config.backupName || '—'}</div>
              <PhoneNumber value={config.backupPhone} className="text-[12px] text-[#82828d]" />
            </div>
            <span className="ml-auto text-[11.5px] text-[#82828d]">Backup</span>
          </div>
          <button
            onClick={() => onNav('settings')}
            className="mt-4 w-full rounded-lg border border-[#e6e6ea] py-2 text-[13px] text-[#5b5b66] transition-colors hover:text-[#16161a]"
          >
            Edit on-call
          </button>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel>Recent incidents</SectionLabel>
            <button onClick={() => onNav('incidents')} className="text-[12.5px] text-[#6e6bf2] hover:underline">
              View all
            </button>
          </div>
          {incidents.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[#82828d]">
              No incidents yet. When one fires, HandFree handles it and it shows up here.
            </div>
          ) : (
            <div className="-mx-1">
              {incidents.slice(0, 5).map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => onOpenIncident(inc.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#f6f6f8]"
                >
                  <span
                    className={`size-2 rounded-full ${
                      inc.status === 'active' ? 'bg-[#f25555]' : 'bg-[#35c98e]'
                    }`}
                  />
                  <span className="text-[14px] font-medium">{inc.service}</span>
                  <span className="text-[12px] text-[#82828d]">{inc.tools.length} steps</span>
                  <span className="ml-auto text-[12px] text-[#82828d]">{ago(inc.startedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-7">
        <SectionLabel>Connected systems</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {INTEGRATIONS.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e6ea] bg-white px-3 py-1.5 text-[12.5px] text-[#5b5b66]"
            >
              <SystemIcon id={s.id} className="size-3.5" /> {s.name}
              <span className="size-1.5 rounded-full bg-[#35c98e]" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="p-4">
      <Icon className="size-4 text-[#82828d]" />
      <div className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="text-[12px] text-[#82828d]">{label}</div>
    </Card>
  );
}
