'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mic } from 'lucide-react';
import {
  DEMO_CONFIG,
  type HandFreeConfig,
  type Integration,
  type MonitorPrefs,
  REPO_OPTIONS,
  type Sensitivity,
} from './types';
import { Card, SystemIcon, T, cx } from './ui';

const OPTIONAL_INTEGRATIONS: { id: Integration; name: string }[] = [
  { id: 'datadog', name: 'Datadog' },
  { id: 'kubernetes', name: 'Kubernetes' },
  { id: 'slack', name: 'Slack' },
  { id: 'pagerduty', name: 'PagerDuty' },
  { id: 'telli', name: 'telli' },
  { id: 'aws', name: 'AWS' },
  { id: 'azure', name: 'Azure' },
  { id: 'gcp', name: 'GCP' },
];

const MONITOR_OPTIONS: { key: keyof MonitorPrefs; label: string }[] = [
  { key: 'deployments', label: 'Deployments' },
  { key: 'pullRequests', label: 'Pull Requests' },
  { key: 'workflowFailures', label: 'Workflow failures' },
  { key: 'kubernetes', label: 'Kubernetes health' },
  { key: 'logs', label: 'Logs' },
  { key: 'metrics', label: 'Metrics' },
];

const SENSITIVITY: { value: Sensitivity; hint: string }[] = [
  { value: 'conservative', hint: 'Only page on confirmed, high-severity issues' },
  { value: 'balanced', hint: 'Investigate anomalies, call when confident' },
  { value: 'aggressive', hint: 'Investigate early and often' },
];

const STEPS = ['Connect GitHub', 'Integrations', 'Monitoring', 'Contacts'];

