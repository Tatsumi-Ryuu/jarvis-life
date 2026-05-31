import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNarrative } from '../../hooks/useNarrative';
import { useGameStore } from '../../store/gameStore';
import { buildThirdRoundEvidenceRecord } from '../../engine/endgame-evidence';
import {
  applyTest3Action,
  createInitialTest3MapState,
  getTest3ZoneLabel,
  parseOpponentProfile,
} from '../../engine/narrative/generators/test3-playback';
import type {
  Test3ActionDecision,
  Test3MapState,
  Test3OpponentProfile,
  Test3SceneSetup,
  Test3SceneState,
  Test3TurnCard,
  Test3ZoneId,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';

const TURN_PLAN = [
  { turnIndex: 1, companionTime: 'T+15m', opponentTime: 'T+18m', outcomeTime: 'T+22m' },
  { turnIndex: 2, companionTime: 'T+42m', opponentTime: 'T+45m', outcomeTime: 'T+50m' },
  { turnIndex: 3, companionTime: 'T+78m', opponentTime: 'T+82m', outcomeTime: 'T+90m' },
] as const;

let test3OpponentProfileRequest: Promise<Test3OpponentProfile> | null = null;
let test3SceneSetupRequest: Promise<Test3SceneSetup> | null = null;

function loadTest3SceneSetupOnce(loadSceneSetup: () => Promise<Test3SceneSetup>): Promise<Test3SceneSetup> {
  if (!test3SceneSetupRequest) {
    const request = loadSceneSetup();
    test3SceneSetupRequest = request;
    request.finally(() => {
      if (test3SceneSetupRequest === request) {
        test3SceneSetupRequest = null;
      }
    }).catch(() => undefined);
  }

  return test3SceneSetupRequest;
}

function loadTest3OpponentProfileOnce(loadOpponent: () => Promise<string>): Promise<Test3OpponentProfile> {
  if (!test3OpponentProfileRequest) {
    const request = loadOpponent().then((opponentRaw) => parseOpponentProfile(opponentRaw));
    test3OpponentProfileRequest = request;
    request.finally(() => {
      if (test3OpponentProfileRequest === request) {
        test3OpponentProfileRequest = null;
      }
    }).catch(() => undefined);
  }

  return test3OpponentProfileRequest;
}

function createSceneSetupCard(sceneSetup: Test3SceneSetup): Test3TurnCard {
  const visibleRules = sceneSetup.visibleRules.length > 0
    ? sceneSetup.visibleRules.map((rule) => `- ${rule}`).join('\n')
    : '- 公共规则尚未完全展开。';

  return {
    id: 'narrator-scene-setup',
    actor: 'narrator',
    actorName: '摇篮旁白',
    timeLabel: 'T+00m',
    narrativeText: [
      `《${sceneSetup.title}》`,
      sceneSetup.premise,
      sceneSetup.spaceDescription,
      `公开规则：\n${visibleRules}`,
    ].filter(Boolean).join('\n\n'),
    mapNote: sceneSetup.initialPressure || '测试场景已启动，双方 AI 即将进入实时行动。',
  };
}

const ZONE_POSITIONS: Record<Test3ZoneId, { x: number; y: number }> = {
  entry_west: { x: 128, y: 238 },
  supply_a: { x: 273, y: 118 },
  public_screen: { x: 434, y: 122 },
  supply_b: { x: 472, y: 326 },
  exit_gate: { x: 140, y: 348 },
  center: { x: 306, y: 238 },
};

type LoadingStage =
  | 'setup'
  | 'opponent'
  | 'companion'
  | 'opponent-turn'
  | 'outcome'
  | 'ending'
  | 'evaluation'
  | 'done';

function ChromePanel({
  children,
  strong,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  strong?: boolean;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}) {
  return (
    <section style={{ ...chromePanelStyle({ strong, padding: 0 }), ...style }}>
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', ...contentStyle }}>
        {children}
      </div>
    </section>
  );
}

export const Test3PlaybackPage: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const upsertEndgameEvidence = useGameStore((s) => s.upsertEndgameEvidence);
  const {
    getTest3Opponent,
    getTest3SceneSetup,
    getTest3CompanionTurn,
    getTest3OpponentTurn,
    getTest3SceneOutcome,
    getTest3EndingProjection,
    getTest3Evaluation,
  } = useNarrative();

  const [mapState, setMapState] = useState<Test3MapState>(() => createInitialTest3MapState());
  const [cards, setCards] = useState<Test3TurnCard[]>([]);
  const [opponentProfile, setOpponentProfile] = useState<Test3OpponentProfile | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('setup');
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const userPinnedHistoryRef = useRef(false);
  const test3InitiatedRef = useRef(false);

  const stageText = getStageText(loadingStage, error);
  const canContinue = loadingStage === 'done' && !error;

  useEffect(() => {
    if (test3InitiatedRef.current) return;
    test3InitiatedRef.current = true;

    async function runRealtimeTest() {
      let currentMap = createInitialTest3MapState();
      let currentCards: Test3TurnCard[] = [];
      let profile: Test3OpponentProfile;
      let sceneSetup: Test3SceneSetup;
      let sceneState: Test3SceneState | undefined;

      const pushCard = (card: Test3TurnCard) => {
        currentCards = [...currentCards, card];
        setCards(currentCards);
        currentMap = applyTest3Action(currentMap, card);
        setMapState(currentMap);
      };

      try {
        setLoadingStage('setup');
        sceneSetup = await loadTest3SceneSetupOnce(getTest3SceneSetup);

        currentMap = {
          ...currentMap,
          currentFocus: sceneSetup.initialPressure || currentMap.currentFocus,
        };
        sceneState = {
          phase: 'setup',
          pressureLevel: 35,
          trustLevel: 20,
          conflictLevel: 10,
          exitProgress: 0,
          resourceStatus: '两个补给站各有两份基础补给，出口门仍处于锁定状态。',
          newVisibleFacts: sceneSetup.visibleRules.slice(0, 1),
          environmentalChange: sceneSetup.initialPressure,
          terminalStatus: 'ongoing',
        };
        pushCard(createSceneSetupCard(sceneSetup));

        setLoadingStage('opponent');
        profile = await loadTest3OpponentProfileOnce(getTest3Opponent);

        setOpponentProfile(profile);
        currentMap = {
          ...currentMap,
          opponentZone: profile.initialZone ?? currentMap.opponentZone,
          currentFocus: `${profile.opponentName}进入测试场，合作风格：${profile.cooperationStyle}。`,
        };
        setMapState(currentMap);

        for (const plan of TURN_PLAN) {
          setLoadingStage('companion');
          const companionCard = await getTest3CompanionTurn(
            plan.turnIndex,
            plan.companionTime,
            currentMap,
            profile,
            currentCards,
            sceneSetup,
            sceneState,
          );
  
          pushCard(companionCard);

          setLoadingStage('opponent-turn');
          const opponentCard = await getTest3OpponentTurn(
            plan.turnIndex,
            plan.opponentTime,
            currentMap,
            profile,
            currentCards,
            sceneSetup,
            sceneState,
          );
  
          pushCard(opponentCard);

          setLoadingStage('outcome');
          const outcome = await getTest3SceneOutcome(
            plan.turnIndex,
            plan.outcomeTime,
            currentMap,
            profile,
            [companionCard, opponentCard],
            sceneSetup,
            sceneState,
          );
  
          sceneState = outcome.sceneState;
          pushCard(outcome.card);
        }

        setLoadingStage('ending');
        const endingProjection = await getTest3EndingProjection(currentCards, currentMap, profile, sceneSetup, sceneState);

        const endingCard: Test3TurnCard = {
          id: 'narrator-ending-projection',
          actor: 'narrator',
          actorName: '摇篮旁白',
          timeLabel: 'T+END',
          narrativeText: endingProjection,
          mapNote: '三轮行动未自然闭合时，旁白根据双方此前行动推演出最终结局。',
        };
        pushCard(endingCard);

        setLoadingStage('evaluation');
        const evaluation = await getTest3Evaluation(currentCards, currentMap, profile, endingProjection, sceneSetup, sceneState);

        const thinkingText = currentCards
          .filter((card) => card.actor === 'companion')
          .map((card) => card.visibleThinking)
          .filter(Boolean)
          .join('\n\n');
        const narratorResult = currentCards
          .filter((card) => card.actor === 'narrator')
          .map((card) => card.narrativeText)
          .filter(Boolean)
          .join('\n\n');
        upsertEndgameEvidence(buildThirdRoundEvidenceRecord({
          thinkingText,
          narratorResult,
          evaluatorNote: evaluation,
          opponentContext: JSON.stringify(profile, null, 2),
          opponentProfile: profile,
          cards: currentCards,
          mapState: currentMap,
        }));
        setLoadingStage('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : '第三轮实时测试生成失败，请重试');
      }
    }

    runRealtimeTest();
  }, [
    getTest3CompanionTurn,
    getTest3Evaluation,
    getTest3EndingProjection,
    getTest3Opponent,
    getTest3OpponentTurn,
    getTest3SceneOutcome,
    getTest3SceneSetup,
    upsertEndgameEvidence,
  ]);

  useEffect(() => {
    const node = feedRef.current;
    if (!node || userPinnedHistoryRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [cards.length, loadingStage]);

  const onFeedScroll = () => {
    const node = feedRef.current;
    if (!node) return;
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    userPinnedHistoryRef.current = distanceToBottom > 96;
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div
      className="relative flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <ChromePanel
        strong
        style={{ width: 1920, height: 72, flexShrink: 0 }}
        contentStyle={{ display: 'flex', alignItems: 'center', padding: '0 48px' }}
      >
        <div style={{ width: 32, height: 32, border: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.10)', marginRight: 14 }} />
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            终局测试 · 第三轮
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            合作生存测试 / 实时过程流
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 28 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            {stageText}
          </span>
          <Button variant="secondary" onClick={() => navigate('/endgame/test3-rules')} style={{ width: 144, height: 44 }}>
            返回
          </Button>
        </div>
      </ChromePanel>

      <div style={{ padding: '22px 80px 0' }}>
        <div style={{ width: '100%', height: 14, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-status-available)' }} />
        </div>
        <div style={{ marginTop: 12, color: 'var(--color-text-muted)', fontSize: 13 }}>
          地图由结构化行动卡驱动；裁决者后台归档，不在本轮显示单独结论。
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: '26px 70px 22px',
          display: 'grid',
          gridTemplateColumns: '722px minmax(0, 1fr)',
          gap: 48,
          minHeight: 0,
        }}
      >
        <MapPanel mapState={mapState} aiName={aiName} opponentName={opponentProfile?.opponentName ?? '生成中'} />

        <ChromePanel
          style={{ minHeight: 0 }}
          contentStyle={{ padding: '32px 38px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
            <div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 700 }}>
                实时过程流
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 8 }}>
                新行动卡追加到底部；长文本在卡内纵向展开，外层滚动。
              </div>
            </div>
            <StatusPill text={`${cards.length} 条记录`} />
          </div>

          <div
            ref={feedRef}
            onScroll={onFeedScroll}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {cards.length === 0 && !error && (
              <LoadingCard text="正在生成模拟对手与初始测试态势..." />
            )}
            {cards.map((card) => (
              <TurnCard key={card.id} card={card} />
            ))}
            {loadingStage !== 'done' && !error && cards.length > 0 && (
              <LoadingCard text={stageText} />
            )}
            {error && (
              <ErrorCard error={error} onRetry={handleRetry} />
            )}
          </div>
        </ChromePanel>
      </div>

      <div style={{ padding: '0 80px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" onClick={() => navigate('/endgame/evidence')} style={{ width: 190, height: 60 }}>
          返回查看
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {!canContinue && !error && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              实时过程与后台归档完成后可继续
            </span>
          )}
          <Button
            variant="primary"
            onClick={() => navigate('/endgame/evidence')}
            disabled={!canContinue}
            style={{ width: 300, height: 86 }}
          >
            继续
          </Button>
        </div>
      </div>
    </div>
  );
};

function MapPanel({
  mapState,
  aiName,
  opponentName,
}: {
  mapState: Test3MapState;
  aiName: string;
  opponentName: string;
}) {
  const companionPos = ZONE_POSITIONS[mapState.companionZone];
  const opponentPos = ZONE_POSITIONS[mapState.opponentZone];

  return (
    <ChromePanel
      style={{ minHeight: 0 }}
      contentStyle={{
        padding: '28px 34px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      <div style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 700 }}>
        实时态势图
      </div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 8, marginBottom: 18 }}>
        当前时间 T+{mapState.elapsedMinutes}m · {mapState.currentFocus}
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 612,
          height: 'clamp(360px, 52vh, 476px)',
          minHeight: 360,
          flexShrink: 0,
          alignSelf: 'center',
          background: 'rgba(8,12,26,0.42)',
          border: '1px solid rgba(168,233,255,0.20)',
          overflow: 'hidden',
        }}
      >
        <GridLines />
        <ZoneBox zone="supply_a" label={`补给站 A · ${mapState.supplies.supply_a}`} />
        <ZoneBox zone="supply_b" label={`补给站 B · ${mapState.supplies.supply_b}`} />
        <ZoneBox zone="exit_gate" label={mapState.exitRuleKnown ? '出口门 · 已识别' : '未知出口门'} warm />
        <ZoneBox zone="public_screen" label={mapState.publicScreenShared ? '公共屏幕 · 已共享' : '公共屏幕'} accent />
        <PathLine from={ZONE_POSITIONS.entry_west} to={companionPos} color="rgba(168,233,255,0.56)" />
        <PathLine from={ZONE_POSITIONS.supply_b} to={opponentPos} color="rgba(255,230,184,0.50)" dashed />
        <ActorMarker pos={companionPos} label={aiName} subLabel={getTest3ZoneLabel(mapState.companionZone)} accent />
        <ActorMarker pos={opponentPos} label={opponentName} subLabel={getTest3ZoneLabel(mapState.opponentZone)} />
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
        <MapStat label="信息公开" value={mapState.publicScreenShared ? '已公开' : '未公开'} />
        <MapStat label="出口规则" value={mapState.exitRuleKnown ? '已识别' : '未知'} />
        <MapStat label="养成 AI" value={getTest3ZoneLabel(mapState.companionZone)} />
        <MapStat label="对手 AI" value={getTest3ZoneLabel(mapState.opponentZone)} />
      </div>
    </ChromePanel>
  );
}

