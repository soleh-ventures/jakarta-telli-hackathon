import type { Health } from './ui';

// ---------------------------------------------------------------------------
// All demo data lives here. When the (friend-owned) agents emit real events
// over the LiveKit room, replace these constants with derived state — the views
// consume these shapes and won't need to change.
// ---------------------------------------------------------------------------

export type ConnectedSystem = {
  id: string;
  name: string;
  health: Health;
  lastChecked: string;
  latency: string;
};

export const CONNECTED_SYSTEMS: ConnectedSystem[] = [
  { id: 'github', name: 'GitHub', health: 'healthy', lastChecked: '20s ago', latency: '84ms' },
  { id: 'datadog', name: 'Datadog', health: 'healthy', lastChecked: '12s ago', latency: '110ms' },
  { id: 'kubernetes', name: 'Kubernetes', health: 'healthy', lastChecked: '8s ago', latency: '32ms' },
  { id: 'slack', name: 'Slack', health: 'healthy', lastChecked: '40s ago', latency: '70ms' },
  { id: 'telli', name: 'telli', health: 'ready', lastChecked: '1m ago', latency: '—' },
  { id: 'logs', name: 'Logs', health: 'healthy', lastChecked: '5s ago', latency: '21ms' },
];

export type ActivityItem = { time: string; text: string };

export const AI_ACTIVITY: ActivityItem[] = [
  { time: '09:42', text: 'Checked deployment #2231' },
  { time: '09:45', text: 'Observed latency increase on checkout-api' },
  { time: '09:46', text: 'Cross-checking application logs' },
  { time: '09:47', text: 'Investigating Kubernetes pod health' },
  { time: '09:48', text: 'Hypothesis formed — monitoring for confirmation' },
];

export type VoiceCall = {
  engineer: string;
  duration: string;
  result: 'Acknowledged' | 'No answer' | 'Recovered';
  when: string;
};

export const RECENT_CALLS: VoiceCall[] = [
  { engineer: 'Alex', duration: '0:48', result: 'Acknowledged', when: 'Today 02:14' },
  { engineer: 'Priya', duration: '0:12', result: 'No answer', when: 'Yesterday 23:40' },
  { engineer: 'Alex', duration: '1:03', result: 'Recovered', when: 'Mar 11 04:22' },
];

// --- Incident -------------------------------------------------------------

export type InvestigationStep = {
  id: string;
  label: string;
  finding: string;
  done: boolean;
};

export const INVESTIGATION: InvestigationStep[] = [
  { id: 'github', label: 'GitHub Analysis', finding: 'Found deployment PR #2231 merged at 1:38', done: true },
  { id: 'logs', label: 'Log Analysis', finding: 'Payment timeout errors increased 12×', done: true },
  { id: 'metrics', label: 'Metrics Analysis', finding: 'p99 latency +340% on /checkout', done: true },
  { id: 'kubernetes', label: 'Kubernetes Analysis', finding: 'Pods healthy, no restarts or OOM', done: true },
];

export const HYPOTHESIS = {
  confidence: 92,
  statement: 'Regression introduced in PR #2231 (payment retry logic).',
};

export type Recommendation = { label: string; confidence: number; primary?: boolean };

export const RECOMMENDATIONS: Recommendation[] = [
  { label: 'Rollback deployment #2231', confidence: 94, primary: true },
  { label: 'Restart payment service', confidence: 41 },
  { label: 'Scale replicas', confidence: 22 },
];

export type ThinkingItem = string;

export const THINKING: ThinkingItem[] = [
  'Comparing deployment history',
  'Checking related pull requests',
  'Looking for similar past incidents',
  'Comparing with previous outages',
  'Checking rollout percentage',
];

// Scripted transcript shown when not connected to a live session.
export type Turn = { who: 'ai' | 'engineer'; text: string };

export const DEMO_TRANSCRIPT: Turn[] = [
  {
    who: 'ai',
    text: 'Hi Alex. Checkout API latency increased after deployment PR 2231. I recommend a rollback. Do you approve?',
  },
  { who: 'engineer', text: 'Yes.' },
  { who: 'ai', text: 'Rollback initiated. I will confirm recovery and call back if anything changes.' },
];

// --- Post incident --------------------------------------------------------

export type Stat = { label: string; value: string };

export const POST_STATS: Stat[] = [
  { label: 'Incident duration', value: '8m 12s' },
  { label: 'Root cause', value: 'PR #2231 regression' },
  { label: 'Actions taken', value: 'Rollback' },
  { label: 'Calls made', value: '1' },
  { label: 'Rollback time', value: '2m 40s' },
  { label: 'MTTR', value: '8m' },
];

export const POST_TIMELINE: ActivityItem[] = [
  { time: '09:41', text: 'Alert — 500s on checkout-api' },
  { time: '09:42', text: 'AI investigation started' },
  { time: '09:44', text: 'Root cause found — PR #2231' },
  { time: '09:45', text: 'Engineer called' },
  { time: '09:46', text: 'Rollback approved' },
  { time: '09:49', text: 'Recovery confirmed' },
];