export function OnboardingWizard({ onComplete }: { onComplete: (c: HandFreeConfig) => void }) {
  const [step, setStep] = useState(0);
  // Prefilled with the demo workspace so testing is one click. (see DEMO_CONFIG)
  const [githubRepo, setGithubRepo] = useState(DEMO_CONFIG.githubRepo);
  const [githubConnected, setGithubConnected] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [monitor, setMonitor] = useState<MonitorPrefs>(DEMO_CONFIG.monitor);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced');
  const [primaryName, setPrimaryName] = useState(DEMO_CONFIG.primaryName);
  const [primaryPhone, setPrimaryPhone] = useState(DEMO_CONFIG.primaryPhone);
  const [backupName, setBackupName] = useState(DEMO_CONFIG.backupName);
  const [backupPhone, setBackupPhone] = useState(DEMO_CONFIG.backupPhone);

  const repoValid = /^[\w.-]+\/[\w.-]+$/.test(githubRepo.trim());
  const canAdvance = step === 0 ? githubConnected && repoValid : true;

  function finish() {
    onComplete({
      githubRepo: githubRepo.trim() || DEMO_CONFIG.githubRepo,
      integrations,
      monitor,
      sensitivity,
      primaryName: primaryName.trim() || 'Primary engineer',
      primaryPhone: primaryPhone.trim(),
      backupName: backupName.trim(),
      backupPhone: backupPhone.trim(),
    });
  }

  function toggleIntegration(id: Integration) {
    setIntegrations((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <main className="grid min-h-svh place-items-center bg-[#0a0a0c] px-6 py-12 text-[#ededef]">
      <div className="w-full max-w-[560px]">
        {/* Brand + progress */}
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#6e6bf2] to-[#9d6bf2] shadow-[0_4px_16px_rgba(110,107,242,0.35)]">
            <Mic className="size-[18px] text-white" />
          </div>
          <div className="text-[20px] font-semibold tracking-tight">HandFree</div>
          <div className="ml-auto flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === step ? 22 : 8,
                  backgroundColor: i <= step ? T.accent : '#26272c',
                }}
              />
            ))}
          </div>
        </div>

        <div className="mb-1 text-[13px] text-[#6a6a73]">
          Step {step + 1} of {STEPS.length}
        </div>
        <h1 className="mb-7 text-[24px] font-semibold tracking-tight">{STEPS[step]}</h1>

        {/* Step body */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-[14px] text-[#9b9ba3]">
              HandFree starts by watching your repository — deployments, PRs, and workflow runs.
            </p>
            <Card className="flex items-center gap-4">
              <SystemIcon id="github" className="size-7 text-[#ededef]" />
              <div className="flex-1">
                <div className="text-[15px] font-medium">GitHub</div>
                <div className="text-[12.5px] text-[#6a6a73]">
                  {githubConnected ? 'Connected' : 'Required'}
                </div>
              </div>
              <button
                onClick={() => setGithubConnected(true)}
                disabled={!repoValid}
                className={cx(
                  'rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
                  githubConnected
                    ? 'bg-[#11281a] text-[#35c98e]'
                    : 'bg-[#6e6bf2] text-white hover:bg-[#5d5ae6] disabled:bg-[#23242b] disabled:text-[#6a6a73]'
                )}
              >
                {githubConnected ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4" /> Connected
                  </span>
                ) : (
                  'Connect'
                )}
              </button>
            </Card>
            <div>
              <select
                className="w-full appearance-none rounded-lg border border-[#1f2024] bg-[#141518] px-3.5 py-2.5 text-[15px] outline-none focus:border-[#6e6bf2]"
                value={githubRepo}
                onChange={(e) => {
                  setGithubRepo(e.target.value);
                  setGithubConnected(false);
                }}
              >
                {REPO_OPTIONS.map((repo) => (
                  <option key={repo} value={repo}>
                    {repo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="mb-4 text-[14px] text-[#9b9ba3]">
              Add the systems HandFree should watch. All optional — connect later anytime.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {OPTIONAL_INTEGRATIONS.map(({ id, name }) => {
                const on = integrations.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleIntegration(id)}
                    className={cx(
                      'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
                      on
                        ? 'border-[#37356f] bg-[#16162a]'
                        : 'border-[#1f2024] bg-[#141518] hover:border-[#2c2d33]'
                    )}
                  >
                    <SystemIcon id={id} className="size-5 text-[#cdcdd2]" />
                    <span className="flex-1 text-[14px] font-medium">{name}</span>
                    <span
                      className={cx(
                        'grid size-5 place-items-center rounded-md border',
                        on ? 'border-[#6e6bf2] bg-[#6e6bf2]' : 'border-[#2c2d33]'
                      )}
                    >
                      {on && <Check className="size-3.5 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-[14px] text-[#9b9ba3]">What should HandFree monitor?</p>
              <div className="grid grid-cols-2 gap-2.5">
                {MONITOR_OPTIONS.map(({ key, label }) => {
                  const on = monitor[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setMonitor((p) => ({ ...p, [key]: !p[key] }))}
                      className={cx(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[14px] transition-colors',
                        on
                          ? 'border-[#37356f] bg-[#16162a]'
                          : 'border-[#1f2024] bg-[#141518] hover:border-[#2c2d33]'
                      )}
                    >
                      <span
                        className={cx(
                          'grid size-4.5 place-items-center rounded border',
                          on ? 'border-[#6e6bf2] bg-[#6e6bf2]' : 'border-[#2c2d33]'
                        )}
                      >
                        {on && <Check className="size-3 text-white" />}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[14px] text-[#9b9ba3]">Sensitivity</p>
              <div className="flex gap-2 rounded-xl border border-[#1f2024] bg-[#141518] p-1.5">
                {SENSITIVITY.map(({ value }) => (
                  <button
                    key={value}
                    onClick={() => setSensitivity(value)}
                    className={cx(
                      'flex-1 rounded-lg py-2 text-[13.5px] font-medium capitalize transition-colors',
                      sensitivity === value
                        ? 'bg-[#6e6bf2] text-white'
                        : 'text-[#9b9ba3] hover:text-[#ededef]'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-[#6a6a73]">
                {SENSITIVITY.find((s) => s.value === sensitivity)?.hint}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <p className="text-[14px] text-[#9b9ba3]">
              Who should HandFree call when it needs a human? It dials these through telli.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Primary engineer"
                value={primaryName}
                onChange={setPrimaryName}
                placeholder="Alex"
              />
              <Field
                label="Phone"
                value={primaryPhone}
                onChange={setPrimaryPhone}
                placeholder="+1 555 010 1234"
                tel
              />
              <Field
                label="Backup engineer"
                value={backupName}
                onChange={setBackupName}
                placeholder="Priya"
              />
              <Field
                label="Phone"
                value={backupPhone}
                onChange={setBackupPhone}
                placeholder="+1 555 010 9876"
                tel
              />
            </div>
            <Card className="flex items-center gap-3 py-4">
              <SystemIcon id="telli" className="size-5 text-[#a5a3f8]" />
              <div className="flex-1 text-[13.5px] text-[#9b9ba3]">telli outbound calling</div>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#a5a3f8]">
                <span className="size-1.5 rounded-full bg-[#a5a3f8]" /> Ready
              </span>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="mt-9 flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? onComplete(DEMO_CONFIG) : setStep((s) => s - 1))}
            className="inline-flex items-center gap-1.5 text-[13.5px] text-[#6a6a73] transition-colors hover:text-[#9b9ba3]"
          >
            {step === 0 ? (
              'Skip — use demo workspace'
            ) : (
              <>
                <ArrowLeft className="size-4" /> Back
              </>
            )}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canAdvance && setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6e6bf2] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#5d5ae6] disabled:cursor-not-allowed disabled:bg-[#23242b] disabled:text-[#6a6a73]"
            >
              Continue <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6e6bf2] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#5d5ae6]"
            >
              Finish <Check className="size-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  tel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tel?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-[#9b9ba3]">{label}</span>
      <input
        className="w-full rounded-lg border border-[#1f2024] bg-[#141518] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[#585860] focus:border-[#6e6bf2]"
        value={value}
        placeholder={placeholder}
        inputMode={tel ? 'tel' : undefined}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
