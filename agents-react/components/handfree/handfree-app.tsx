'use client';

import { useEffect, useMemo, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { useLocalParticipant, useSession, useSessionContext } from '@livekit/components-react';
import { Mic, Settings2 } from 'lucide-react';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { getSandboxTokenSource } from '@/lib/utils';
import { HomeView } from './home-view';
import { IncidentView } from './incident-view';
import { OnboardingWizard } from './onboarding-wizard';
import { PostIncidentView } from './post-incident-view';
import { STORAGE_KEY, type HandFreeConfig, type Mode } from './types';
import { cx } from './ui';

/** Pushes onboarding config to the agent as participant attributes on connect. */
function SessionConfigSync({ config }: { config: HandFreeConfig }) {
  const { isConnected } = useSessionContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!isConnected || !localParticipant) return;
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

const MODES: { value: Mode; label: string }[] = [
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'incident', label: 'Incident' },
  { value: 'post-incident', label: 'Resolved' },
];

function Header({
  mode,
  onMode,
  onEdit,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  onEdit: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1f2024] px-5">
      <div className="flex items-center gap-2.5">
        <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#6e6bf2] to-[#9d6bf2]">
          <Mic className="size-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">HandFree</span>
      </div>

      {/* Demo control: switch surfaces until live incident events are wired in. */}
      <div className="flex items-center gap-1 rounded-xl border border-[#1f2024] bg-[#141518] p-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onMode(m.value)}
            className={cx(
              'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
              mode === m.value
                ? m.value === 'incident'
                  ? 'bg-[#2a1414] text-[#f25555]'
                  : 'bg-[#1a1b1f] text-[#ededef]'
                : 'text-[#6a6a73] hover:text-[#9b9ba3]'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1f2024] px-3 py-1.5 text-[13px] text-[#9b9ba3] transition-colors hover:text-[#ededef]"
      >
        <Settings2 className="size-3.5" />
        Setup
      </button>
    </header>
  );
}

export function HandFreeApp({ appConfig }: { appConfig: AppConfig }) {
  const [config, setConfig] = useState<HandFreeConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>('monitoring');

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

  if (!loaded) return <div className="h-svh bg-[#0a0a0c]" />;
  if (!config) return <OnboardingWizard onComplete={complete} />;

  return (
    <AgentSessionProvider session={session}>
      <SessionConfigSync config={config} />
      <div className="flex h-svh flex-col bg-[#0a0a0c] text-[#ededef]">
        <Header mode={mode} onMode={setMode} onEdit={() => setConfig(null)} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {mode === 'monitoring' && <HomeView config={config} />}
          {mode === 'incident' && <IncidentView config={config} />}
          {mode === 'post-incident' && <PostIncidentView />}
        </div>
      </div>
    </AgentSessionProvider>
  );
}
