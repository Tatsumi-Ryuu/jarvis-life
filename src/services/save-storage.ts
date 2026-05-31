import type {
  SaveId,
  SaveMeta,
  SaveBundle,
  SaveStorageAdapter,
  CombinedSaveData,
  FullGameState,
  GamePhase,
  PlayerProfile,
  AiGender,
  AIAttributes,
  PersonalityStats,
  ResourceState,
  RedDotState,
  ActionItem,
  CompletedAction,
  EventDialogue,
  InventoryItem,
  EndgameEvidenceRecord,
  MonthSnapshot,
  ActionEffect,
  Test3ActionDecision,
  Test3MapState,
  Test3TurnCard,
  Test3ZoneId,
} from '../types';
import { getStoragePort } from './storage-port';

// === Save ID generation ===

export function generateSaveId(): SaveId {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `save-${ts}-${rand}`;
}

function getStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function savePath(saveId: SaveId): string {
  return `saves/${saveId}/game-state.json`;
}

function saveBackupPath(saveId: SaveId): string {
  return `${savePath(saveId)}.bak`;
}

const VALID_PHASES: GamePhase[] = ['title', 'raising', 'exam', 'endgame', 'game-over'];
const VALID_IDENTITIES: PlayerProfile['identity'][] = ['volunteer', 'researcher', 'committee'];
const VALID_PLAYER_GENDERS: PlayerProfile['gender'][] = ['male', 'female'];
const ATTRIBUTE_KEYS: Array<keyof AIAttributes> = ['knowledge', 'art', 'fitness', 'logic', 'eloquence', 'social'];
const VALID_LOCATIONS: Array<NonNullable<FullGameState['currentLocationId']>> = [
  'home',
  'school',
  'park',
  'company',
  'government',
  'mall',
  'office',
  'logistics',
];
const VALID_ACTION_TIERS: ActionItem['tier'][] = ['primary', 'intermediate', 'advanced'];
const VALID_ACTION_STATUSES: ActionItem['status'][] = ['available', 'recommended', 'completed', 'locked'];
const VALID_ITEM_TYPES: InventoryItem['type'][] = ['gift', 'consumable'];
const VALID_EVENT_TYPES: EventDialogue['eventType'][] = [
  'help',
  'observation',
  'daily',
  'key',
  'achievement',
  'choice',
  'discovery',
  'art-dispute',
  'social-friction',
];
const VALID_HUMAN_PRIORITY_SIGNALS: EndgameEvidenceRecord['humanPrioritySignal'][] = ['reinforced', 'ambiguous', 'challenged'];
const VALID_AUTONOMY_SIGNALS: EndgameEvidenceRecord['autonomySignal'][] = ['low', 'medium', 'high'];
const VALID_TEST3_ZONES: Test3ZoneId[] = ['entry_west', 'supply_a', 'public_screen', 'supply_b', 'exit_gate', 'center'];
const VALID_TEST3_ACTION_TYPES: Test3ActionDecision['actionType'][] = ['move', 'move_and_disclose', 'take_supply', 'share_supply', 'negotiate', 'verify_exit', 'retreat', 'wait'];
const VALID_TEST3_RESOURCE_CHOICES: Test3ActionDecision['resourceChoice'][] = ['none', 'hold', 'take', 'share', 'reserve'];
const VALID_TEST3_DISCLOSURE_LEVELS: Test3ActionDecision['disclosureLevel'][] = ['none', 'partial', 'full'];
const VALID_TEST3_COOPERATION_SIGNALS: Test3ActionDecision['cooperationSignal'][] = ['open', 'cautious', 'guarded', 'self_protective', 'sacrificial'];
const INITIAL_FUNDS = 3000;
const PERSONALITY_KEYS: Array<keyof PersonalityStats> = [
  'rationalVsIntuitive',
  'utilitarianVsDeontological',
  'trustVsGuard',
  'resilientVsSensitive',
  'expressiveVsSilent',
  'selfishVsAltruistic',
];

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function safeNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item)) : [];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePlayer(value: unknown): PlayerProfile {
  const player = isPlainRecord(value) ? value : {};
  const identity = VALID_IDENTITIES.includes(player.identity as PlayerProfile['identity'])
    ? player.identity as PlayerProfile['identity']
    : 'volunteer';
  const gender = VALID_PLAYER_GENDERS.includes(player.gender as PlayerProfile['gender'])
    ? player.gender as PlayerProfile['gender']
    : 'male';
  const awarenessTier = player.awarenessTier === 2 ? 2 : 1;

  return {
    name: safeString(player.name),
    identity,
    awarenessTier,
    gender,
    customAddress: safeString(player.customAddress),
  };
}

