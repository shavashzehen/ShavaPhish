import type { AssistantState } from '../types/live';

const stateLabel: Record<AssistantState, string> = {
  disconnected: 'Offline',
  connecting: 'Connecting',
  listening: 'Listening',
  speaking: 'Speaking',
};

export function StateOrb({ state }: { state: AssistantState }) {
  return (
    <div className="orb-wrap">
      <div className={`orb orb-${state}`} />
      <p className="state-text">{stateLabel[state]}</p>
    </div>
  );
}
