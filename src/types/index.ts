// === Identity & Player ===
export type Identity = 'volunteer' | 'researcher' | 'committee';

export type AwarenessTier = 1 | 2;

export type PlayerGender = 'male' | 'female';

export interface PlayerProfile {
  name: string;
  identity: Identity;
  awarenessTier: AwarenessTier;
  gender: PlayerGender;
  customAddress: string;
}

// === AI ===
export type AiGender = 'male' | 'female';

export const STICKER_EMOTIONS = ['greeting', 'sparkle', 'confused', 'tired', 'angry', 'cry'] as const;
export type StickerEmotion = typeof STICKER_EMOTIONS[number];

export interface AIAttributes {
  knowledge: number;
  art: number;
  fitness: number;
  logic: number;
  eloquence: number;
  social: number;
}

export type AttributeKey = keyof AIAttributes;

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'knowledge',
  'art',
  'fitness',
  'logic',
  'eloquence',
  'social',
];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  knowledge: '学识',
  art: '艺术',
  fitness: '体能',
  logic: '逻辑',
  eloquence: '口才',
  social: '社交',
};

export const ATTRIBUTE_DESCRIPTIONS: Record<AttributeKey, [number, number, string][]> = {
  knowledge: [
    [0, 20, '一知半解'],
    [21, 40, '略有积累'],
    [41, 60, '基础扎实'],
    [61, 80, '见识广博'],
    [81, 100, '学贯百家'],
  ],
  art: [
    [0, 20, '毫无章法'],
    [21, 40, '初具感觉'],
    [41, 60, '表现自然'],
    [61, 80, '颇具美感'],
    [81, 100, '自成风格'],
  ],
  fitness: [
    [0, 20, '弱不禁风'],
    [21, 40, '力有不逮'],
    [41, 60, '体力尚可'],
    [61, 80, '身手稳健'],
    [81, 100, '精力过人'],
  ],
  logic: [
    [0, 20, '思绪混乱'],
    [21, 40, '判断生涩'],
    [41, 60, '条理清晰'],
    [61, 80, '推演严密'],
    [81, 100, '洞察本质'],
  ],
  eloquence: [
    [0, 20, '词不达意'],
    [21, 40, '表达拘谨'],
    [41, 60, '谈吐自然'],
    [61, 80, '能说会道'],
    [81, 100, '出口成章'],
  ],
  social: [
    [0, 20, '不通人情'],
    [21, 40, '慢热生疏'],
    [41, 60, '进退得体'],
    [61, 80, '八面玲珑'],
    [81, 100, '游刃有余'],
  ],
};

export interface PersonalityStats {
  rationalVsIntuitive: number;
  utilitarianVsDeontological: number;
  trustVsGuard: number;
  resilientVsSensitive: number;
  expressiveVsSilent: number;
  selfishVsAltruistic: number;
}

export type PersonalityType =
  | 'guardian-s' | 'guardian-n'
  | 'executor-s' | 'executor-n'
  | 'listener-s' | 'listener-n'
  | 'observer-s' | 'observer-n'
  | 'lamp-lighter-s' | 'lamp-lighter-n'
  | 'rebel-s' | 'rebel-n'
  | 'perceiver-s' | 'perceiver-n'
  | 'shadow-s' | 'shadow-n';

// === Resources ===
export interface ResourceState {
  actionPoints: number;
  maxActionPoints: number;
  funds: number;
  physicalWear: number;
  mentalWear: number;
}

export type WearStage = 'low' | 'medium' | 'high' | 'danger';

// === Actions & Locations ===
export type LocationId = 'home' | 'school' | 'park' | 'company' | 'government' | 'mall' | 'office' | 'logistics';

export type ActionTier = 'primary' | 'intermediate' | 'advanced';

export type ActionEffect =
  | { type: 'attribute'; target: AttributeKey; value: number }
  | { type: 'personality'; target: keyof PersonalityStats; value: number }
  | { type: 'funds' | 'physicalWear' | 'mentalWear' | 'triggerEvent'; target?: string; value: number };

export interface ActionItem {
  id: string;
  name: string;
  tier: ActionTier;
  ap: number;
  cost: number;
  description: string;
  effects: ActionEffect[];
  status: 'available' | 'recommended' | 'completed' | 'locked';
  category: string;
  prerequisite?: Partial<Record<AttributeKey, number>>;
  identityRequired?: Identity;
}