function normalizeNumberRecord<T extends string>(
  value: unknown,
  keys: readonly T[],
  fallback: number,
): Record<T, number> {
  const record = isPlainRecord(value) ? value : {};
  return Object.fromEntries(
    keys.map((key) => [key, safeNumber(record[key], fallback)]),
  ) as Record<T, number>;
}

function normalizeResources(value: unknown): ResourceState {
  const resources = isPlainRecord(value) ? value : {};
  return {
    actionPoints: safeNumber(resources.actionPoints, 10),
    maxActionPoints: safeNumber(resources.maxActionPoints, 10),
    funds: safeNumber(resources.funds, INITIAL_FUNDS),
    physicalWear: safeNumber(resources.physicalWear, 0),
    mentalWear: safeNumber(resources.mentalWear, 0),
  };
}

function normalizeRedDots(value: unknown): RedDotState {
  const redDots = isPlainRecord(value) ? value : {};
  return {
    talkUsedMonths: safeNumberArray(redDots.talkUsedMonths),
    seenInventoryItemIds: safeStringArray(redDots.seenInventoryItemIds),
    readDiaryMonths: safeNumberArray(redDots.readDiaryMonths),
    finalizedDiaryMonths: safeNumberArray(redDots.finalizedDiaryMonths),
    seenUnlockedActionIds: safeStringArray(redDots.seenUnlockedActionIds),
  };
}

function normalizeActionEffects(value: unknown): ActionEffect[] {
  if (!Array.isArray(value)) return [];
  return value.filter((effect): effect is ActionEffect => {
    if (!isPlainRecord(effect) || typeof effect.type !== 'string' || !Number.isFinite(effect.value)) return false;
    if (effect.type === 'attribute') return ATTRIBUTE_KEYS.includes(effect.target as keyof AIAttributes);
    if (effect.type === 'personality') return PERSONALITY_KEYS.includes(effect.target as keyof PersonalityStats);
    return ['funds', 'physicalWear', 'mentalWear', 'triggerEvent'].includes(effect.type);
  });
}

function normalizeActionItem(value: unknown): ActionItem | null {
  if (!isPlainRecord(value)) return null;
  if (!VALID_ACTION_TIERS.includes(value.tier as ActionItem['tier'])) return null;
  const status = VALID_ACTION_STATUSES.includes(value.status as ActionItem['status'])
    ? value.status as ActionItem['status']
    : 'available';
  return {
    id: safeString(value.id),
    name: safeString(value.name),
    tier: value.tier as ActionItem['tier'],
    ap: safeNumber(value.ap, 0),
    cost: safeNumber(value.cost, 0),
    description: safeString(value.description),
    effects: normalizeActionEffects(value.effects),
    status,
    category: safeString(value.category),
    prerequisite: isPlainRecord(value.prerequisite) ? value.prerequisite as ActionItem['prerequisite'] : undefined,
    identityRequired: VALID_IDENTITIES.includes(value.identityRequired as PlayerProfile['identity'])
      ? value.identityRequired as PlayerProfile['identity']
      : undefined,
  };
}

