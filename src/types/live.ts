export type AssistantState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}