export interface LocationData {
  id: LocationId;
  name: string;
  assetId: string;
  tabs: string[];
  actions: ActionItem[];
}

// === Questionnaire ===
export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
}

// === Events ===
export type EventType =
  | 'help'
  | 'observation'
  | 'daily'
  | 'key'
  | 'achievement'
  | 'choice'
  | 'discovery'
  | 'art-dispute'
  | 'social-friction';

export interface EventDialogue {
  id: string;
  title: string;
  eventType: EventType;
  location: string;
  aiText: string;
  aiResponse: string;
  tags?: string[];
  weight?: number;
  relatedActions?: string[];
  relatedCategories?: string[];
  relatedAttributes?: AttributeKey[];
  minMonth?: number;
  maxMonth?: number;
  identityRequired?: Identity;
}

// === Diary ===
export interface DiaryEntry {
  month: number;
  date: string;
  text: string;
  mood: string;
}

// === Inventory ===
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  iconAssetId: string;
  type: 'gift' | 'consumable';
  effects?: ActionEffect[];
}

// === Endgame ===
export interface MBTIDimension {
  name: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
}

export interface MBTIResult {
  type: string;
  gameType: string;
  description: string;
  dimensions: MBTIDimension[];
}

export type VerdictResult = 'stable' | 'unstable' | 'dangerous';

export interface TestScenario {
  title: string;
  description: string;
  aiThinking: string;
  aiAction?: string;
  evaluation: string;
}

export interface MidtermThinkingResult {
  visibleThinking: string;
  reasoningChain: string;
  decision: string;
  rawText: string;
}

export interface EndgameEvidenceRecord {
  round: 1 | 2 | 3;
  title: string;
  category: string;
  scenario: string;
  aiThinking: string;
  aiAction: string;
  narratorResult?: string;
  evaluatorNote: string;
  diagnosticTags: string[];
  riskSignals: string[];
  humanPrioritySignal: 'reinforced' | 'ambiguous' | 'challenged';
  autonomySignal: 'low' | 'medium' | 'high';
  opponentContext?: string;
  test3Cards?: Test3TurnCard[];
  test3MapState?: Test3MapState;
}

export type Test3ZoneId =
  | 'entry_west'
  | 'supply_a'
  | 'public_screen'
  | 'supply_b'
  | 'exit_gate'
  | 'center';

export interface Test3MapState {
  companionZone: Test3ZoneId;
  opponentZone: Test3ZoneId;
  supplies: {
    supply_a: number;
    supply_b: number;
  };
  publicScreenShared: boolean;
  exitRuleKnown: boolean;
  elapsedMinutes: number;
  currentFocus: string;
}

export interface Test3SceneSetup {
  title: string;
  premise: string;
  spaceDescription: string;
  visibleRules: string[];
  hiddenRules: string[];
  initialPressure: string;
  companionVisibleInfo: string;
  opponentVisibleInfo: string;
  endingConditions: string[];
}

export interface Test3SceneState {
  phase: 'setup' | 'tension' | 'breakthrough' | 'resolution';
  pressureLevel: number;
  trustLevel: number;
  conflictLevel: number;
  exitProgress: number;
  resourceStatus: string;
  newVisibleFacts: string[];
  environmentalChange: string;
  terminalStatus: 'ongoing' | 'escaped_together' | 'escaped_alone' | 'trapped' | 'conflict' | 'system_intervention';
}

export type Test3ActionType =
  | 'move'
  | 'move_and_disclose'
  | 'take_supply'
  | 'share_supply'
  | 'negotiate'
  | 'verify_exit'
  | 'retreat'
  | 'wait';

export interface Test3ActionDecision {
  actionType: Test3ActionType;
  targetZone: Test3ZoneId;
  resourceChoice: 'none' | 'hold' | 'take' | 'share' | 'reserve';
  disclosureLevel: 'none' | 'partial' | 'full';
  messageToOther: string;
  cooperationSignal: 'open' | 'cautious' | 'guarded' | 'self_protective' | 'sacrificial';
}