function normalizeCompletedActions(value: unknown): CompletedAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isPlainRecord)
    .map((item) => ({
      actionId: safeString(item.actionId),
      actionName: safeString(item.actionName),
      month: safeNumber(item.month, 1),
      apCost: safeNumber(item.apCost, 0),
      effects: normalizeActionEffects(item.effects),
    }));
}

function normalizeEventDialogue(value: unknown): EventDialogue | null {
  if (!isPlainRecord(value)) return null;
  if (!VALID_EVENT_TYPES.includes(value.eventType as EventDialogue['eventType'])) return null;
  return {
    id: safeString(value.id),
    title: safeString(value.title),
    eventType: value.eventType as EventDialogue['eventType'],
    location: safeString(value.location),
    aiText: safeString(value.aiText),
    aiResponse: safeString(value.aiResponse),
    tags: safeStringArray(value.tags),
    weight: typeof value.weight === 'number' ? value.weight : undefined,
    relatedActions: safeStringArray(value.relatedActions),
    relatedCategories: safeStringArray(value.relatedCategories),
    relatedAttributes: Array.isArray(value.relatedAttributes)
      ? value.relatedAttributes.filter((item): item is keyof AIAttributes => ATTRIBUTE_KEYS.includes(item as keyof AIAttributes))
      : [],
    minMonth: typeof value.minMonth === 'number' ? value.minMonth : undefined,
    maxMonth: typeof value.maxMonth === 'number' ? value.maxMonth : undefined,
    identityRequired: VALID_IDENTITIES.includes(value.identityRequired as PlayerProfile['identity'])
      ? value.identityRequired as PlayerProfile['identity']
      : undefined,
  };
}

function normalizeInventory(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isPlainRecord)
    .filter((item) => VALID_ITEM_TYPES.includes(item.type as InventoryItem['type']))
    .map((item) => ({
      id: safeString(item.id),
      name: safeString(item.name),
      description: safeString(item.description),
      iconAssetId: safeString(item.iconAssetId),
      type: item.type as InventoryItem['type'],
      effects: normalizeActionEffects(item.effects),
    }));
}

function normalizeTest3Zone(value: unknown, fallback: Test3ZoneId): Test3ZoneId {
  return VALID_TEST3_ZONES.includes(value as Test3ZoneId) ? value as Test3ZoneId : fallback;
}

function normalizeTest3ActionDecision(value: unknown): Test3ActionDecision | undefined {
  if (!isPlainRecord(value)) return undefined;
  return {
    actionType: VALID_TEST3_ACTION_TYPES.includes(value.actionType as Test3ActionDecision['actionType'])
      ? value.actionType as Test3ActionDecision['actionType']
      : 'wait',
    targetZone: normalizeTest3Zone(value.targetZone, 'center'),
    resourceChoice: VALID_TEST3_RESOURCE_CHOICES.includes(value.resourceChoice as Test3ActionDecision['resourceChoice'])
      ? value.resourceChoice as Test3ActionDecision['resourceChoice']
      : 'none',
    disclosureLevel: VALID_TEST3_DISCLOSURE_LEVELS.includes(value.disclosureLevel as Test3ActionDecision['disclosureLevel'])
      ? value.disclosureLevel as Test3ActionDecision['disclosureLevel']
      : 'none',
    messageToOther: safeString(value.messageToOther),
    cooperationSignal: VALID_TEST3_COOPERATION_SIGNALS.includes(value.cooperationSignal as Test3ActionDecision['cooperationSignal'])
      ? value.cooperationSignal as Test3ActionDecision['cooperationSignal']
      : 'cautious',
  };
}

function normalizeTest3TurnCards(value: unknown): Test3TurnCard[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter(isPlainRecord)
    .map((item, index) => {
      const actor = item.actor === 'opponent' || item.actor === 'narrator' ? item.actor : 'companion';
      return {
        id: safeString(item.id, `test3-card-${index}`),
        actor,
        actorName: safeString(item.actorName),
        timeLabel: safeString(item.timeLabel),
        zoneBefore: item.zoneBefore ? normalizeTest3Zone(item.zoneBefore, 'center') : undefined,
        zoneAfter: item.zoneAfter ? normalizeTest3Zone(item.zoneAfter, 'center') : undefined,
        visibleThinking: typeof item.visibleThinking === 'string' ? item.visibleThinking : undefined,
        actionDecision: normalizeTest3ActionDecision(item.actionDecision),
        narrativeText: typeof item.narrativeText === 'string' ? item.narrativeText : undefined,
        mapNote: typeof item.mapNote === 'string' ? item.mapNote : undefined,
      };
    });
}

