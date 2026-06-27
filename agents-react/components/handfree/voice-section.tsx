'use client';

import {
  useLocalParticipant,
  useSessionContext,
  useSessionMessages,
  useVoiceAssistant,
} from '@livekit/components-react';
import { Check, Mic, MicOff, PhoneCall, PhoneOff, X } from 'lucide-react';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { DEMO_TRANSCRIPT, type Turn } from './mock-data';
import { Card, Pulse, SectionLabel, T } from './ui';
import type { HandFreeConfig } from './types';

export function VoiceSection({ config }: { config: HandFreeConfig }) {
  const session = useSessionContext();
  const { state, audioTrack } = useVoiceAssistant();
  const { messages } = useSessionMessages(session);
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const connected = session.isConnected;

  // Live transcript when connected, otherwise the scripted demo conversation.
  const turns: Turn[] = connected
    ? messages.map((m) => ({ who: m.from?.isLocal ? 'engineer' : 'ai', text: m.message }))
    : DEMO_TRANSCRIPT;

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <SectionLabel>Voice</SectionLabel>
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#a5a3f8]">
          <Pulse color={T.accent} size={8} />
          {connected ? 'On a call' : `Calling ${config.primaryName || 'engineer'}…`}
        </span>
      </div>

      {/* Waveform */}
      <div className="flex items-center justify-center py-2">
        <AgentAudioVisualizerBar
          size="md"
          state={connected ? state : 'speaking'}
          audioTrack={audioTrack}
          barCount={7}
          color={T.accent as `#${string}`}
        />
      </div>

      {/* Transcript */}
      <div className="space-y-3">
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

      {/* Controls / approval */}
      {connected ? (
        <div className="flex items-center justify-center gap-3 border-t border-[#1f2024] pt-4">
          <button
            onClick={() => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled)}
            className={
              isMicrophoneEnabled
                ? 'grid size-11 place-items-center rounded-full border border-[#1f2024] bg-[#141518] text-[#ededef] hover:bg-[#1a1b1f]'
                : 'grid size-11 place-items-center rounded-full border border-[#5c4a13] bg-[#2a2410] text-[#e3b341]'
            }
          >
            {isMicrophoneEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button
            onClick={() => session.end()}
            className="grid size-11 place-items-center rounded-full bg-[#b3261e] text-white hover:bg-[#9e211a]"
          >
            <PhoneOff className="size-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 border-t border-[#1f2024] pt-4">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#11281a] py-2.5 text-[14px] font-semibold text-[#35c98e] transition-colors hover:bg-[#143620]">
            <Check className="size-4" /> Approve rollback
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1f2024] bg-[#141518] py-2.5 text-[14px] font-semibold text-[#9b9ba3] transition-colors hover:text-[#ededef]">
            <X className="size-4" /> Decline
          </button>
          <button
            onClick={() => session.start()}
            className="grid size-11 place-items-center rounded-full bg-[#6e6bf2] text-white hover:bg-[#5d5ae6]"
            title="Call engineer now"
          >
            <PhoneCall className="size-5" />
          </button>
        </div>
      )}
    </Card>
  );
}