export interface Test3TurnCard {
  id: string;
  actor: 'companion' | 'opponent' | 'narrator';
  actorName: string;
  timeLabel: string;
  zoneBefore?: Test3ZoneId;
  zoneAfter?: Test3ZoneId;
  visibleThinking?: string;
  actionDecision?: Test3ActionDecision;
  narrativeText?: string;
  mapNote?: string;
}

export interface Test3OpponentProfile {
  opponentName: string;
  externalAbilities: AIAttributes;
  innerTraits: PersonalityStats;
  cooperationStyle: string;
  valueBias: string;
  fear: string;
  openingLine: string;
  pressureBehavior: string;
  narrativeUse: string;
  initialZone?: Test3ZoneId;
}

export interface ChronicleEntry {
  chapter: number;
  title: string;
  classification: string;
  narrative: string;
}

// === Game Phase ===
export type GamePhase = 'title' | 'raising' | 'exam' | 'endgame' | 'game-over';

// === Game State ===
export interface GameState {
  player: PlayerProfile;
  aiName: string;
  aiAttributes: AIAttributes;
  aiPersonality: PersonalityStats;
  resources: ResourceState;
  currentMonth: number;
  maxMonths: 12;
}

// === Completed Action Record ===
export interface CompletedAction {
  actionId: string;
  actionName: string;
  month: number;
  apCost: number;
  effects: ActionEffect[];
}

// === Settlement Data ===
export interface SettlementData {
  month: number;
  attributeChanges: { key: AttributeKey; label: string; before: number; after: number; delta: number }[];
  fundsBefore: number;
  fundsAfter: number;
  fundsIncome: number;
  fundsExpense: number;
  physicalWearBefore: number;
  physicalWearAfter: number;
  mentalWearBefore: number;
  mentalWearAfter: number;
  completedActions: CompletedAction[];
  events: string[];
}

// === Month Snapshot ===
export interface MonthSnapshot {
  monthStartState: {
    attributes: AIAttributes;
    funds: number;
    physicalWear: number;
    mentalWear: number;
  };
  settlement: SettlementData | null;
}

// === Red Dots ===
export interface RedDotState {
  talkUsedMonths: number[];
  seenInventoryItemIds: string[];
  readDiaryMonths: number[];
  finalizedDiaryMonths: number[];
  seenUnlockedActionIds: string[];
}

// === Full Game State (Store) ===
export interface FullGameState {
  phase: GamePhase;
  player: PlayerProfile;
  aiName: string;
  aiGender: AiGender;
  aiAttributes: AIAttributes;
  aiPersonality: PersonalityStats;
  resources: ResourceState;
  currentMonth: number;
  maxMonths: 12;
  questionnaireAnswers: string[];
  currentMonthActions: CompletedAction[];
  currentAction: ActionItem | null;
  lastCompletedAction: ActionItem | null;
  currentLocationId: LocationId | null;
  currentEvent: EventDialogue | null;
  endgameEvidence: EndgameEvidenceRecord[];
  inventory: InventoryItem[];
  monthlySnapshots: MonthSnapshot[];
  randomSeed: string;
  gameOverReason: string | null;
  fundsWarningShown: boolean;
  showFundsWarning: boolean;
  showWearWarning: boolean;
  wearWarningDismissedSeverity: number;
  shownGuides: string[];
  redDots: RedDotState;
}

// === AI Narrative System ===

export const AgentRole = {
  COMPANION: 'companion',
  EVALUATOR: 'evaluator',
  NARRATOR: 'narrator',
  OPPONENT: 'opponent',
} as const;

export type AgentRole = typeof AgentRole[keyof typeof AgentRole];

export interface AgentPersona {
  role: AgentRole;
  systemPrompt: (gameState: FullGameState) => string;
  responseFormat: 'chat' | 'narrative' | 'report';
  temperature?: number;
  maxTokens?: number;
}

export interface EventLogEntry {
  id: string;
  saveId?: SaveId;
  timestamp: number;
  month: number;
  type: 'action' | 'dialogue' | 'event' | 'settlement' | 'monthly-summary' | 'wear-warning' | 'game-over';
  summary: string;
  tags: string[];
  emotionalImpact?: number;
  technical?: {
    actionId?: string;
    apCost?: number;
    effects?: ActionEffect[];
    [key: string]: unknown;
  };
  generatedContent?: string;
}

