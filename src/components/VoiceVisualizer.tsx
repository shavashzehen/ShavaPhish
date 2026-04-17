import type { AssistantState } from '../types/live';

export function VoiceVisualizer({ state }: { state: AssistantState }) {
  const active = state === 'listening' || state === 'speaking';

  return (
    <div className={`visualizer ${active ? 'active' : ''} ${state === 'speaking' ? 'speaking' : ''}`}>
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={`bar-${index}`} style={{ animationDelay: `${index * 120}ms` }} />
      ))}
    </div>
  );
}
