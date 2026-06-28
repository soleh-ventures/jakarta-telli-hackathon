'use client';

import { useEffect, useRef, useState } from 'react';
import { useSessionContext, useSessionMessages } from '@livekit/components-react';
import {
  type HandFreeConfig,
  type IncidentRecord,
  INCIDENTS_KEY,
  type TranscriptTurn,
} from '@/components/handfree/types';
import { useHandFreeEvents } from './use-handfree-events';

const CHANGED = 'handfree-incidents-changed';

export function loadIncidents(): IncidentRecord[] {
  try {
    const raw = localStorage.getItem(INCIDENTS_KEY);
    const list = raw ? (JSON.parse(raw) as IncidentRecord[]) : [];
    return list.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

function persist(rec: IncidentRecord) {
  try {
    const list = loadIncidents().filter((r) => r.id !== rec.id);
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify([rec, ...list].slice(0, 50)));
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // ignore quota / serialization errors
  }
}

/** Live list of handled incidents, re-read whenever the recorder writes one. */
export function useIncidents(): IncidentRecord[] {
  const [list, setList] = useState<IncidentRecord[]>([]);
  useEffect(() => {
    const reload = () => setList(loadIncidents());
    reload();
    window.addEventListener(CHANGED, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(CHANGED, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  return list;
}

/**
 * Records the live incident (tools + transcript) to localStorage as it happens,
 * and finalizes it on disconnect. This is what makes the history and overview
 * real — every row is an incident HandFree actually handled, not mock data.
 */
export function IncidentRecorder({ config }: { config: HandFreeConfig }) {
  const session = useSessionContext();
  const { tools, agentState } = useHandFreeEvents();
  const { messages } = useSessionMessages(session);
  const startRef = useRef<{ id: string; startedAt: number } | null>(null);

  const active = tools.length > 0 || agentState === 'speaking';

  useEffect(() => {
    if (!active) return;
    if (!startRef.current) {
      const now = Date.now();
      startRef.current = { id: `inc-${now}`, startedAt: now };
    }
    const transcript: TranscriptTurn[] = messages.map((m) => ({
      who: (m.from?.identity || '').startsWith('phone:') ? 'lead' : 'ai',
      text: m.message,
    }));
    persist({
      id: startRef.current.id,
      startedAt: startRef.current.startedAt,
      service: 'Checkout API',
      severity: 'critical',
      lead: config.primaryName || 'On-call lead',
      status: session.isConnected ? 'active' : 'resolved',
      endedAt: session.isConnected ? undefined : Date.now(),
      tools: tools.map((t) => ({
        system: t.system,
        label: t.label,
        finding: t.finding,
        status: t.status,
        ts: t.ts,
      })),
      transcript,
    });
  }, [active, tools, messages, session.isConnected, config.primaryName]);

  // Finalize the record when the call ends.
  useEffect(() => {
    if (!startRef.current || session.isConnected) return;
    const rec = loadIncidents().find((r) => r.id === startRef.current?.id);
    if (rec && rec.status === 'active') {
      persist({ ...rec, status: 'resolved', endedAt: Date.now() });
    }
  }, [session.isConnected]);

  return null;
}