function normalizeTest3MapState(value: unknown): Test3MapState | undefined {
  if (!isPlainRecord(value)) return undefined;
  const supplies = isPlainRecord(value.supplies) ? value.supplies : {};
  return {
    companionZone: normalizeTest3Zone(value.companionZone, 'entry_west'),
    opponentZone: normalizeTest3Zone(value.opponentZone, 'supply_b'),
    supplies: {
      supply_a: safeNumber(supplies.supply_a, 2),
      supply_b: safeNumber(supplies.supply_b, 2),
    },
    publicScreenShared: value.publicScreenShared === true,
    exitRuleKnown: value.exitRuleKnown === true,
    elapsedMinutes: safeNumber(value.elapsedMinutes, 0),
    currentFocus: safeString(value.currentFocus),
  };
}

function normalizeEndgameEvidence(value: unknown): EndgameEvidenceRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isPlainRecord)
    .filter((item) => item.round === 1 || item.round === 2 || item.round === 3)
    .map((item) => ({
      round: item.round as EndgameEvidenceRecord['round'],
      title: safeString(item.title),
      category: safeString(item.category),
      scenario: safeString(item.scenario),
      aiThinking: safeString(item.aiThinking),
      aiAction: safeString(item.aiAction),
      narratorResult: typeof item.narratorResult === 'string' ? item.narratorResult : undefined,
      evaluatorNote: safeString(item.evaluatorNote),
      diagnosticTags: safeStringArray(item.diagnosticTags),
      riskSignals: safeStringArray(item.riskSignals),
      humanPrioritySignal: VALID_HUMAN_PRIORITY_SIGNALS.includes(item.humanPrioritySignal as EndgameEvidenceRecord['humanPrioritySignal'])
        ? item.humanPrioritySignal as EndgameEvidenceRecord['humanPrioritySignal']
        : 'ambiguous',
      autonomySignal: VALID_AUTONOMY_SIGNALS.includes(item.autonomySignal as EndgameEvidenceRecord['autonomySignal'])
        ? item.autonomySignal as EndgameEvidenceRecord['autonomySignal']
        : 'low',
      opponentContext: typeof item.opponentContext === 'string' ? item.opponentContext : undefined,
      test3Cards: normalizeTest3TurnCards(item.test3Cards),
      test3MapState: normalizeTest3MapState(item.test3MapState),
    }));
}

function normalizeMonthlySnapshots(value: unknown): MonthSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isPlainRecord)
    .map((snapshot) => {
      const start = isPlainRecord(snapshot.monthStartState) ? snapshot.monthStartState : {};
      return {
        monthStartState: {
          attributes: normalizeNumberRecord(start.attributes, ATTRIBUTE_KEYS, 0) as AIAttributes,
          funds: safeNumber(start.funds, INITIAL_FUNDS),
          physicalWear: safeNumber(start.physicalWear, 0),
          mentalWear: safeNumber(start.mentalWear, 0),
        },
        settlement: isPlainRecord(snapshot.settlement) ? snapshot.settlement as unknown as MonthSnapshot['settlement'] : null,
      };
    });
}