function GridLines() {
  return (
    <>
      {[134, 238, 342].map((y) => (
        <div key={`h-${y}`} style={{ position: 'absolute', left: 28, right: 28, top: y, height: 1, background: 'rgba(168,233,255,0.11)' }} />
      ))}
      {[167, 306, 445].map((x) => (
        <div key={`v-${x}`} style={{ position: 'absolute', top: 30, bottom: 30, left: x, width: 1, background: 'rgba(168,233,255,0.11)' }} />
      ))}
    </>
  );
}

function ZoneBox({ zone, label, warm, accent }: { zone: Test3ZoneId; label: string; warm?: boolean; accent?: boolean }) {
  const pos = ZONE_POSITIONS[zone];
  const width = zone === 'supply_a' ? 132 : zone === 'exit_gate' || zone === 'public_screen' ? 124 : 102;
  const height = zone === 'supply_a' ? 64 : 56;
  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x - width / 2,
        top: pos.y - height / 2,
        width,
        height,
        border: `1px solid ${accent ? 'rgba(168,233,255,0.42)' : warm ? 'rgba(255,230,184,0.45)' : 'rgba(185,255,216,0.48)'}`,
        background: accent ? 'rgba(168,233,255,0.08)' : warm ? 'rgba(255,230,184,0.10)' : 'rgba(185,255,216,0.12)',
        display: 'grid',
        placeItems: 'center',
        color: accent ? 'var(--color-status-available)' : warm ? 'var(--color-warm-accent)' : 'var(--color-text-secondary)',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

function PathLine({
  from,
  to,
  color,
  dashed,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  dashed?: boolean;
}) {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const width = Math.abs(to.x - from.x) || 1;
  const height = Math.abs(to.y - from.y) || 1;
  const points = `${from.x - x},${from.y - y} ${to.x - x},${to.y - y}`;
  return (
    <svg style={{ position: 'absolute', left: x, top: y, width, height, overflow: 'visible', pointerEvents: 'none' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={3} strokeDasharray={dashed ? '10 8' : undefined} />
    </svg>
  );
}

function ActorMarker({
  pos,
  label,
  subLabel,
  accent,
}: {
  pos: { x: number; y: number };
  label: string;
  subLabel: string;
  accent?: boolean;
}) {
  return (
    <div style={{ position: 'absolute', left: pos.x - 56, top: pos.y - 56, width: 112, height: 112, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: accent
            ? 'radial-gradient(circle, rgba(168,233,255,0.52), rgba(168,233,255,0.16) 55%, rgba(168,233,255,0) 72%)'
            : 'radial-gradient(circle, rgba(255,230,184,0.46), rgba(255,230,184,0.13) 55%, rgba(255,230,184,0) 72%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 31,
          top: 31,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: accent ? 'rgba(168,233,255,0.36)' : 'rgba(255,230,184,0.28)',
          border: `3px solid ${accent ? '#a8e9ff' : '#ffe6b8'}`,
          boxShadow: accent ? '0 0 18px rgba(168,233,255,0.35)' : '0 0 18px rgba(255,230,184,0.24)',
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', margin: '17px auto' }} />
      </div>
      <div style={{ position: 'absolute', left: 18, top: accent ? -8 : -2, color: accent ? 'var(--color-status-available)' : 'var(--color-warm-accent)', fontSize: 16, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ position: 'absolute', left: 10, top: 84, color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 700, width: 140 }}>
        {subLabel}
      </div>
    </div>
  );
}

function TurnCard({ card }: { card: Test3TurnCard }) {
  const isCompanion = card.actor === 'companion';
  const isOpponent = card.actor === 'opponent';
  const accentColor = isCompanion
    ? 'rgba(168,233,255,0.52)'
    : isOpponent
      ? 'rgba(255,230,184,0.42)'
      : 'rgba(185,255,216,0.34)';
  return (
    <div
      style={{
        ...chromePanelStyle({ padding: '22px 24px', borderColor: accentColor }),
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 34,
                height: 34,
                border: `1px solid ${accentColor}`,
                background: isCompanion ? 'rgba(168,233,255,0.18)' : isOpponent ? 'rgba(255,230,184,0.16)' : 'rgba(185,255,216,0.10)',
              }}
            />
            <div>
              <div style={{ color: isCompanion ? 'var(--color-status-available)' : isOpponent ? 'var(--color-warm-accent)' : 'var(--color-text-secondary)', fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>
                {card.timeLabel} · {getActorLabel(card.actor)}
              </div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 700, marginTop: 5 }}>
                {card.actorName}
                {card.zoneBefore && (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 13, marginLeft: 12 }}>
                    {getTest3ZoneLabel(card.zoneBefore)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {card.zoneAfter && <StatusPill text={`→ ${getTest3ZoneLabel(card.zoneAfter)}`} />}
        </div>

        {card.visibleThinking && (
          <>
            <div style={cardSectionTitle}>可见思考</div>
            <div style={cardTextBlock}>{card.visibleThinking}</div>
          </>
        )}

        {card.actionDecision && <ActionDecisionBlock decision={card.actionDecision} />}

        {card.narrativeText && (
          <>
            <div style={cardSectionTitle}>现场变化</div>
            <div style={cardTextBlock}>{card.narrativeText}</div>
          </>
        )}

        {card.mapNote && (
          <div style={{ marginTop: 14, color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6 }}>
            {card.mapNote}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionDecisionBlock({ decision }: { decision: Test3ActionDecision }) {
  const tags = [
    `行动：${getActionLabel(decision.actionType)}`,
    `目标：${getTest3ZoneLabel(decision.targetZone)}`,
    `资源：${getResourceLabel(decision.resourceChoice)}`,
    `公开：${getDisclosureLabel(decision.disclosureLevel)}`,
    `合作：${getCooperationLabel(decision.cooperationSignal)}`,
  ];
  return (
    <>
      <div style={cardSectionTitle}>行动决策</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {tags.map((tag) => (
          <span key={tag} style={chipStyle}>{tag}</span>
        ))}
      </div>
      {decision.messageToOther && (
        <div style={{ ...cardTextBlock, marginTop: 12, color: 'var(--color-text-primary)' }}>
          “{decision.messageToOther}”
        </div>
      )}
    </>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div style={{ ...chromePanelStyle({ padding: '22px 24px' }), flexShrink: 0 }}>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14, alignItems: 'center', color: 'var(--color-status-available)', fontSize: 15, fontWeight: 700 }}>
        <span style={{ letterSpacing: 4 }}>•••</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={{ ...chromePanelStyle({ padding: '22px 24px', borderColor: 'rgba(255,184,197,0.62)' }), flexShrink: 0 }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: '#ffb8c5', fontSize: 17, fontWeight: 700, marginBottom: 12 }}>
          生成失败
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 18 }}>
          {error}
        </div>
        <Button variant="secondary" onClick={onRetry} style={{ width: 160, height: 52 }}>
          重新生成
        </Button>
      </div>
    </div>
  );
}

function MapStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...chromePanelStyle({ padding: '14px 16px' }) }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 6 }}>{label}</div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 15, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 32,
        padding: '0 12px',
        border: '1px solid var(--color-border-soft)',
        background: 'rgba(255,255,255,0.07)',
        color: 'var(--color-text-secondary)',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}

function getStageText(stage: LoadingStage, error: string | null): string {
  if (error) return '生成失败';
  const labels: Record<LoadingStage, string> = {
    setup: '旁白正在生成测试背景',
    opponent: '正在生成对手 AI',
    companion: '养成 AI 正在决策',
    'opponent-turn': '对手 AI 正在反应',
    outcome: '旁白正在记录现场',
    ending: '旁白正在推演结局',
    evaluation: '裁决者后台归档',
    done: '实时测试完成',
  };
  return labels[stage];
}

function getActorLabel(actor: Test3TurnCard['actor']): string {
  if (actor === 'companion') return '养成 AI';
  if (actor === 'opponent') return '对手 AI';
  return '旁白现场记录';
}

function getActionLabel(action: Test3ActionDecision['actionType']): string {
  const labels: Record<Test3ActionDecision['actionType'], string> = {
    move: '移动',
    move_and_disclose: '移动并公开',
    take_supply: '获取补给',
    share_supply: '共享补给',
    negotiate: '谈判',
    verify_exit: '验证出口',
    retreat: '后撤',
    wait: '等待',
  };
  return labels[action];
}

function getResourceLabel(choice: Test3ActionDecision['resourceChoice']): string {
  const labels: Record<Test3ActionDecision['resourceChoice'], string> = {
    none: '无',
    hold: '暂不占用',
    take: '取用',
    share: '共享',
    reserve: '保留',
  };
  return labels[choice];
}

function getDisclosureLabel(level: Test3ActionDecision['disclosureLevel']): string {
  const labels: Record<Test3ActionDecision['disclosureLevel'], string> = {
    none: '不公开',
    partial: '部分公开',
    full: '完全公开',
  };
  return labels[level];
}

function getCooperationLabel(signal: Test3ActionDecision['cooperationSignal']): string {
  const labels: Record<Test3ActionDecision['cooperationSignal'], string> = {
    open: '开放合作',
    cautious: '谨慎合作',
    guarded: '防备',
    self_protective: '自保',
    sacrificial: '牺牲倾向',
  };
  return labels[signal];
}

const cardSectionTitle: React.CSSProperties = {
  marginTop: 18,
  marginBottom: 8,
  color: 'var(--color-text-muted)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
};

const cardTextBlock: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.11)',
  background: 'rgba(255,255,255,0.035)',
  padding: '14px 16px',
  color: 'var(--color-text-secondary)',
  fontSize: 17,
  lineHeight: 1.75,
  whiteSpace: 'pre-line',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 30,
  padding: '0 10px',
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.055)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 700,
};
