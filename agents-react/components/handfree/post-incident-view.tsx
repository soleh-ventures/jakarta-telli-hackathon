'use client';

import { CheckCircle2 } from 'lucide-react';
import { POST_STATS, POST_TIMELINE } from './mock-data';
import { Card, SectionLabel, T } from './ui';

export function PostIncidentView() {
  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      {/* Recovered banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1c3d2a] bg-gradient-to-r from-[#0f1f16] to-[#141518] p-6">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-40 opacity-25 blur-2xl"
          style={{ background: `radial-gradient(circle, ${T.green}, transparent 70%)` }}
        />
        <div className="relative flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-[#11281a]">
            <CheckCircle2 className="size-6 text-[#35c98e]" />
          </span>
          <div>
            <div className="text-[12px] font-bold tracking-widest text-[#35c98e] uppercase">
              System recovered
            </div>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Checkout API · resolved</h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8">
        <SectionLabel>Summary</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {POST_STATS.map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-[12px] tracking-wide text-[#6a6a73] uppercase">{s.label}</div>
              <div className="mt-1.5 text-[18px] font-semibold tracking-tight">{s.value}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-8">
        <SectionLabel>Timeline</SectionLabel>
        <Card className="p-6">
          <ol className="relative ml-1.5 border-l border-[#23242b]">
            {POST_TIMELINE.map((t, i) => {
              const last = i === POST_TIMELINE.length - 1;
              return (
                <li key={i} className="relative mb-5 pl-6 last:mb-0">
                  <span
                    className="absolute top-1 -left-[5px] block size-2.5 rounded-full"
                    style={{ backgroundColor: last ? T.green : '#3a3b42' }}
                  />
                  <div className="font-mono text-[12px] text-[#6a6a73]">{t.time}</div>
                  <div
                    className="mt-0.5 text-[14px]"
                    style={{ color: last ? T.green : '#cdcdd2' }}
                  >
                    {t.text}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}
