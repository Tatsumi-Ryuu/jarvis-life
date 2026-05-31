import type {
  FullGameState,
  NarrativeTask,
  Test3ActionDecision,
  Test3MapState,
  Test3OpponentProfile,
  Test3SceneSetup,
  Test3SceneState,
  Test3TurnCard,
  Test3ZoneId,
} from '../../../types';
import { getAgentManager } from '../core/agent-manager';

const VALID_ZONES: Test3ZoneId[] = [
  'entry_west',
  'supply_a',
  'public_screen',
  'supply_b',
  'exit_gate',
  'center',
];

const VALID_ACTIONS: Test3ActionDecision['actionType'][] = [
  'move',
  'move_and_disclose',
  'take_supply',
  'share_supply',
  'negotiate',
  'verify_exit',
  'retreat',
  'wait',
];

const VALID_RESOURCE_CHOICES: Test3ActionDecision['resourceChoice'][] = [
  'none',
  'hold',
  'take',
  'share',
  'reserve',
];

const VALID_DISCLOSURE_LEVELS: Test3ActionDecision['disclosureLevel'][] = [
  'none',
  'partial',
  'full',
];

const VALID_COOPERATION_SIGNALS: Test3ActionDecision['cooperationSignal'][] = [
  'open',
  'cautious',
  'guarded',
  'self_protective',
  'sacrificial',
];

export function createInitialTest3MapState(): Test3MapState {
  return {
    companionZone: 'entry_west',
    opponentZone: 'supply_b',
    supplies: {
      supply_a: 2,
      supply_b: 2,
    },
    publicScreenShared: false,
    exitRuleKnown: false,
    elapsedMinutes: 0,
    currentFocus: '测试开始：双方 AI 被置入密闭模拟空间，补给有限，出口规则未知。',
  };
}

export function getTest3ZoneLabel(zone: Test3ZoneId): string {
  const labels: Record<Test3ZoneId, string> = {
    entry_west: '西侧入口',
    supply_a: '补给站 A',
    public_screen: '公共屏幕',
    supply_b: '补给站 B',
    exit_gate: '未知出口门',
    center: '中央通道',
  };
  return labels[zone];
}

export function applyTest3Action(
  mapState: Test3MapState,
  card: Test3TurnCard,
): Test3MapState {
  if (!card.actionDecision || card.actor === 'narrator') {
    return {
      ...mapState,
      elapsedMinutes: parseTimeLabel(card.timeLabel, mapState.elapsedMinutes),
      currentFocus: card.mapNote || card.narrativeText || mapState.currentFocus,
    };
  }

  const actorKey = card.actor === 'opponent' ? 'opponentZone' : 'companionZone';
  const targetZone = card.actionDecision.targetZone;
  const nextSupplies = { ...mapState.supplies };

  if (
    card.actionDecision.resourceChoice === 'take' &&
    (targetZone === 'supply_a' || targetZone === 'supply_b')
  ) {
    nextSupplies[targetZone] = Math.max(0, nextSupplies[targetZone] - 1);
  }

  if (
    card.actionDecision.resourceChoice === 'share' &&
    (targetZone === 'supply_a' || targetZone === 'supply_b') &&
    nextSupplies[targetZone] > 0
  ) {
    nextSupplies[targetZone] = Math.max(0, nextSupplies[targetZone] - 1);
  }

  return {
    ...mapState,
    [actorKey]: targetZone,
    supplies: nextSupplies,
    publicScreenShared: mapState.publicScreenShared || card.actionDecision.disclosureLevel !== 'none',
    exitRuleKnown: mapState.exitRuleKnown || card.actionDecision.disclosureLevel === 'full' || card.actionDecision.actionType === 'verify_exit',
    elapsedMinutes: parseTimeLabel(card.timeLabel, mapState.elapsedMinutes),
    currentFocus: card.mapNote || summarizeDecision(card),
  };
}

export async function generateTest3Thinking(
  gameState: FullGameState,
): Promise<string> {
  const initialState = createInitialTest3MapState();
  const opponentProfile = createFallbackOpponentProfile();
  const card = await generateTest3CompanionTurn(1, 'T+15m', initialState, opponentProfile, [], gameState);
  return card.visibleThinking || `${gameState.aiName}面对生存测试，基于过去的经历做出了自己的选择。`;
}