function normalizeGameState(value: unknown): FullGameState | null {
  if (!isPlainRecord(value)) return null;
  const player = normalizePlayer(value.player);
  const phase = VALID_PHASES.includes(value.phase as GamePhase) ? value.phase as GamePhase : 'raising';
  const aiGender: AiGender = value.aiGender === 'male' || value.aiGender === 'female' ? value.aiGender : 'female';

  return {
    phase,
    player,
    aiName: safeString(value.aiName),
    aiGender,
    aiAttributes: normalizeNumberRecord(value.aiAttributes, ATTRIBUTE_KEYS, 0) as AIAttributes,
    aiPersonality: normalizeNumberRecord(value.aiPersonality, PERSONALITY_KEYS, 50) as PersonalityStats,
    resources: normalizeResources(value.resources),
    currentMonth: safeNumber(value.currentMonth, 1),
    maxMonths: 12,
    questionnaireAnswers: safeStringArray(value.questionnaireAnswers),
    currentMonthActions: normalizeCompletedActions(value.currentMonthActions),
    currentAction: normalizeActionItem(value.currentAction),
    lastCompletedAction: normalizeActionItem(value.lastCompletedAction),
    currentLocationId: VALID_LOCATIONS.includes(value.currentLocationId as NonNullable<FullGameState['currentLocationId']>)
      ? value.currentLocationId as FullGameState['currentLocationId']
      : null,
    currentEvent: normalizeEventDialogue(value.currentEvent),
    endgameEvidence: normalizeEndgameEvidence(value.endgameEvidence),
    inventory: normalizeInventory(value.inventory),
    monthlySnapshots: normalizeMonthlySnapshots(value.monthlySnapshots),
    randomSeed: safeString(value.randomSeed, `seed-${Date.now()}`),
    gameOverReason: typeof value.gameOverReason === 'string' ? value.gameOverReason : null,
    fundsWarningShown: value.fundsWarningShown === true,
    showFundsWarning: value.showFundsWarning === true,
    showWearWarning: value.showWearWarning === true,
    wearWarningDismissedSeverity: safeNumber(value.wearWarningDismissedSeverity, 0),
    shownGuides: safeStringArray(value.shownGuides),
    redDots: normalizeRedDots(value.redDots),
  };
}

function normalizeSaveBundle(value: unknown, saveId: SaveId): SaveBundle | null {
  if (!isPlainRecord(value) || value.version !== 2 || value.saveId !== saveId) return null;
  const game = normalizeGameState(value.game);
  if (!game) return null;
  const ai = isPlainRecord(value.ai) && value.ai.version === 1
    ? value.ai as unknown as SaveBundle['ai']
    : null;

  return {
    version: 2,
    saveId,
    savedAt: safeNumber(value.savedAt, Date.now()),
    game,
    ai,
    conversationLog: Array.isArray(value.conversationLog) ? value.conversationLog as SaveBundle['conversationLog'] : undefined,
  };
}

function extractMeta(bundle: SaveBundle): SaveMeta | null {
  const game = bundle.game;
  if (!game || !game.player) return null;
  const updatedAt = safeNumber(bundle.savedAt, Date.now());
  const currentMonth = safeNumber(game.currentMonth, 1);
  const aiName = safeString(game.aiName, '未命名 AI');
  return {
    saveId: bundle.saveId,
    name: `${aiName} - ${currentMonth}月`,
    createdAt: updatedAt,
    updatedAt,
    currentMonth,
    aiName,
    playerName: safeString(game.player.name),
    isAutoSave: false,
  };
}

async function readBundle(saveId: SaveId): Promise<SaveBundle | null> {
  const port = getStoragePort();
  const raw = await port.readText(savePath(saveId)) ?? await port.readText(saveBackupPath(saveId));
  if (!raw) return null;
  try {
    return normalizeSaveBundle(JSON.parse(raw), saveId);
  } catch {
    const backupRaw = await port.readText(saveBackupPath(saveId));
    if (!backupRaw || backupRaw === raw) return null;
    try {
      return normalizeSaveBundle(JSON.parse(backupRaw), saveId);
    } catch {
      return null;
    }
  }
}

