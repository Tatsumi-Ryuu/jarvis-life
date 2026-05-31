import type { EventMemoryAnalysis, EventType, FullGameState, NarrativeTask, SaveId } from '../../../types';
import { getCurrentSaveId } from '../../../services/save-service';
import { buildDiaryArchiveContext, persistDiaryEntry, readFinalizedDiary } from '../../../services/diary-service';
import { getAgentManager } from './agent-manager';
import { getMemoryFileService, wrapMarkdownFile, type MemoryFrontmatter } from '../../../services/memory-file-service';
import { updateMemoryIndex } from '../../../services/memory-archive-service';
import { useAIStore } from '../../../store/aiStore';
import {
  generateEventAction,
  generateEventDialogue,
  generateEventOutcome,
  generateEventResponse,
  generateEventResponseAction,
  generateEventScene,
} from '../generators/event-generator';

export interface EventFlowInput {
  eventTitle: string;
  eventType: EventType;
  location: string;
  context: string;
  playerInput: string;
  gameState: FullGameState;
}

export interface CompanionActionResult {
  spokenReply: string;
  internalUnderstanding: string;
  intendedAction: string;
  memoryCandidate: string;
}

export interface EventFlowResult {
  scene: string;
  dialogue: string;
  response: string;
  action: CompanionActionResult;
  outcome: string;
  analysis: EventMemoryAnalysis | null;
}

export interface MonthlyArchiveInput {
  month: number;
  gameState: FullGameState;
  saveId?: SaveId;
}

const archiveLocks = new Map<string, Promise<boolean>>();

export class NarrativeOrchestrator {
  async getEventScene(
    eventTitle: string,
    eventType: EventType,
    location: string,
    context: string,
    gameState: FullGameState,
  ): Promise<string> {
    return generateEventScene(eventTitle, eventType, location, context, gameState);
  }

  async getEventDialogue(
    eventType: EventType,
    location: string,
    sceneContext: string,
    gameState: FullGameState,
  ): Promise<string> {
    return generateEventDialogue(eventType, location, sceneContext, gameState);
  }

  async getEventResponse(
    eventType: EventType,
    location: string,
    playerInput: string,
    gameState: FullGameState,
  ): Promise<string> {
    return generateEventResponse(eventType, location, playerInput, gameState);
  }

  async getEventResponseAction(
    eventType: EventType,
    location: string,
    sceneContext: string,
    playerInput: string,
    gameState: FullGameState,
  ): Promise<CompanionActionResult> {
    const actionText = await generateEventResponseAction(eventType, location, sceneContext, playerInput, gameState);
    return parseCompanionActionResult(actionText, '');
  }

  async getEventAction(
    eventType: EventType,
    location: string,
    sceneContext: string,
    playerInput: string,
    gameState: FullGameState,
  ): Promise<CompanionActionResult> {
    const actionText = await generateEventAction(eventType, location, sceneContext, playerInput, gameState);
    return parseCompanionActionResult(actionText, '');
  }

  async getEventOutcome(
    eventTitle: string,
    eventType: EventType,
    location: string,
    sceneContext: string,
    playerInput: string,
    action: string | CompanionActionResult,
    gameState: FullGameState,
  ): Promise<string> {
    const intendedAction = typeof action === 'string' ? action : action.intendedAction;
    return generateEventOutcome(eventTitle, eventType, location, sceneContext, playerInput, intendedAction, gameState);
  }

  async runEventFlow(input: EventFlowInput): Promise<EventFlowResult> {
    const scene = await this.getEventScene(
      input.eventTitle,
      input.eventType,
      input.location,
      input.context,
      input.gameState,
    );

    const dialogue = await this.getEventDialogue(
      input.eventType,
      input.location,
      scene,
      input.gameState,
    );

    const action = await this.getEventResponseAction(
      input.eventType,
      input.location,
      scene,
      input.playerInput,
      input.gameState,
    );
    const response = action.spokenReply;

    const outcome = await this.getEventOutcome(
      input.eventTitle,
      input.eventType,
      input.location,
      scene,
      input.playerInput,
      action.intendedAction,
      input.gameState,
    );

    const analysis = await this.runEventAnalysis({
      type: 'event-analysis',
      eventTitle: input.eventTitle,
      eventType: input.eventType,
      location: input.location,
      sceneContext: scene,
      playerInput: input.playerInput,
      aiAction: action.intendedAction,
      outcomeText: outcome,
    }, input.gameState);

    return {
      scene,
      dialogue,
      response,
      action,
      outcome,
      analysis,
    };
  }

