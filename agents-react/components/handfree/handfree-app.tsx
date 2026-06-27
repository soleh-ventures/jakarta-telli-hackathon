'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { type LucideIcon, Boxes, LayoutGrid, ListChecks, Mic, Settings2 } from 'lucide-react';
import {
  useDataChannel,
  useLocalParticipant,
  useSession,
  useSessionContext,
} from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { useHandFreeEvents } from '@/hooks/use-handfree-events';
import { IncidentRecorder, useIncidents } from '@/hooks/use-incidents';
import { getSandboxTokenSource } from '@/lib/utils';
import { IncidentConsole, IncidentDetail } from './incident-view';
import { IncidentsList } from './incidents-list';
import { Integrations } from './integrations';
import { OnboardingWizard } from './onboarding-wizard';
import { Overview } from './overview';
import { Settings } from './settings';
import { type HandFreeConfig, type NavKey, STORAGE_KEY } from './types';
import { Pulse, T } from './ui';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const CONTROL_TOPIC = 'handfree-control';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  return null;
}

/** Pushes onboarding config to the agent as participant attributes on connect. */
function SessionConfigSync({ config }: { config: HandFreeConfig }) {
  const { isConnected } = useSessionContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!isConnected || !localParticipant) return;
    // Observe-only dashboard: the human is on the phone, the agent listens to that
    // SIP leg (see agent.py focus_audio_on_phone), so the browser publishes no mic.
    void localParticipant.setMicrophoneEnabled(false);
    void localParticipant.setAttributes({
      github_repo: config.githubRepo,
      primary_name: config.primaryName,
      primary_phone: config.primaryPhone,
      backup_name: config.backupName,
      backup_phone: config.backupPhone,
      sensitivity: config.sensitivity,
    });
  }, [isConnected, localParticipant, config]);

  return null;
}

/** Console = incident console: connect on load, then page the on-call lead. No button. */
function AutoStartIncident() {
  const session = useSessionContext();
  const { send } = useDataChannel();
  const started = useRef(false);
  const paged = useRef(false);

  useEffect(() => {
    if (started.current || session.isConnected) return;
    started.current = true;
    void session.start();
  }, [session]);

  useEffect(() => {
    if (!session.isConnected || paged.current) return;
    paged.current = true;
    void send(new TextEncoder().encode(JSON.stringify({ action: 'trigger_incident' })), {
      topic: CONTROL_TOPIC,
      reliable: true,
    });
  }, [session.isConnected, send]);

  return null;
}

function StatusPill() {
  const session = useSessionContext();
  const { agentState } = useHandFreeEvents();

  let label = 'Standby';
  let color: string = T.textFaint;
  if (session.isConnected) {
    if (agentState === 'speaking' || agentState === 'listening' || agentState === 'thinking') {
      label = 'On a call';
      color = T.green;
    } else {
      label = 'Connecting…';
      color = T.amber;
    }
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e6ea] px-2.5 py-1 text-[12px] font-medium text-[#5b5b66]">
      <Pulse color={color} size={6} />
      {label}
    </span>
  );
}

const NAV_ITEMS: [NavKey, string, LucideIcon][] = [
  ['overview', 'Overview', LayoutGrid],
  ['incidents', 'Incidents', ListChecks],
  ['integrations', 'Integrations', Boxes],
  ['settings', 'Settings', Settings2],
];

function Sidebar({
  nav,
  onNav,
  live,
  viewLive,
  onLive,
}: {
  nav: NavKey;
  onNav: (k: NavKey) => void;
  live: boolean;
  viewLive: boolean;
  onLive: () => void;
}) {
  return (
    <aside className="flex w-[224px] shrink-0 flex-col border-r border-[#e6e6ea] bg-[#fafafb] px-3 py-4">
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#6e6bf2] to-[#9d6bf2]">
          <Mic className="size-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">HandFree</span>
      </div>
      <div className="px-2 pt-2 pb-4">
        <StatusPill />
      </div>

      {live && (
        <button
          onClick={onLive}
          className={`mb-1.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
            viewLive ? 'bg-[#fde7e7] text-[#f25555]' : 'text-[#f25555] hover:bg-[#fdeeee]'
          }`}
        >
          <Pulse color={T.red} size={7} /> Live incident
        </button>
      )}

      <nav className="space-y-0.5">
        {NAV_ITEMS.map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => onNav(k)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
              nav === k && !viewLive
                ? 'bg-[#eeeefb] text-[#6e6bf2]'
                : 'text-[#5b5b66] hover:bg-[#f1f1f4]'
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-3 text-[11px] leading-relaxed text-[#b8b8c0]">
        Voice-first incident response
      </div>
    </aside>
  );
}

type View = { t: 'nav' } | { t: 'live' } | { t: 'detail'; id: string };

function Console({ config, onEdit }: { config: HandFreeConfig; onEdit: () => void }) {
  const { tools, agentState } = useHandFreeEvents();
  const incidents = useIncidents();
  const live = tools.length > 0 || agentState === 'speaking';
  const [nav, setNav] = useState<NavKey>('overview');
  const [view, setView] = useState<View>({ t: 'nav' });
  const wasLive = useRef(false);

  // Jump to the live console the moment a call starts; fall back to nav when it ends.
  useEffect(() => {
    if (live && !wasLive.current) setView({ t: 'live' });
    if (!live && wasLive.current) setView((v) => (v.t === 'live' ? { t: 'nav' } : v));
    wasLive.current = live;
  }, [live]);

  const goNav = (k: NavKey) => {
    setNav(k);
    setView({ t: 'nav' });
  };
  const openIncident = (id: string) => {
    const rec = incidents.find((i) => i.id === id);
    setView(rec?.status === 'active' ? { t: 'live' } : { t: 'detail', id });
  };

  let main: React.ReactNode;
  if (view.t === 'live') {
    main = <IncidentConsole config={config} />;
  } else if (view.t === 'detail') {
    const rec = incidents.find((i) => i.id === view.id);
    main = rec ? (
      <IncidentDetail record={rec} />
    ) : (
      <Overview config={config} onOpenIncident={openIncident} onNav={goNav} />
    );
  } else if (nav === 'overview') {
    main = <Overview config={config} onOpenIncident={openIncident} onNav={goNav} />;
  } else if (nav === 'incidents') {
    main = <IncidentsList onOpen={openIncident} />;
  } else if (nav === 'integrations') {
    main = <Integrations config={config} />;
  } else {
    main = <Settings config={config} onEdit={onEdit} />;
  }

  return (
    <div className="flex h-svh bg-white text-[#16161a]">
      <Sidebar
        nav={nav}
        onNav={goNav}
        live={live}
        viewLive={view.t === 'live'}
        onLive={() => setView({ t: 'live' })}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">{main}</main>
    </div>
  );
}

export function HandFreeApp({ appConfig }: { appConfig: AppConfig }) {
  const [config, setConfig] = useState<HandFreeConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig(JSON.parse(raw) as HandFreeConfig);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/token');
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  function complete(next: HandFreeConfig) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setConfig(next);
  }

  if (!loaded) return <div className="h-svh bg-white" />;
  if (!config) return <OnboardingWizard onComplete={complete} />;

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <SessionConfigSync config={config} />
      <AutoStartIncident />
      <IncidentRecorder config={config} />
      <Console config={config} onEdit={() => setConfig(null)} />

      <Toaster
        icons={{ warning: <WarningIcon weight="bold" /> }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