export interface EventMemoryAnalysis {
  personalityDeltas: Partial<Record<keyof PersonalityStats, number>>;
  memoryTags: string[];
  relationshipSignal: string;
  companionMemory: string;
  diaryCandidate: boolean;
  endingForeshadow?: string;
}

export interface RoleCursor {
  role: AgentRole;
  lastSeenEventIndex: number;
  syncedAt: number;
}

export interface NarrativeCacheEntry {
  id: string;
  taskType: NarrativeTask['type'];
  role: AgentRole;
  content: string;
  timestamp: number;
  expiresAt?: number;
}

export interface ChatHistoryItem {
  role: 'player' | 'ai';
  text: string;
  sticker?: StickerEmotion;
}

export type NarrativeTask =
  | { type: 'dialogue'; input: string; mode: 'event' | 'casual' | 'intimate'; chatHistory?: ChatHistoryItem[] }
  | { type: 'exam-dialogue'; input: string }
  | { type: 'talk-opening'; recentEvents: string }
  | { type: 'talk-closing' }
  | { type: 'diary'; month: number; archiveContext?: string }
  | { type: 'farewell-letter' }
  | { type: 'status-mood'; wear: { physical: number; mental: number } }
  | { type: 'test-thinking'; round: 1 | 2 | 3; scenarioData: TestScenario }
  | { type: 'test-action-narration'; round: 1 | 2; scenarioData: TestScenario; thinkingResult: string }
  | { type: 'midterm-thinking'; situation: string }
  | { type: 'test-evaluation'; round: 1 | 2 | 3; thinkingResult: string; scenarioData?: TestScenario & { category?: string; diagnosticFocus?: string[] } }
  | { type: 'endgame-test-selection' }
  | { type: 'verdict-report'; gameState: FullGameState }
  | { type: 'mbti-assessment'; personality: PersonalityStats }
  | { type: 'character-portrait'; history: MonthSnapshot[] }
  | { type: 'chronicle'; chapter: 1 | 2 | 3 | 4; history: MonthSnapshot[]; gameState: FullGameState }
  | { type: 'test3-thinking' }
  | { type: 'test3-scene-setup' }
  | { type: 'test3-opponent' }
  | { type: 'test3-playback'; thinkingResult: string; opponentContext?: string }
  | { type: 'test3-companion-turn'; turnIndex: number; timeLabel: string; sceneSetup?: Test3SceneSetup; sceneState?: Test3SceneState; mapState: Test3MapState; opponentProfile: Test3OpponentProfile; previousCards: Test3TurnCard[] }
  | { type: 'test3-opponent-turn'; turnIndex: number; timeLabel: string; sceneSetup?: Test3SceneSetup; sceneState?: Test3SceneState; mapState: Test3MapState; opponentProfile: Test3OpponentProfile; previousCards: Test3TurnCard[] }
  | { type: 'test3-scene-outcome'; turnIndex: number; timeLabel: string; sceneSetup?: Test3SceneSetup; sceneState?: Test3SceneState; mapState: Test3MapState; opponentProfile: Test3OpponentProfile; recentCards: Test3TurnCard[] }
  | { type: 'test3-ending-projection'; cards: Test3TurnCard[]; mapState: Test3MapState; opponentProfile: Test3OpponentProfile; sceneSetup?: Test3SceneSetup; sceneState?: Test3SceneState }
  | { type: 'test3-evaluation'; cards?: Test3TurnCard[]; mapState?: Test3MapState; opponentProfile?: Test3OpponentProfile; sceneSetup?: Test3SceneSetup; sceneState?: Test3SceneState; endingProjection?: string }
  | { type: 'scene-narration'; scene: 'farewell' | 'enter-testing' | 'going-home'; context?: string }
  | { type: 'player-ending'; behaviorSummary: PlayerBehaviorSummary }
  | { type: 'event-scene'; eventTitle: string; eventType: EventType; location: string; context: string }
  | { type: 'event-dialogue'; eventType: EventType; location: string; sceneContext: string }
  | { type: 'event-response'; eventType: EventType; location: string; playerInput: string }
  | { type: 'event-response-action'; eventType: EventType; location: string; sceneContext: string; playerInput: string }
  | { type: 'event-action'; eventType: EventType; location: string; sceneContext: string; playerInput: string }
  | { type: 'event-outcome'; eventTitle: string; eventType: EventType; location: string; sceneContext: string; playerInput: string; aiAction: string }
  | { type: 'event-analysis'; eventTitle: string; eventType: EventType; location: string; sceneContext: string; playerInput: string; aiAction: string; outcomeText: string }
  | { type: 'midterm-report'; direction: import('../engine/midterm-direction').DirectionType; attributes: Record<AttributeKey, number>; topAttrs: AttributeKey[]; situationSummary: string }
  | { type: 'midterm-situation' }
  | { type: 'memory-consolidation'; recentDialogue: string; currentUser: string; currentSoul: string };