  async archiveMonth(input: MonthlyArchiveInput): Promise<boolean> {
    const saveId = input.saveId ?? getCurrentSaveId();
    if (!saveId) return false;
    const lockKey = `${saveId}:${input.month}`;
    const pending = archiveLocks.get(lockKey);
    if (pending) return pending;

    const promise = this.createMonthArchive(input, saveId);
    archiveLocks.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      archiveLocks.delete(lockKey);
    }
  }

  private async createMonthArchive(input: MonthlyArchiveInput, saveId: SaveId): Promise<boolean> {
    const existingDiary = await readFinalizedDiary(input.month, saveId);
    if (existingDiary) {
      await this.persistCompanionMemory(input.month, existingDiary, saveId);
      return true;
    }

    const archiveContext = buildDiaryArchiveContext(input.month, saveId);
    if (!archiveContext.trim()) return false;

    try {
      const result = await getAgentManager().generateWithFallback(
        {
          type: 'diary',
          month: input.month,
          archiveContext,
        },
        input.gameState,
        archiveContext,
        saveId,
      );

      if (!await persistDiaryEntry(input.month, result.text, saveId)) return false;

      await this.persistCompanionMemory(input.month, result.text, saveId);
      return true;
    } catch (error) {
      console.error('[NarrativeOrchestrator] Monthly archive failed:', error);
      return false;
    }
  }

  private async persistCompanionMemory(month: number, text: string, saveId: SaveId): Promise<void> {
    const service = getMemoryFileService();
    const filename = `${String(month).padStart(4, '0')}.md`;

    const existing = await service.read('companion', filename, saveId);
    if (existing) return;

    const sourceIds = useAIStore.getState().eventLog
      .filter((e) => (!e.saveId || e.saveId === saveId) && e.month === month && (e.emotionalImpact ?? 0) >= 7)
      .map((e) => e.id);

    const frontmatter: MemoryFrontmatter = {
      schema_version: 1,
      save_id: saveId,
      role: 'companion',
      memory_type: 'monthly',
      month,
      source_event_ids: sourceIds,
      updated_at: new Date().toISOString(),
    };

    const writeResult = await service.write('companion', filename, wrapMarkdownFile(frontmatter, text), saveId);
    if (!writeResult.ok) {
      console.warn(`[NarrativeOrchestrator] Failed to write companion memory ${filename}: ${writeResult.error}`);
      return;
    }

    await updateMemoryIndex(service, saveId).catch((err) => {
      console.warn('[NarrativeOrchestrator] Failed to update memory index:', err);
    });
  }

  async runEventAnalysis(
    task: Extract<NarrativeTask, { type: 'event-analysis' }>,
    gameState: FullGameState,
  ): Promise<EventMemoryAnalysis | null> {
    const result = await getAgentManager().generateWithFallback(task, gameState, '');
    if (!result.text.trim()) return null;
    return parseEventMemoryAnalysis(result.text);
  }
}

function parseCompanionActionResult(raw: string, spokenReply: string): CompanionActionResult {
  const parsed = parseJsonObject(raw);
  if (parsed) {
    const parsedSpokenReply = stringField(parsed, 'spokenReply') || stringField(parsed, 'chat');
    const parsedIntendedAction = stringField(parsed, 'intendedAction') || stringField(parsed, 'action');

    return {
      spokenReply: parsedSpokenReply || spokenReply,
      internalUnderstanding: stringField(parsed, 'internalUnderstanding') || stringField(parsed, 'understanding'),
      intendedAction: parsedIntendedAction || raw,
      memoryCandidate: stringField(parsed, 'memoryCandidate') || stringField(parsed, 'memory'),
    };
  }

  return {
    spokenReply,
    internalUnderstanding: '',
    intendedAction: raw,
    memoryCandidate: '',
  };
}

function parseEventMemoryAnalysis(raw: string): EventMemoryAnalysis | null {
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;

  return {
    personalityDeltas: typeof parsed.personalityDeltas === 'object' && parsed.personalityDeltas !== null
      ? parsed.personalityDeltas as EventMemoryAnalysis['personalityDeltas']
      : {},
    memoryTags: Array.isArray(parsed.memoryTags) ? parsed.memoryTags.filter((item): item is string => typeof item === 'string') : [],
    relationshipSignal: stringField(parsed, 'relationshipSignal'),
    companionMemory: stringField(parsed, 'companionMemory'),
    diaryCandidate: parsed.diaryCandidate === true,
    endingForeshadow: stringField(parsed, 'endingForeshadow'),
  };
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

let orchestrator: NarrativeOrchestrator | null = null;

export function getNarrativeOrchestrator(): NarrativeOrchestrator {
  orchestrator ??= new NarrativeOrchestrator();
  return orchestrator;
}
