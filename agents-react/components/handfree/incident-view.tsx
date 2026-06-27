'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, Check, ChevronRight, Loader2 } from 'lucide-react';
import {
  HYPOTHESIS,
  INVESTIGATION,
  RECOMMENDATIONS,
  type Recommendation,
} from './mock-data';
import { ThinkingPanel } from './thinking-panel';
import { Card, SectionLabel, SystemIcon, T } from './ui';
import { VoiceSection } from './voice-section';
import type { HandFreeConfig } from './types';

export function IncidentView({ config }: { config: HandFreeConfig }) {
  // Reveal investigation steps one at a time so the pipeline feels live.
  const total = INVESTIGATION.length + 1; // + hypothesis
  const [revealed, setRevealed] = useState(1);

  useEffect(() => {
    if (revealed >= total) return;
    const id = setTimeout(() => setRevealed((r) => r + 1), 1100);
    return () => clearTimeout(id);
  }, [revealed, total]);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-[#4a1d1d] bg-gradient-to-r from-[#1f1011] to-[#141518] p-6">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-40 opacity-30 blur-2xl"
              style={{ background: `radial-gradient(circle, ${T.red}, transparent 70%)` }}
            />
            <div className="relative flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-[#2a1414]">
                <AlertTriangle className="size-6 text-[#f25555]" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[12px] font-bold tracking-widest text-[#f25555] uppercase">
                    Incident detected
                  </span>
                  <span className="rounded-md bg-[#2a1414] px-2 py-0.5 text-[11px] font-semibold text-[#f25555]">
                    Severity High
                  </span>
                </div>
                <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Checkout API</h1>
              </div>
              <div className="text-right text-[13px] text-[#9b9ba3]">
                <div className="font-medium text-[#ededef]">Started 2 minutes ago</div>
                <div className="text-[#6a6a73]">09:41 · {config.githubRepo.split('/')[1]}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[1.25fr_1fr]">
            {/* Investigation pipeline */}
            <div>
              <SectionLabel>AI investigation</SectionLabel>
              <div className="space-y-3">
                {INVESTIGATION.map((step, i) => (
                  <PipelineStep
                    key={step.id}
                    icon={step.id}
                    label={step.label}
                    finding={step.finding}
                    done={step.done}
                    state={i < revealed ? 'done' : i === revealed ? 'active' : 'pending'}
                    connector={i < INVESTIGATION.length - 1 || revealed >= total - 1}
                  />
                ))}

                {revealed >= total && (
                  <Card className="border-[#37356f] bg-[#16162a]">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold tracking-wide text-[#a5a3f8] uppercase">
                        Hypothesis
                      </span>
                      <span className="text-[13px] font-bold text-[#a5a3f8]">
                        {HYPOTHESIS.confidence}% confidence
                      </span>
                    </div>
                    <p className="mt-2 text-[15px] font-medium text-[#ededef]">
                      {HYPOTHESIS.statement}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#23242b]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6e6bf2] to-[#9d6bf2]"
                        style={{ width: `${HYPOTHESIS.confidence}%` }}
                      />
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Recommendations + voice */}
            <div className="space-y-7">
              <div>
                <SectionLabel>Recommendations</SectionLabel>
                <div className="space-y-3">
                  {RECOMMENDATIONS.map((r) => (
                    <RecommendationCard key={r.label} rec={r} />
                  ))}
                </div>
              </div>

              <VoiceSection config={config} />
            </div>
          </div>
        </div>
      </div>

      <ThinkingPanel />
    </div>
  );
}

function PipelineStep({
  icon,
  label,
  finding,
  done,
  state,
  connector,
}: {
  icon: string;
  label: string;
  finding: string;
  done: boolean;
  state: 'done' | 'active' | 'pending';
  connector: boolean;
}) {
  const isActive = state === 'active';
  const isPending = state === 'pending';
  return (
    <div className="relative">
      <Card
        className="flex items-start gap-3.5 p-4 transition-opacity"
        style={{ opacity: isPending ? 0.4 : 1 }}
      >
        <span
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full"
          style={{
            backgroundColor: state === 'done' ? '#11281a' : isActive ? '#16162a' : '#1a1b1f',
          }}
        >
          {state === 'done' ? (
            <Check className="size-4 text-[#35c98e]" />
          ) : isActive ? (
            <Loader2 className="size-4 animate-spin text-[#a5a3f8]" />
          ) : (
            <SystemIcon id={icon} className="size-4 text-[#6a6a73]" />
          )}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <SystemIcon id={icon} className="size-4 text-[#9b9ba3]" />
            <span className="text-[14.5px] font-medium">{label}</span>
            <ChevronRight className="ml-auto size-4 text-[#3a3b42]" />
          </div>
          {state === 'done' && done && (
            <p className="mt-1.5 text-[13px] text-[#9b9ba3]">{finding}</p>
          )}
          {isActive && <p className="mt-1.5 text-[13px] text-[#6a6a73]">Analyzing…</p>}
        </div>
      </Card>
      {connector && (
        <div className="flex justify-center py-0.5 text-[#2c2d33]">
          <ArrowDown className="size-3.5" />
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Card
      className={
        rec.primary
          ? 'border-[#37356f] bg-[#16162a] p-4'
          : 'p-4 transition-colors hover:border-[#2c2d33]'
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{rec.label}</span>
        <span
          className="text-[15px] font-semibold tabular-nums"
          style={{ color: rec.primary ? T.accentSoft : T.textDim }}
        >
          {rec.confidence}%
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#23242b]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${rec.confidence}%`,
            background: rec.primary ? `linear-gradient(90deg, ${T.accent}, #9d6bf2)` : '#3a3b42',
          }}
        />
      </div>
      {rec.primary && (
        <button className="mt-3.5 w-full rounded-lg bg-[#6e6bf2] py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#5d5ae6]">
          Approve &amp; execute
        </button>
      )}
    </Card>
  );
}