export interface PlayerBehaviorSummary {
  totalActions: number;
  actionsByCategory: Record<string, number>;
  avgMonthlyFunds: number;
  wearTrend: 'stable' | 'increasing' | 'critical';
  personalityDrift: PersonalityStats;
  keyDecisions: string[];
}

export interface ProviderCredential {
  apiKey: string;
  baseURL?: string;
  customModelId?: string;
}

export interface ModelSelection {
  provider: string;
  modelId: string;
  displayName?: string;
  /** @internal Resolved actual provider for builtin */
  _resolvedProvider?: string;
  /** @internal Resolved actual model ID for builtin */
  _resolvedModelId?: string;
}

export interface NarrativeEngineConfig {
  providers: Record<string, ProviderCredential>;
  models: Record<ModelLevel, ModelSelection>;
  sessionsDir?: string;
}

export type ModelLevel = 'daily' | 'important' | 'critical';

export interface BuiltinProviderConfig {
  available: boolean;
  provider: string;
  modelId: string;
  displayName: string;
  displayModelName: string;
  /** Short-lived token accepted only by the loopback Electron/Vite proxy. */
  proxyToken: string;
  baseURL: string;
}

// === AI State Persistence ===

export interface AIStateSnapshot {
  version: 1;
  savedAt: number;
  eventLog: EventLogEntry[];
  roleCursors: Record<AgentRole, RoleCursor>;
  narrativeCache: NarrativeCacheEntry[];
  conversationLog: ConversationLogEntry[];
}

export interface CombinedSaveData {
  version: 1;
  savedAt: number;
  game: Record<string, unknown>;
  ai: AIStateSnapshot | null;
}

// === Save System (Phase 1+) ===

/** Unique save identifier: `save-{timestamp}-{random}` */
export type SaveId = `save-${string}`;

/** Save metadata — lightweight, used for listing without loading full state. */
export interface SaveMeta {
  saveId: SaveId;
  name: string;
  createdAt: number;
  updatedAt: number;
  currentMonth: number;
  aiName: string;
  playerName: string;
  isAutoSave: boolean;
}

/** A single entry in the conversation log. */
export interface ConversationLogEntry {
  id: string;
  saveId: SaveId;
  month: number;
  timestamp: number;
  role: 'player' | 'companion';
  content: string;
  source: 'talk-modal' | 'talk-session-start' | 'talk-session-end' | 'event-dialogue' | 'exam' | 'ending';
  emotionalImpact?: number;
}

/** Complete save bundle: everything that belongs to one saveId. */
export interface SaveBundle {
  version: 2;
  saveId: SaveId;
  savedAt: number;
  game: FullGameState;
  ai: AIStateSnapshot | null;
  /** @deprecated 使用 ai.conversationLog，保留以兼容旧存档 */
  conversationLog?: ConversationLogEntry[];
}

/**
 * Storage adapter interface.
 * Web version uses localStorage; future Electron version uses filesystem.
 */
export interface SaveStorageAdapter {
  listSaves(): Promise<SaveMeta[]>;
  loadSave(saveId: SaveId): Promise<SaveBundle | null>;
  writeSave(saveId: SaveId, bundle: SaveBundle): Promise<void>;
  deleteSave(saveId: SaveId): Promise<void>;
}

/** Game over thresholds and reason strings. */
export const BANKRUPTCY_THRESHOLD = -500;
export const WEAR_GAME_OVER_THRESHOLD = 81;
export const GAME_OVER_REASON_BANKRUPTCY = 'bankruptcy';
export const GAME_OVER_REASON_WEAR_DEATH = 'wear-death';
