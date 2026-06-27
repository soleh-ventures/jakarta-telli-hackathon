'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  Cloud,
  Github,
  Phone,
  Radio,
  Server,
  Slack,
  Activity,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

// ---------------------------------------------------------------------------
// Design tokens — dark-first, neutral grays, blue/purple accent. Red is
// reserved for active incidents, green for recovered systems. Kept here so the
// whole HandFree surface stays consistent.
// ---------------------------------------------------------------------------
export const T = {
  bg: '#0a0a0c',
  surface: '#141518',
  surfaceHi: '#1a1b1f',
  border: '#1f2024',
  text: '#ededef',
  textDim: '#9b9ba3',
  textFaint: '#6a6a73',
  accent: '#6e6bf2',
  accentSoft: '#a5a3f8',
  red: '#f25555',
  green: '#35c98e',
  amber: '#e3b341',
} as const;

export function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Rounded, low-border elevated card — the core container of the app. */
export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-2xl border border-[#1f2024] bg-[#141518] p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[12px] font-medium tracking-wide text-[#6a6a73] uppercase">
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
    <span
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium"
      style={{ color }}
    >
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
  pagerduty: Bell,
  aws: Cloud,
  azure: Cloud,
  gcp: Cloud,
  logs: Server,
  metrics: Radio,
};

export function SystemIcon({ id, className }: { id: string; className?: string }) {
  const Icon = SYSTEM_ICON[id] ?? Server;
  return <Icon className={className} />;
}
