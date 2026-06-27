'use client';

import { useState } from 'react';
import {
  useLocalParticipant,
  useSessionContext,
  useSessionMessages,
  useVoiceAssistant,
} from '@livekit/components-react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  X,
} from 'lucide-react';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { DEMO_TRANSCRIPT, type Turn } from './mock-data';
import { Pulse, T } from './ui';
import type { HandFreeConfig } from './types';

/**
 * A bottom call dock. Collapsed it's a slim bar (status + waveform + quick
 * approve/decline); expanded it slides up into the full live transcript. Lives
 * on the incident screen so the call stays out of the way until needed.
 */
export function VoiceDock({ config }: { config: HandFreeConfig }) {
  const [open, setOpen] = useState(true);
  const session = useSessionContext();
  const { state, audioTrack } = useVoiceAssistant();
  const { messages } = useSessionMessages(session);
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const connected = session.isConnected;
  const turns: Turn[] = connected
    ? messages.map((m) => ({ who: m.from?.isLocal ? 'engineer' : 'ai', text: m.message }))
    : DEMO_TRANSCRIPT;

  const statusText = connected ? 'On a call' : `Calling ${config.primaryName || 'engineer'}…`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 lg:right-[300px]">
      <div className="pointer-events-auto mx-auto max-w-3xl">
        {open ? (
          /* ---- Expanded drawer ---- */
          <div className="overflow-hidden rounded-2xl border border-[#262732] bg-[#141518] shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-[#1f2024] px-5 py-3">
              <span className="inline-flex items-center gap-2.5 text-[13px] font-semibold tracking-tight">
                <Pulse color={T.accent} size={8} />
                Voice · {statusText}
              </span>
              <div className="flex items-center gap-1.5">
                {connected && (
                  <button
                    onClick={() => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled)}
                    className={
                      isMicrophoneEnabled
                        ? 'grid size-8 place-items-center rounded-lg text-[#9b9ba3] hover:text-[#ededef]'
                        : 'grid size-8 place-items-center rounded-lg bg-[#2a2410] text-[#e3b341]'
                    }
                    title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
                  >
                    {isMicrophoneEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="grid size-8 place-items-center rounded-lg text-[#9b9ba3] hover:text-[#ededef]"
                  title="Collapse"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center pt-4 pb-1">
              <AgentAudioVisualizerBar
                size="sm"
                state={connected ? state : 'speaking'}
                audioTrack={audioTrack}
                barCount={7}
                color={T.accent as `#${string}`}
              />
            </div>

            <div className="max-h-[34vh] space-y-3 overflow-y-auto px-5 py-4">
              {turns.map((t, i) => (
                <div key={i} className={t.who === 'engineer' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      t.who === 'engineer'
                        ? 'max-w-[82%] rounded-2xl rounded-br-sm bg-[#6e6bf2] px-3.5 py-2 text-[14px] font-medium text-white'
                        : 'max-w-[82%] rounded-2xl rounded-bl-sm border border-[#1f2024] bg-[#0e0f12] px-3.5 py-2 text-[14px] text-[#dcdce0]'
                    }
                  >
                    {t.who === 'ai' && (
                      <span className="mb-0.5 block text-[11px] font-semibold tracking-wide text-[#a5a3f8] uppercase">
                        HandFree
                      </span>
                    )}
                    {t.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 border-t border-[#1f2024] px-4 py-3">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#11281a] py-2.5 text-[13.5px] font-semibold text-[#35c98e] transition-colors hover:bg-[#143620]">
                <Check className="size-4" /> Approve rollback
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1f2024] py-2.5 text-[13.5px] font-semibold text-[#9b9ba3] transition-colors hover:text-[#ededef]">
                <X className="size-4" /> Decline
              </button>
              <CallButton connected={connected} onStart={() => session.start()} onEnd={() => session.end()} />
            </div>
          </div>
        ) : (
          /* ---- Collapsed bar ---- */
          <div className="flex items-center gap-3 rounded-2xl border border-[#262732] bg-[#141518] px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <span className="inline-flex items-center gap-2.5 text-[13px] font-medium text-[#a5a3f8]">
              <Pulse color={T.accent} size={8} />
              {statusText}
            </span>
            <div className="ml-1 hidden sm:block">
              <AgentAudioVisualizerBar
                size="icon"
                state={connected ? state : 'speaking'}
                audioTrack={audioTrack}
                barCount={5}
                color={T.accent as `#${string}`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="hidden items-center gap-1.5 rounded-lg bg-[#11281a] px-3 py-1.5 text-[12.5px] font-semibold text-[#35c98e] sm:inline-flex">
                <Check className="size-3.5" /> Approve
              </button>
              <button
                onClick={() => setOpen(true)}
                className="grid size-8 place-items-center rounded-lg text-[#9b9ba3] hover:text-[#ededef]"
                title="Expand"
              >
                <ChevronUp className="size-4" />
              </button>
              <CallButton
                connected={connected}
                small
                onStart={() => session.start()}
                onEnd={() => session.end()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CallButton({
  connected,
  small,
  onStart,
  onEnd,
}: {
  connected: boolean;
  small?: boolean;
  onStart: () => void;
  onEnd: () => void;
}) {
  const size = small ? 'size-8' : 'size-11';
  if (connected) {
    return (
      <button
        onClick={onEnd}
        className={`grid ${size} place-items-center rounded-full bg-[#b3261e] text-white hover:bg-[#9e211a]`}
        title="End call"
      >
        <PhoneOff className={small ? 'size-4' : 'size-5'} />
      </button>
    );
  }
  return (
    <button
      onClick={onStart}
      className={`grid ${size} place-items-center rounded-full bg-[#6e6bf2] text-white hover:bg-[#5d5ae6]`}
      title="Call engineer"
    >
      <PhoneCall className={small ? 'size-4' : 'size-5'} />
    </button>
  );
}
