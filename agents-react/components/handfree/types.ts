/**
 * Configuration captured during onboarding. Bridges the UI to the rest of the
 * system (see idea.md): GitHub feeds the `github` MCP server, telli/twilio feed
 * `place_call`, etc. On connect this is pushed to the agent as LiveKit
 * participant attributes for the (friend-owned) workflow + MCP servers to read.
 */
export type Integration =
  'datadog' | 'kubernetes' | 'slack' | 'pagerduty' | 'telli' | 'aws' | 'azure' | 'gcp';

export type Sensitivity = 'conservative' | 'balanced' | 'aggressive';

export type MonitorPrefs = {
  deployments: boolean;
  pullRequests: boolean;
  workflowFailures: boolean;
  kubernetes: boolean;
  logs: boolean;
  metrics: boolean;
};

export type HandFreeConfig = {
  githubRepo: string;
  integrations: Integration[];
  monitor: MonitorPrefs;
  sensitivity: Sensitivity;
  primaryName: string;
  primaryPhone: string;
  backupName: string;
  backupPhone: string;
};

/** Top-level product surfaces in the console sidebar. */
export type NavKey = 'overview' | 'incidents' | 'integrations' | 'settings';

export const STORAGE_KEY = 'handfree.config.v2';
export const INCIDENTS_KEY = 'handfree.incidents.v1';

export type TranscriptTurn = { who: 'lead' | 'ai'; text: string };

export type IncidentToolStep = {
  system: string;
  label: string;
  finding: string;
  status: 'done' | 'error';
  ts: number;
};

/** A handled incident, persisted locally so the history/overview are real (built
 *  from actual runs), not mock data. Recorded live by IncidentRecorder. */
export type IncidentRecord = {
  id: string;
  startedAt: number;
  endedAt?: number;
  service: string;
  severity: string;
  lead: string;
  status: 'active' | 'resolved';
  tools: IncidentToolStep[];
  transcript: TranscriptTurn[];
};

export const DEMO_CONFIG: HandFreeConfig = {
  githubRepo: 'soleh-ventures/jakarta-telli-hackathon',
  integrations: ['datadog', 'kubernetes', 'slack', 'telli'],
  monitor: {
    deployments: true,
    pullRequests: true,
    workflowFailures: true,
    kubernetes: true,
    logs: true,
    metrics: true,
  },
  sensitivity: 'balanced',
  primaryName: 'Kemal',
  primaryPhone: '+49 176 28950549',
  backupName: 'Azhar',
  backupPhone: '+49 1522 4496645',
};

/** Repos selectable in onboarding (hardcoded for the demo). */
export const REPO_OPTIONS = ['soleh-ventures/jakarta-telli-hackathon'];
