'use client';

import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import type { HandFreeConfig } from './types';
import { Card, PhoneNumber } from './ui';

export function Settings({ config, onEdit }: { config: HandFreeConfig; onEdit: () => void }) {
  const rows: [string, ReactNode][] = [
    ['Repository', config.githubRepo],
    [
      'On-call lead',
      <span key="primary">
        {config.primaryName} · <PhoneNumber value={config.primaryPhone} />
      </span>,
    ],
    [
      'Backup',
      <span key="backup">
        {config.backupName} · <PhoneNumber value={config.backupPhone} />
      </span>,
    ],
    ['Sensitivity', config.sensitivity],
  ];
  return (
    <div className="mx-auto max-w-2xl px-6 pt-8 pb-12">
      <h1 className="text-[24px] font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-[14px] text-[#5b5b66]">How HandFree monitors, and who it calls.</p>

      <Card className="mt-6 divide-y divide-[#e6e6ea] p-0">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[13px] text-[#82828d]">{k}</span>
            <span className="text-right text-[14px] font-medium">{v}</span>
          </div>
        ))}
      </Card>

      <button
        onClick={onEdit}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#6e6bf2] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#5d5ae6]"
      >
        <Pencil className="size-4" /> Edit configuration
      </button>
    </div>
  );
}
