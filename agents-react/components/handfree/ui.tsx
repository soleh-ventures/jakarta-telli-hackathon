'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  Bug,
  Boxes,
  Cloud,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  GitBranch,
  Github,
  Globe,
  LineChart,
  Phone,
  Radio,
  Server,
  ShieldAlert,
  Slack,
  SquareKanban,
} from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

// ---------------------------------------------------------------------------
// Design tokens — dark-first, neutral grays, blue/purple accent. Red is
// reserved for active incidents, green for recovered systems. Kept here so the
// whole HandFree surface stays consistent.
// ---------------------------------------------------------------------------
export const T = {
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceHi: '#f1f1f4',
  border: '#e6e6ea',
  text: '#16161a',
  textDim: '#5b5b66',
  textFaint: '#82828d',
  accent: '#6e6bf2',
  accentSoft: '#6e6bf2',
  red: '#f25555',
  green: '#35c98e',
  amber: '#e3b341',
} as const;

export function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Rounded, low-border elevated card — the core container of the app. */
export function Card({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-2xl border border-[#e6e6ea] bg-[#ffffff] p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[12px] font-medium tracking-wide text-[#82828d] uppercase">
      {children}
    </div>
  );
}

/** A soft animated status dot — the "alive" signal used across the app. */
export function Pulse({ color = T.green, size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}

export type Health = 'healthy' | 'ready' | 'incident' | 'recovered';

export function HealthBadge({ health }: { health: Health }) {
  const map: Record<Health, { label: string; color: string }> = {
    healthy: { label: 'Healthy', color: T.green },
    recovered: { label: 'Recovered', color: T.green },
    ready: { label: 'Ready', color: T.accentSoft },
    incident: { label: 'Incident', color: T.red },
  };
  const { label, color } = map[health];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/** Maps a system/integration id to a brand-ish lucide icon. */
export const SYSTEM_ICON: Record<string, LucideIcon> = {
  github: Github,
  datadog: Activity,
  kubernetes: Boxes,
  slack: Slack,
  telli: Phone,
  telephony: Phone,
  pagerduty: Bell,
  opsgenie: Bell,
  aws: Cloud,
  azure: Cloud,
  gcp: Cloud,
  cloudwatch: Gauge,
  logs: Server,
  splunk: Server,
  metrics: Radio,
  sentry: Bug,
  grafana: LineChart,
  prometheus: Flame,
  jira: SquareKanban,
  linear: GitBranch,
  statuspage: Globe,
  honeycomb: ShieldAlert,
};

export function SystemIcon({ id, className }: { id: string; className?: string }) {
  const Icon = SYSTEM_ICON[id] ?? Server;
  return <Icon className={className} />;
}

/** Mask a phone number bank-style: keep formatting, reveal only the last 4 digits. */
export function maskPhone(raw: string): string {
  const total = (raw.match(/\d/g) || []).length;
  let seen = 0;
  return raw.replace(/\d/g, (d) => (++seen > total - 4 ? d : '•'));
}

/** A phone number that is censored by default (like a bank hiding a balance), with
 *  an eye toggle to reveal it. Keeps sensitive contact details off-screen. */
export function PhoneNumber({ value, className }: { value: string; className?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="tabular-nums">{shown ? value : maskPhone(value)}</span>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="text-[#b8b8c0] transition-colors hover:text-[#5b5b66]"
        title={shown ? 'Hide number' : 'Reveal number'}
        aria-label={shown ? 'Hide number' : 'Reveal number'}
      >
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </span>
  );
}
