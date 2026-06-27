'use client';

import { ChevronRight } from 'lucide-react';
import { useIncidents } from '@/hooks/use-incidents';
import { Card } from './ui';

export function IncidentsList({ onOpen }: { onOpen: (id: string) => void }) {
  const incidents = useIncidents();
  return (
    <div className="mx-auto max-w-4xl px-6 pt-8 pb-12">
      <h1 className="text-[24px] font-semibold tracking-tight">Incidents</h1>
      <p className="mt-1 text-[14px] text-[#5b5b66]">Every incident HandFree has handled.</p>

      {incidents.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-[14px] text-[#82828d]">
          No incidents yet. When one fires, HandFree calls the lead and works it — and it lands here.
        </Card>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e6e6ea] bg-white">
          {incidents.map((inc, i) => (
            <button
              key={inc.id}
              onClick={() => onOpen(inc.id)}
              className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[#f6f6f8] ${
                i > 0 ? 'border-t border-[#e6e6ea]' : ''
              }`}
            >
              <span
                className={`size-2.5 shrink-0 rounded-full ${
                  inc.status === 'active' ? 'bg-[#f25555]' : 'bg-[#35c98e]'
                }`}
              />
              <div className="min-w-0">
                <div className="text-[14.5px] font-medium">{inc.service}</div>
                <div className="text-[12px] text-[#82828d]">
                  {new Date(inc.startedAt).toLocaleString()} · {inc.lead}
                </div>
              </div>
              <span className="ml-auto text-[12px] text-[#82828d]">{inc.tools.length} steps</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  inc.status === 'active'
                    ? 'bg-[#fde7e7] text-[#f25555]'
                    : 'bg-[#e9f6ef] text-[#35c98e]'
                }`}
              >
                {inc.status}
              </span>
              <ChevronRight className="size-4 shrink-0 text-[#b8b8c0]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
