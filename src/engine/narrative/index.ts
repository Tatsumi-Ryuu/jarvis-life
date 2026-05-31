export { AgentManager, getAgentManager } from './core/agent-manager';
export { NarrativeOrchestrator, getNarrativeOrchestrator } from './core/narrative-orchestrator';
export { getPersona, getRoleForTask, PERSONAS } from './core/persona-registry';
export {
  getUnreadEvents,
  formatMemorySync,
  formatRelevantEvents,
  formatHighlights,
  buildContextForRole,
  updateCursor,
} from './core/memory-manager';
export { generateDialogue, generateStatusMood } from './generators/dialogue';
export { generateDiary } from './generators/diary';
export { generateTestThinking, generateTestEvaluation } from './generators/test-scenario';
export { generateVerdictReport } from './generators/verdict';
export { generateChronicle } from './generators/chronicle';
export { generateFarewellLetter } from './generators/letter';
export { generateEndgameTestSelection } from './generators/endgame-test-selection';
export {
  generateTest3SceneSetup,
  generateTest3Opponent,
  generateTest3OpponentProfile,
  generateTest3CompanionTurn,
  generateTest3OpponentTurn,
  generateTest3SceneOutcome,
  generateTest3EndingProjection,
} from './generators/test3-playback';