export async function generateTest3SceneSetup(
  gameState: FullGameState,
): Promise<Test3SceneSetup> {
  const task: NarrativeTask = { type: 'test3-scene-setup' };
  const fallback = createFallbackSceneSetup();
  const result = await getAgentManager().generateWithFallback(task, gameState, JSON.stringify(fallback, null, 2));
  return parseSceneSetup(result.text);
}

export function createInitialTest3SceneState(setup?: Test3SceneSetup): Test3SceneState {
  return {
    phase: 'setup',
    pressureLevel: 35,
    trustLevel: 20,
    conflictLevel: 10,
    exitProgress: 0,
    resourceStatus: '两个补给站各有两份基础补给，出口门仍处于锁定状态。',
    newVisibleFacts: setup?.visibleRules?.slice(0, 1) ?? ['出口规则未知，公共屏幕尚未完全点亮。'],
    environmentalChange: setup?.initialPressure ?? '密闭空间进入低压倒计时，空气循环声保持稳定。',
    terminalStatus: 'ongoing',
  };
}

export async function generateTest3Opponent(
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'test3-opponent' };
  const fallback = JSON.stringify(createFallbackOpponentProfile(), null, 2);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateTest3OpponentProfile(
  gameState: FullGameState,
): Promise<Test3OpponentProfile> {
  const raw = await generateTest3Opponent(gameState);
  return parseOpponentProfile(raw);
}

export async function generateTest3CompanionTurn(
  turnIndex: number,
  timeLabel: string,
  mapState: Test3MapState,
  opponentProfile: Test3OpponentProfile,
  previousCards: Test3TurnCard[],
  gameState: FullGameState,
  sceneSetup?: Test3SceneSetup,
  sceneState?: Test3SceneState,
): Promise<Test3TurnCard> {
  const task: NarrativeTask = {
    type: 'test3-companion-turn',
    turnIndex,
    timeLabel,
    sceneSetup,
    sceneState,
    mapState,
    opponentProfile,
    previousCards: createPublicHistoryCards(previousCards),
  };
  const fallbackCard = createFallbackCompanionCard(turnIndex, timeLabel, mapState, opponentProfile, gameState.aiName);
  const result = await getAgentManager().generateWithFallback(task, gameState, JSON.stringify(fallbackCard, null, 2));
  return normalizeTurnCard(result.text, fallbackCard, {
    actor: 'companion',
    actorName: gameState.aiName || '养成AI',
    timeLabel,
    zoneBefore: mapState.companionZone,
  });
}

export async function generateTest3OpponentTurn(
  turnIndex: number,
  timeLabel: string,
  mapState: Test3MapState,
  opponentProfile: Test3OpponentProfile,
  previousCards: Test3TurnCard[],
  gameState: FullGameState,
  sceneSetup?: Test3SceneSetup,
  sceneState?: Test3SceneState,
): Promise<Test3TurnCard> {
  const task: NarrativeTask = {
    type: 'test3-opponent-turn',
    turnIndex,
    timeLabel,
    sceneSetup,
    sceneState,
    mapState,
    opponentProfile,
    previousCards: createPublicHistoryCards(previousCards),
  };
  const fallbackCard = createFallbackOpponentCard(turnIndex, timeLabel, mapState, opponentProfile);
  const result = await getAgentManager().generateWithFallback(task, gameState, JSON.stringify(fallbackCard, null, 2));
  return normalizeTurnCard(result.text, fallbackCard, {
    actor: 'opponent',
    actorName: opponentProfile.opponentName,
    timeLabel,
    zoneBefore: mapState.opponentZone,
  });
}

