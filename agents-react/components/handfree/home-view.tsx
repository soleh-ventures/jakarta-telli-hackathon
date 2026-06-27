'use client';

import { PhoneCall, PhoneMissed, PhoneOutgoing } from 'lucide-react';
import { AI_ACTIVITY, CONNECTED_SYSTEMS, RECENT_CALLS, type VoiceCall } from './mock-data';
import { Card, HealthBadge, Pulse, SectionLabel, SystemIcon, T } from './ui';
import type { HandFreeConfig } from './types';

export function HomeView({ config }: { config: HandFreeConfig }) {
  const systemCount = CONNECTED_SYSTEMS.length;

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-6 py-8">
      {/* AI status hero */}
      <Card className="relative overflow-hidden p-7">
        <div
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full opacity-25 blur-3xl"
          style={{ background: `radial-gradient(circle, ${T.accent}, transparent 70%)` }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Pulse color={T.green} size={9} />
              <span className="text-[13px] font-medium tracking-wide text-[#9b9ba3] uppercase">
                Monitoring
              </span>
            </div>
            <h1 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight">
              Watching {systemCount} connected systems
            </h1>
            <p className="mt-1.5 text-[14px] text-[#6a6a73]">
              <span className="font-mono text-[#9b9ba3]">{config.githubRepo}</span> looks healthy.
              Last investigation 14 minutes ago.
            </p>
          </div>

          <div className="flex items-center gap-8">
            <Metric label="Confidence" value="98%" accent />
            <Metric label="Last check" value="20s" />
          </div>
        </div>
      </Card>

      {/* Connected systems */}
      <div className="mt-9">
        <SectionLabel>Connected systems</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONNECTED_SYSTEMS.map((s) => (
            <Card key={s.id} className="p-4 transition-colors hover:border-[#2c2d33]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SystemIcon id={s.id} className="size-5 text-[#cdcdd2]" />
                  <span className="text-[15px] font-medium">{s.name}</span>
                </div>
                <HealthBadge health={s.health} />
              </div>
              <div className="mt-4 flex items-center justify-between text-[12.5px] text-[#6a6a73]">
                <span>Checked {s.lastChecked}</span>
                <span className="font-mono">{s.latency}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* AI activity timeline */}
      <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionLabel>AI activity</SectionLabel>
          <Card className="p-6">
            <ol className="relative ml-1.5 border-l border-[#23242b]">
              {AI_ACTIVITY.map((a, i) => {
                const live = i === AI_ACTIVITY.length - 1;
                return (
                  <li key={i} className="relative mb-5 pl-6 last:mb-0">
                    <span className="absolute -left-[5px] top-1.5">
                      {live ? (
                        <Pulse color={T.accent} size={9} />
                      ) : (
                        <span className="block size-2 rounded-full bg-[#3a3b42]" />
                      )}
                    </span>
                    <div className="font-mono text-[12px] text-[#6a6a73]">{a.time}</div>
                    <div className="mt-0.5 text-[14px] text-[#cdcdd2]">{a.text}</div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* Recent voice calls */}
        <div>
          <SectionLabel>Recent voice calls</SectionLabel>
          <Card className="divide-y divide-[#1f2024] p-0">
            {RECENT_CALLS.map((c, i) => (
              <CallRow key={i} call={c} />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-right">
      <div
        className="text-[30px] font-semibold tracking-tight tabular-nums"
        style={{ color: accent ? T.accentSoft : T.text }}
      >
        {value}
      </div>
      <div className="text-[12px] tracking-wide text-[#6a6a73] uppercase">{label}</div>
    </div>
  );
}

function CallRow({ call }: { call: VoiceCall }) {
  const map = {
    Acknowledged: { icon: PhoneCall, color: T.green },
    Recovered: { icon: PhoneCall, color: T.green },
    'No answer': { icon: PhoneMissed, color: T.textFaint },
  } as const;
  const { icon: Icon, color } = map[call.result] ?? { icon: PhoneOutgoing, color: T.textDim };
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="grid size-8 place-items-center rounded-full bg-[#1a1b1f]">
        <Icon className="size-4" style={{ color }} />
      </span>
      <div className="flex-1">
        <div className="text-[14px] font-medium">{call.engineer}</div>
        <div className="text-[12px] text-[#6a6a73]">{call.when}</div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-medium" style={{ color }}>
          {call.result}
        </div>
        <div className="font-mono text-[12px] text-[#6a6a73]">{call.duration}</div>
      </div>
    </div>
  );
}
