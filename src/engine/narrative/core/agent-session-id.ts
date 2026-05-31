import type { AgentRole, SaveId } from '../../../types';

export function getAgentSessionId(saveId: SaveId, role: AgentRole): string {
  return `${saveId}--${role}`;
}