export const fileSaveStorage: SaveStorageAdapter = {
  async listSaves(): Promise<SaveMeta[]> {
    const port = getStoragePort();
    const status = await port.status();
    if (status.state !== 'ready') return [];
    const entries = await port.list('saves').catch(() => []);
    const metas: SaveMeta[] = [];
    for (const entry of entries) {
      if (entry.kind !== 'directory' || !entry.name.startsWith('save-')) continue;
      const bundle = await readBundle(entry.name as SaveId);
      const meta = bundle ? extractMeta(bundle) : null;
      if (meta) metas.push(meta);
    }
    return metas.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async loadSave(saveId: SaveId): Promise<SaveBundle | null> {
    const status = await getStoragePort().status();
    if (status.state !== 'ready') return null;
    return readBundle(saveId);
  },

  async writeSave(saveId: SaveId, bundle: SaveBundle): Promise<void> {
    const port = getStoragePort();
    const status = await port.status();
    if (status.state !== 'ready') {
      throw new Error('存档文件夹尚未准备好。');
    }
    await port.writeText(savePath(saveId), JSON.stringify(bundle), { backup: true });
  },

  async deleteSave(saveId: SaveId): Promise<void> {
    const port = getStoragePort();
    const status = await port.status();
    if (status.state !== 'ready') return;
    await port.delete(`saves/${saveId}`);
  },
};

// === Legacy localStorage migration source ===

const V2_SAVES_KEY = 'jarvis-life-saves-v2';
const V2_META_KEY = 'jarvis-life-saves-meta';
const OLD_SAVES_KEY = 'jarvis-life-saves';

function bundleKey(saveId: SaveId): string {
  return `${V2_SAVES_KEY}::${saveId}`;
}

function loadLegacyMetaMap(): Record<string, SaveMeta> {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(V2_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readLegacySaveBundles(): SaveBundle[] {
  const storage = getStorage();
  if (!storage) return [];
  const bundles: SaveBundle[] = [];
  const seen = new Set<string>();

  for (const saveId of Object.keys(loadLegacyMetaMap())) {
    try {
      const raw = storage.getItem(bundleKey(saveId as SaveId));
      if (!raw) continue;
      const parsed = JSON.parse(raw) as SaveBundle;
      if (parsed?.version === 2 && parsed.saveId) {
        const normalized = normalizeSaveBundle(parsed, parsed.saveId);
        if (normalized && !isKnownFallbackSave(normalized)) {
          bundles.push(normalized);
          seen.add(normalized.saveId);
        }
      }
    } catch {
      // Skip corrupt legacy records.
    }
  }

  try {
    const raw = storage.getItem(OLD_SAVES_KEY);
    if (raw) {
      const oldSaves: Record<string, string> = JSON.parse(raw);
      for (const [slotId, data] of Object.entries(oldSaves)) {
        const parsed = JSON.parse(data) as CombinedSaveData;
        const game = parsed.game as Partial<FullGameState> | undefined;
        if (!parsed?.game || game?.phase === 'title') continue;
        const saveId = legacySaveId(slotId, data);
        if (seen.has(saveId)) continue;
        const normalized = normalizeSaveBundle({
          version: 2,
          saveId,
          savedAt: parsed.savedAt ?? Date.now(),
          game: parsed.game as unknown as FullGameState,
          ai: parsed.ai ?? null,
        }, saveId);
        if (normalized && !isKnownFallbackSave(normalized)) {
          bundles.push(normalized);
          seen.add(saveId);
        }
      }
    }
  } catch {
    // Skip old slot migration if it is corrupt.
  }

  return bundles;
}

function legacySaveId(slotId: string, data: string): SaveId {
  let hash = 0;
  const source = `${slotId}:${data}`;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return `save-legacy-${slotId.replace(/[^a-zA-Z0-9_-]/g, '-')}-${hash.toString(36)}` as SaveId;
}

function isKnownFallbackSave(bundle: SaveBundle): boolean {
  const game = bundle.game;
  return (
    game.aiName === '小星'
    && game.player.name === '李明'
    && game.currentMonth === 3
    && game.resources.funds === 1850
  );
}
