'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { THINKING } from './mock-data';
import { Pulse, T } from './ui';

export function ThinkingPanel() {
  // Reveal thinking lines one by one, then keep the latest few — makes the AI
  // feel like it is continuously reasoning in the background.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  const visible = THINKING.slice(0, Math.min(THINKING.length, (tick % (THINKING.length + 2)) + 1));

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-[#1f2024] bg-[#0c0d10] p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-[#a5a3f8]" />
        <span className="text-[13px] font-semibold tracking-tight">What HandFree is doing</span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-[#a5a3f8]">
        <Pulse color={T.accent} size={7} />
        <span className="animate-pulse">Thinking…</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {visible.map((line, i) => (
          <div
            key={`${tick}-${i}`}
            className="flex items-start gap-2.5 rounded-lg border border-[#1a1b1f] bg-[#121317] px-3 py-2.5 text-[13px] text-[#bcbcc2]"
            style={{ opacity: i === visible.length - 1 ? 1 : 0.6 }}
          >
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#6e6bf2]" />
            {line}
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-xl border border-[#1f2024] bg-[#121317] p-3.5 text-[12.5px] leading-relaxed text-[#6a6a73]">
        HandFree reasons over your systems continuously and only interrupts you
        when a human decision is genuinely required.
      </div>
    </aside>
  );
}