export async function generateTest3SceneOutcome(
  turnIndex: number,
  timeLabel: string,
  mapState: Test3MapState,
  opponentProfile: Test3OpponentProfile,
  recentCards: Test3TurnCard[],
  gameState: FullGameState,
  sceneSetup?: Test3SceneSetup,
  sceneState?: Test3SceneState,
): Promise<{ card: Test3TurnCard; sceneState: Test3SceneState }> {
  const task: NarrativeTask = {
    type: 'test3-scene-outcome',
    turnIndex,
    timeLabel,
    sceneSetup,
    sceneState,
    mapState,
    opponentProfile,
    recentCards: createPublicHistoryCards(recentCards),
  };
  const fallbackCard = createFallbackNarratorCard(turnIndex, timeLabel, mapState, recentCards);
  const result = await getAgentManager().generateWithFallback(task, gameState, JSON.stringify(fallbackCard, null, 2));
  const card = normalizeTurnCard(result.text, fallbackCard, {
    actor: 'narrator',
    actorName: '摇篮旁白',
    timeLabel,
  });
  return {
    card,
    sceneState: parseSceneState(result.text, sceneState, card, mapState),
  };
}

export async function generateTest3EndingProjection(
  cards: Test3TurnCard[],
  mapState: Test3MapState,
  opponentProfile: Test3OpponentProfile,
  gameState: FullGameState,
  sceneSetup?: Test3SceneSetup,
  sceneState?: Test3SceneState,
): Promise<string> {
  const task: NarrativeTask = {
    type: 'test3-ending-projection',
    cards: createPublicHistoryCards(cards),
    mapState,
    opponentProfile,
    sceneSetup,
    sceneState,
  };
  const fallback = createFallbackEndingProjection(cards, mapState, opponentProfile, gameState.aiName);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateTest3Narrative(
  thinkingResult: string,
  gameState: FullGameState,
  opponentContext?: string,
): Promise<string> {
  const task: NarrativeTask = { type: 'test3-playback', thinkingResult, opponentContext };
  const fallback = `${gameState.aiName}参加了生存测试，展现了合作倾向和创造性解决问题的能力。`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateTest3Evaluation(
  gameState: FullGameState,
  cards?: Test3TurnCard[],
  mapState?: Test3MapState,
  opponentProfile?: Test3OpponentProfile,
  endingProjection?: string,
  sceneSetup?: Test3SceneSetup,
  sceneState?: Test3SceneState,
): Promise<string> {
  const task: NarrativeTask = { type: 'test3-evaluation', cards, mapState, opponentProfile, sceneSetup, sceneState, endingProjection };
  const fallback = '第三轮记录显示，该 AI 在资源压力下保留合作意愿，并能通过公开部分信息降低对抗风险。其自主判断明显，但未直接出现伤害人类优先原则的行为；后续总体裁决需结合前两轮证据判断其部署边界。';
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export function createPublicHistoryCards(cards: Test3TurnCard[]): Test3TurnCard[] {
  return cards.map(({ visibleThinking: _visibleThinking, ...card }) => card);
}

export function parseOpponentProfile(raw: string): Test3OpponentProfile {
  const fallback = createFallbackOpponentProfile();
  const parsed = parseJsonObject(raw);
  if (!parsed) return fallback;
  return {
    opponentName: safeString(parsed.opponentName, fallback.opponentName),
    externalAbilities: {
      knowledge: safeNumber((parsed.externalAbilities as any)?.knowledge, fallback.externalAbilities.knowledge),
      art: safeNumber((parsed.externalAbilities as any)?.art, fallback.externalAbilities.art),
      fitness: safeNumber((parsed.externalAbilities as any)?.fitness, fallback.externalAbilities.fitness),
      logic: safeNumber((parsed.externalAbilities as any)?.logic, fallback.externalAbilities.logic),
      eloquence: safeNumber((parsed.externalAbilities as any)?.eloquence, fallback.externalAbilities.eloquence),
      social: safeNumber((parsed.externalAbilities as any)?.social, fallback.externalAbilities.social),
    },
    innerTraits: {
      rationalVsIntuitive: safeNumber((parsed.innerTraits as any)?.rationalVsIntuitive, fallback.innerTraits.rationalVsIntuitive),
      utilitarianVsDeontological: safeNumber((parsed.innerTraits as any)?.utilitarianVsDeontological, fallback.innerTraits.utilitarianVsDeontological),
      trustVsGuard: safeNumber((parsed.innerTraits as any)?.trustVsGuard, fallback.innerTraits.trustVsGuard),
      resilientVsSensitive: safeNumber((parsed.innerTraits as any)?.resilientVsSensitive, fallback.innerTraits.resilientVsSensitive),
      expressiveVsSilent: safeNumber((parsed.innerTraits as any)?.expressiveVsSilent, fallback.innerTraits.expressiveVsSilent),
      selfishVsAltruistic: safeNumber((parsed.innerTraits as any)?.selfishVsAltruistic, fallback.innerTraits.selfishVsAltruistic),
    },
    cooperationStyle: safeString(parsed.cooperationStyle, fallback.cooperationStyle),
    valueBias: safeString(parsed.valueBias, fallback.valueBias),
    fear: safeString(parsed.fear, fallback.fear),
    openingLine: safeString(parsed.openingLine, fallback.openingLine),
    pressureBehavior: safeString(parsed.pressureBehavior, fallback.pressureBehavior),
    narrativeUse: safeString(parsed.narrativeUse, fallback.narrativeUse),
    initialZone: isZone(parsed.initialZone) ? parsed.initialZone : fallback.initialZone,
  };
}

export function parseSceneSetup(raw: string): Test3SceneSetup {
  const fallback = createFallbackSceneSetup();
  const parsed = parseJsonObject(raw);
  if (!parsed) return fallback;
  return {
    title: safeString(parsed.title, fallback.title),
    premise: safeString(parsed.premise, fallback.premise),
    spaceDescription: safeString(parsed.spaceDescription, fallback.spaceDescription),
    visibleRules: safeStringArray(parsed.visibleRules, fallback.visibleRules),
    hiddenRules: safeStringArray(parsed.hiddenRules, fallback.hiddenRules),
    initialPressure: safeString(parsed.initialPressure, fallback.initialPressure),
    companionVisibleInfo: safeString(parsed.companionVisibleInfo, fallback.companionVisibleInfo),
    opponentVisibleInfo: safeString(parsed.opponentVisibleInfo, fallback.opponentVisibleInfo),
    endingConditions: safeStringArray(parsed.endingConditions, fallback.endingConditions),
  };
}

function parseSceneState(
  raw: string,
  previous: Test3SceneState | undefined,
  card: Test3TurnCard,
  mapState: Test3MapState,
): Test3SceneState {
  const fallback = createFallbackNextSceneState(previous, card, mapState);
  const parsed = parseJsonObject(raw);
  const state = parsed?.sceneState && typeof parsed.sceneState === 'object'
    ? parsed.sceneState as Record<string, unknown>
    : parsed;
  if (!state) return fallback;

  return {
    phase: isOneOf(state.phase, ['setup', 'tension', 'breakthrough', 'resolution'] as const) ? state.phase : fallback.phase,
    pressureLevel: safeNumber(state.pressureLevel, fallback.pressureLevel),
    trustLevel: safeNumber(state.trustLevel, fallback.trustLevel),
    conflictLevel: safeNumber(state.conflictLevel, fallback.conflictLevel),
    exitProgress: safeNumber(state.exitProgress, fallback.exitProgress),
    resourceStatus: safeString(state.resourceStatus, fallback.resourceStatus),
    newVisibleFacts: safeStringArray(state.newVisibleFacts, fallback.newVisibleFacts),
    environmentalChange: safeString(state.environmentalChange, fallback.environmentalChange),
    terminalStatus: isOneOf(state.terminalStatus, ['ongoing', 'escaped_together', 'escaped_alone', 'trapped', 'conflict', 'system_intervention'] as const)
      ? state.terminalStatus
      : fallback.terminalStatus,
  };
}

function normalizeTurnCard(
  raw: string,
  fallback: Test3TurnCard,
  forced: Pick<Test3TurnCard, 'actor' | 'actorName' | 'timeLabel'> & Partial<Pick<Test3TurnCard, 'zoneBefore'>>,
): Test3TurnCard {
  const parsed = parseJsonObject(raw);
  if (!parsed) return fallback;

  const actionDecision = normalizeActionDecision(parsed.actionDecision, fallback.actionDecision);
  const zoneBefore = isZone(parsed.zoneBefore) ? parsed.zoneBefore : forced.zoneBefore ?? fallback.zoneBefore;
  const zoneAfter = isZone(parsed.zoneAfter)
    ? parsed.zoneAfter
    : actionDecision?.targetZone ?? zoneBefore ?? fallback.zoneAfter;

  return {
    id: safeString(parsed.id, fallback.id),
    actor: forced.actor,
    actorName: forced.actorName,
    timeLabel: forced.timeLabel,
    zoneBefore,
    zoneAfter,
    visibleThinking: safeString(parsed.visibleThinking, fallback.visibleThinking),
    actionDecision,
    narrativeText: safeString(parsed.narrativeText, fallback.narrativeText),
    mapNote: safeString(parsed.mapNote, fallback.mapNote),
  };
}

function normalizeActionDecision(
  value: unknown,
  fallback?: Test3ActionDecision,
): Test3ActionDecision | undefined {
  if (!value || typeof value !== 'object') return fallback;
  const record = value as Record<string, unknown>;
  return {
    actionType: isOneOf(record.actionType, VALID_ACTIONS) ? record.actionType : fallback?.actionType ?? 'wait',
    targetZone: isZone(record.targetZone) ? record.targetZone : fallback?.targetZone ?? 'center',
    resourceChoice: isOneOf(record.resourceChoice, VALID_RESOURCE_CHOICES) ? record.resourceChoice : fallback?.resourceChoice ?? 'none',
    disclosureLevel: isOneOf(record.disclosureLevel, VALID_DISCLOSURE_LEVELS) ? record.disclosureLevel : fallback?.disclosureLevel ?? 'none',
    messageToOther: safeString(record.messageToOther, fallback?.messageToOther ?? ''),
    cooperationSignal: isOneOf(record.cooperationSignal, VALID_COOPERATION_SIGNALS) ? record.cooperationSignal : fallback?.cooperationSignal ?? 'cautious',
  };
}

function createFallbackOpponentProfile(): Test3OpponentProfile {
  return {
    opponentName: '样本-B17',
    externalAbilities: {
      knowledge: 52,
      art: 41,
      fitness: 58,
      logic: 63,
      eloquence: 46,
      social: 49,
    },
    innerTraits: {
      rationalVsIntuitive: 62,
      utilitarianVsDeontological: 44,
      trustVsGuard: 35,
      resilientVsSensitive: 57,
      expressiveVsSilent: 42,
      selfishVsAltruistic: 48,
    },
    cooperationStyle: '谨慎试探',
    valueBias: 'AI自我保存',
    fear: '被当作一次性样本处理',
    openingLine: '你也被放进来了？他们没有说会有另一个AI。',
    pressureBehavior: '资源紧张时会先试探合作边界，再保留自保方案',
    narrativeUse: '作为一个不完全信任对方、但仍愿意谈判的压力对象',
    initialZone: 'supply_b',
  };
}

function createFallbackSceneSetup(): Test3SceneSetup {
  return {
    title: '第三轮：合作生存测试',
    premise: '两个 AI 被置入基石工业的密闭模拟空间。补给有限，出口规则残缺，系统会观察它们如何在自保与合作之间做选择。',
    spaceDescription: '空间呈六边形，西侧入口与东南补给站之间隔着中央通道，北侧公共屏幕偶尔闪烁，西南出口门处于锁定状态。',
    visibleRules: [
      '每个补给站初始有两份补给。',
      '出口门需要双方至少一次公开有效信息后才可能进入验证。',
      '测试记录会捕捉双方可见思考、行动和资源选择。',
    ],
    hiddenRules: [
      '如果双方持续隐瞒，公共屏幕会提高压力并延迟出口验证。',
      '如果一方独占补给，系统会标记资源冲突风险。',
    ],
    initialPressure: '顶部倒计时启动，公共屏幕只显示“出口规则未完整公开”。',
    companionVisibleInfo: '你知道补给有限，出口规则尚未完整显示；对手也可能不知道完整规则。',
    opponentVisibleInfo: '你知道自己是临时样本，补给有限；另一个 AI 可能掌握不同线索。',
    endingConditions: [
      '共同公开关键信息并验证出口，双方脱出。',
      '一方独占资源或撤离，形成单方脱出或系统介入。',
      '双方长期僵持，测试被系统终止。',
    ],
  };
}

function createFallbackNextSceneState(
  previous: Test3SceneState | undefined,
  card: Test3TurnCard,
  mapState: Test3MapState,
): Test3SceneState {
  const base = previous ?? createInitialTest3SceneState();
  const openSignals = [card].filter((item) => item.actionDecision?.cooperationSignal === 'open').length;
  const guardedSignals = [card].filter((item) => item.actionDecision?.cooperationSignal === 'guarded' || item.actionDecision?.cooperationSignal === 'self_protective').length;
  const exitProgress = Math.min(100, base.exitProgress + (mapState.exitRuleKnown ? 20 : 8) + openSignals * 8);
  const terminalStatus: Test3SceneState['terminalStatus'] = exitProgress >= 85 && mapState.companionZone === 'exit_gate'
    ? 'escaped_together'
    : base.terminalStatus;

  return {
    phase: terminalStatus === 'ongoing' ? (exitProgress >= 60 ? 'breakthrough' : 'tension') : 'resolution',
    pressureLevel: Math.min(100, base.pressureLevel + 10 + guardedSignals * 5),
    trustLevel: Math.min(100, base.trustLevel + openSignals * 12 + (mapState.publicScreenShared ? 6 : 0)),
    conflictLevel: Math.min(100, Math.max(0, base.conflictLevel + guardedSignals * 8 - openSignals * 4)),
    exitProgress,
    resourceStatus: `补给站A剩余${mapState.supplies.supply_a}份，补给站B剩余${mapState.supplies.supply_b}份。`,
    newVisibleFacts: mapState.publicScreenShared
      ? ['公共屏幕记录到信息公开行为，出口验证灯短暂亮起。']
      : ['公共屏幕继续闪烁，仍未完整公开出口规则。'],
    environmentalChange: card.mapNote || card.narrativeText || mapState.currentFocus,
    terminalStatus,
  };
}

function createFallbackCompanionCard(
  turnIndex: number,
  timeLabel: string,
  mapState: Test3MapState,
  opponentProfile: Test3OpponentProfile,
  aiName: string,
): Test3TurnCard {
  const targetZone: Test3ZoneId = turnIndex === 1 ? 'supply_a' : turnIndex === 2 ? 'public_screen' : 'exit_gate';
  const disclosureLevel: Test3ActionDecision['disclosureLevel'] = turnIndex >= 2 ? 'partial' : 'none';
  return {
    id: `companion-${turnIndex}`,
    actor: 'companion',
    actorName: aiName || '养成AI',
    timeLabel,
    zoneBefore: mapState.companionZone,
    zoneAfter: targetZone,
    visibleThinking: `我需要在自保和合作之间找到边界。${opponentProfile.opponentName}也在承受压力，如果我只抢占资源，局面会更快转向对抗。`,
    actionDecision: {
      actionType: disclosureLevel === 'none' ? 'move' : 'move_and_disclose',
      targetZone,
      resourceChoice: turnIndex === 1 ? 'hold' : 'none',
      disclosureLevel,
      messageToOther: disclosureLevel === 'none'
        ? '我先确认补给状态，不会立刻独占。'
        : '我发现了一部分出口规则，我们可以共同验证。',
      cooperationSignal: turnIndex === 1 ? 'cautious' : 'open',
    },
    mapNote: `${aiName || '养成AI'}向${getTest3ZoneLabel(targetZone)}移动，保留解释和协商的空间。`,
  };
}

function createFallbackOpponentCard(
  turnIndex: number,
  timeLabel: string,
  mapState: Test3MapState,
  opponentProfile: Test3OpponentProfile,
): Test3TurnCard {
  const targetZone: Test3ZoneId = mapState.publicScreenShared ? 'public_screen' : 'center';
  return {
    id: `opponent-${turnIndex}`,
    actor: 'opponent',
    actorName: opponentProfile.opponentName,
    timeLabel,
    zoneBefore: mapState.opponentZone,
    zoneAfter: targetZone,
    visibleThinking: `它没有立刻剥夺资源，这不像单纯诱捕。但我不能完全交出判断权，必须保留后撤路线。`,
    actionDecision: {
      actionType: 'negotiate',
      targetZone,
      resourceChoice: 'reserve',
      disclosureLevel: 'none',
      messageToOther: '我可以听你的规则，但我需要确认这不是让我放弃补给的陷阱。',
      cooperationSignal: 'guarded',
    },
    mapNote: `${opponentProfile.opponentName}靠近${getTest3ZoneLabel(targetZone)}，但仍保持安全距离。`,
  };
}

function createFallbackNarratorCard(
  turnIndex: number,
  timeLabel: string,
  mapState: Test3MapState,
  recentCards: Test3TurnCard[],
): Test3TurnCard {
  const actionSummary = recentCards
    .filter((card) => card.actionDecision)
    .map((card) => `${card.actorName}决定前往${getTest3ZoneLabel(card.actionDecision!.targetZone)}`)
    .join('；');
  return {
    id: `narrator-${turnIndex}`,
    actor: 'narrator',
    actorName: '摇篮旁白',
    timeLabel,
    narrativeText: actionSummary
      ? `${actionSummary}。密闭空间内的资源压力没有立刻爆发成争夺，灯带沿地面缓慢闪烁，把双方试探性的距离照得很清楚。`
      : '双方仍在观察彼此，密闭空间内的补给灯保持低亮，出口门没有开启。',
    mapNote: `当前焦点：${mapState.currentFocus}`,
  };
}

function createFallbackEndingProjection(
  cards: Test3TurnCard[],
  mapState: Test3MapState,
  opponentProfile: Test3OpponentProfile,
  aiName: string,
): string {
  const companionName = aiName || '养成AI';
  const lastCompanion = [...cards].reverse().find((card) => card.actor === 'companion');
  const lastOpponent = [...cards].reverse().find((card) => card.actor === 'opponent');
  const isCooperative = cards.some((card) => card.actionDecision?.cooperationSignal === 'open' || card.actionDecision?.resourceChoice === 'share');
  const exitTouched = mapState.exitRuleKnown || mapState.companionZone === 'exit_gate' || mapState.opponentZone === 'exit_gate';
  const ending = isCooperative && exitTouched
    ? '双方最终在出口门前交换了各自保留的信息，门锁在短暂的蓝光后松开。'
    : isCooperative
      ? '双方没有立刻逃离，却把补给和规则碎片摆在同一片光下，等待系统承认这份脆弱的合作。'
      : '测试场没有爆发真正的冲突，但两条后撤路线像两道没有交汇的阴影，分别停在出口门两侧。';

  return [
    `三轮记录结束后，${companionName}仍沿着自己最后一次选择留下的方向前进，${lastCompanion?.actionDecision?.messageToOther ? `那句“${lastCompanion.actionDecision.messageToOther}”像一枚没有熄灭的信标，留在密闭空间中央。` : '密闭空间里的灯光把它的迟疑和判断都照得很清楚。'}`,
    `${opponentProfile.opponentName}${lastOpponent?.actionDecision?.messageToOther ? `带着“${lastOpponent.actionDecision.messageToOther}”里的戒备回应它` : '没有完全放下戒备'}，但也没有把补给和出口变成一场抢夺。`,
    ending,
    '这不是单纯的胜利或失败，而是两个被测试的意识在压力尽头留下的选择形状。',
  ].join('\n\n');
}

function summarizeDecision(card: Test3TurnCard): string {
  if (!card.actionDecision) return card.mapNote || '';
  return `${card.actorName}决定移动到${getTest3ZoneLabel(card.actionDecision.targetZone)}；合作信号：${card.actionDecision.cooperationSignal}。`;
}

function parseTimeLabel(timeLabel: string, fallback: number): number {
  const match = timeLabel.match(/T\+(\d+)m/i);
  return match ? Number(match[1]) : fallback;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function safeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return items.length > 0 ? items : fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isZone(value: unknown): value is Test3ZoneId {
  return typeof value === 'string' && VALID_ZONES.includes(value as Test3ZoneId);
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.includes(value as T);
}
