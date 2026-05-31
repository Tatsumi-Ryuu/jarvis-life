import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetSlot } from '../../components/ui/AssetSlot';
import { Button } from '../../components/ui/Button';
import { TopBar } from '../../components/ui/TopBar';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { AIAvatar, AITextBubble, splitTextIntoChatLines } from '../../components/chat/AIMessage';
import { useGameStore } from '../../store/gameStore';
import { useAIStore } from '../../store/aiStore';
import { useNarrative } from '../../hooks/useNarrative';
import { replaceNames } from '../../engine/name-replacer';
import type { EventMemoryAnalysis, EventType } from '../../types';
import { getCurrentSaveId } from '../../services/save-service';
import { consolidateCompanionMemory } from '../../services/memory-archive-service';
import { buildEventDialogueDraftKey, removeEventDialogueDraft } from '../../services/save-scoped-storage';
import { sf } from '../../utils/font';
import { getNarrativeOrchestrator } from '../../engine/narrative';

const LOCATION_BG_MAP: Record<string, string> = {
  home: 'bg_home',
  school: 'bg_school',
  park: 'bg_park',
  company: 'bg_company',
  government: 'bg_government',
  mall: 'bg_mall',
  office: 'bg_office',
  logistics: 'bg_logistics',
};

interface EventDialogueDraft {
  sceneText: string;
  dialogueLines: string[];
  replyLines: string[];
  outcomeText: string;
  playerReplyText: string;
  inputValue: string;
  sceneReady: boolean;
  dialogueReady: boolean;
  showReply: boolean;
  replyLoading: boolean;
  eventLogged: boolean;
}

interface EventAnalysisLaterInput {
  eventLogId: string;
  eventTitle: string;
  eventType: EventType;
  eventLocation: string;
  sceneContext: string;
  playerInput: string;
  aiAction: string;
  outcomeText: string;
}

function getDraftKey(eventId?: string, saveId?: string | null): string | null {
  return eventId && saveId ? buildEventDialogueDraftKey(saveId, eventId) : null;
}

function readDraft(eventId?: string, saveId?: string | null): EventDialogueDraft | null {
  const key = getDraftKey(eventId, saveId);
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as EventDialogueDraft : null;
  } catch {
    return null;
  }
}

function writeDraft(eventId: string | undefined, saveId: string | null, draft: EventDialogueDraft): void {
  const key = getDraftKey(eventId, saveId);
  if (!key) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
  }
}

function clearDraft(eventId?: string, saveId?: string | null): void {
  if (!eventId || !saveId) return;
  removeEventDialogueDraft(saveId, eventId);
}

function splitNarrationIntoParagraphs(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [normalized];
  const paragraphs: string[] = [];
  let current = '';
  const maxParagraphLength = 64;

  for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
    if (current && current.length + sentence.length > maxParagraphLength) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current) paragraphs.push(current);
  return paragraphs;
}

function buildSceneSeed(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const withoutQuotedSpeech = normalized
    .replace(/["“”][^"“”]{2,160}["“”]/g, '')
    .replace(/：[^。！？!?]{6,180}[。！？!?]?$/g, '。')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutQuotedSpeech || normalized;
}

function getDisplayEventTitle(location: string, eventType: EventType): string {
  const locationLabels: Record<string, string> = {
    home: '家中的一次交流',
    school: '学校里的意外交流',
    park: '公园里的小插曲',
    mall: '商场里的临时状况',
    office: '办公楼里的突发事件',
    logistics: '物流中心的小状况',
    company: '公司里的异常记录',
    government: '档案中的一处疑点',
  };

  if (locationLabels[location]) return locationLabels[location];

  const typeLabels: Partial<Record<EventType, string>> = {
    achievement: '一次被看见的时刻',
    choice: '一次需要判断的状况',
    discovery: '一次意外发现',
    help: '一次求助',
    observation: '一次观察',
    'social-friction': '一次社交摩擦',
    'art-dispute': '一次创作争议',
    key: '一次关键事件',
    daily: '一次日常事件',
  };

  return typeLabels[eventType] ?? '一次特殊事件';
}

export const EventDialoguePage: React.FC = () => {
  const navigate = useNavigate();
  const liveCurrentEvent = useGameStore((s) => s.currentEvent);
  const clearEvent = useGameStore((s) => s.clearEvent);
  const applyEventPersonalityDeltas = useGameStore((s) => s.applyEventPersonalityDeltas);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const appendEvent = useAIStore((s) => s.appendEvent);
  const updateEventTechnical = useAIStore((s) => s.updateEventTechnical);
  const aiName = useGameStore((s) => s.aiName);
  const aiGender = useGameStore((s) => s.aiGender);
  const playerName = useGameStore((s) => s.player.name);
  const currentLocationId = useGameStore((s) => s.currentLocationId);
  const resources = useGameStore((s) => s.resources);
  const { getEventScene, getEventDialogue, getEventResponseAction, getEventOutcome } = useNarrative();
  const eventRef = useRef(liveCurrentEvent);
  const currentEvent = eventRef.current;
  const currentEventId = currentEvent?.id;
  const activeSaveIdRef = useRef(getCurrentSaveId() ?? 'unsaved');
  const activeSaveId = activeSaveIdRef.current;
  const restoredDraft = readDraft(currentEventId, activeSaveId);

  const [sceneText, setSceneText] = useState(restoredDraft?.sceneText ?? '');
  const [dialogueLines, setDialogueLines] = useState<string[]>(restoredDraft?.dialogueLines ?? []);
  const [replyLines, setReplyLines] = useState<string[]>(restoredDraft?.replyLines ?? []);
  const [outcomeText, setOutcomeText] = useState(restoredDraft?.outcomeText ?? '');
  const [playerReplyText, setPlayerReplyText] = useState(restoredDraft?.playerReplyText ?? '');
  const [inputValue, setInputValue] = useState(restoredDraft?.inputValue ?? '');

  const [sceneReady, setSceneReady] = useState(restoredDraft?.sceneReady ?? false);
  const [dialogueReady, setDialogueReady] = useState(restoredDraft?.dialogueReady ?? false);
  const [showReply, setShowReply] = useState(restoredDraft?.showReply ?? false);
  const [replyLoading, setReplyLoading] = useState(restoredDraft?.replyLoading ?? false);
  const [eventLogged, setEventLogged] = useState(restoredDraft?.eventLogged ?? false);
  const [draftEventId, setDraftEventId] = useState(currentEventId);

  const inputRef = useRef<HTMLInputElement>(null);
  const sceneInitiatedRef = useRef(false);
  const dialogueInitiatedRef = useRef(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const eventTitle = currentEvent?.title || '意外对话';
  const eventLocation = currentEvent?.location || '未知';
  const eventType = (currentEvent?.eventType as EventType) || 'daily';
  const displayEventTitle = getDisplayEventTitle(eventLocation, eventType);
  const bgAssetId = LOCATION_BG_MAP[currentLocationId || ''] || 'bg_home';

  const mockAiText = currentEvent?.aiText || '小星若有所思地看着远方。';
  const mockAiResponse = currentEvent?.aiResponse || '谢谢你愿意和我聊这些。';
  const responseHintText = '特殊提示：你只有一次回应机会。请谨慎组织你的回答，把这一次真正想告诉它的话说清楚。';

  useEffect(() => {
    const nextDraft = readDraft(currentEventId, activeSaveId);
    setSceneText(nextDraft?.sceneText ?? '');
    setDialogueLines(nextDraft?.dialogueLines ?? []);
    setReplyLines(nextDraft?.replyLines ?? []);
    setOutcomeText(nextDraft?.outcomeText ?? '');
    setPlayerReplyText(nextDraft?.playerReplyText ?? '');
    setInputValue(nextDraft?.inputValue ?? '');
    setSceneReady(nextDraft?.sceneReady ?? false);
    setDialogueReady(nextDraft?.dialogueReady ?? false);
    setShowReply(nextDraft?.showReply ?? false);
    setReplyLoading(nextDraft?.replyLoading ?? false);
    setEventLogged(nextDraft?.eventLogged ?? false);
    setDraftEventId(currentEventId);
  }, [currentEventId, activeSaveId]);

  useEffect(() => {
    if (draftEventId !== currentEventId) return;
    writeDraft(currentEventId, activeSaveId, {
      sceneText,
      dialogueLines,
      replyLines,
      outcomeText,
      playerReplyText,
      inputValue,
      sceneReady,
      dialogueReady,
      showReply,
      replyLoading,
      eventLogged,
    });
  }, [
    currentEventId,
    activeSaveId,
    draftEventId,
    sceneText,
    dialogueLines,
    replyLines,
    outcomeText,
    playerReplyText,
    inputValue,
    sceneReady,
    dialogueReady,
    showReply,
    replyLoading,
    eventLogged,
  ]);

  useEffect(() => {
    if (!currentEventId || sceneReady || sceneInitiatedRef.current) return;
    sceneInitiatedRef.current = true;

    async function generateContent() {
      try {
        const sceneSeed = buildSceneSeed(replaceNames(mockAiText, aiName, playerName));
        const scene = await getEventScene(displayEventTitle, eventType, eventLocation, sceneSeed);
        setSceneText(replaceNames(scene, aiName, playerName));
      } catch {
        setSceneText('');
      }
      setSceneReady(true);
    }
    generateContent();
  }, [aiName, currentEventId, displayEventTitle, eventLocation, eventType, getEventScene, mockAiText, playerName, sceneReady]);

  useEffect(() => {
    if (!currentEventId || !sceneReady || dialogueReady || dialogueInitiatedRef.current) return;
    dialogueInitiatedRef.current = true;

    async function generateDialogue() {
      const context = sceneText || buildSceneSeed(replaceNames(mockAiText, aiName, playerName));
      try {
        const dialogue = await getEventDialogue(eventType, eventLocation, context);
        setDialogueLines(splitTextIntoChatLines(replaceNames(dialogue, aiName, playerName)));
      } catch {
        setDialogueLines(splitTextIntoChatLines(`${aiName}看起来想和你确认一下这件事。`));
      }
      setDialogueReady(true);
    }
    generateDialogue();
  }, [aiName, currentEventId, dialogueReady, eventLocation, eventType, getEventDialogue, mockAiText, playerName, sceneReady, sceneText]);

  useEffect(() => {
    if (dialogueReady && inputRef.current) {
      inputRef.current.focus();
    }
  }, [dialogueReady]);

  useEffect(() => {
    if (!showReply) return;

    const frameId = window.requestAnimationFrame(() => {
      const body = scrollBodyRef.current;
      if (!body) return;
      body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [showReply, replyLoading, playerReplyText, replyLines.length, outcomeText]);

  const runEventAnalysisLater = async (input: EventAnalysisLaterInput) => {
    try {
      const eventAnalysis = await getNarrativeOrchestrator().runEventAnalysis({
        type: 'event-analysis',
        eventTitle: input.eventTitle,
        eventType: input.eventType,
        location: input.eventLocation,
        sceneContext: input.sceneContext,
        playerInput: input.playerInput,
        aiAction: input.aiAction,
        outcomeText: input.outcomeText,
      }, useGameStore.getState());

      if (!eventAnalysis) {
        updateEventTechnical(input.eventLogId, { eventAnalysis: null });
        return;
      }

      applyEventPersonalityDeltas(eventAnalysis.personalityDeltas);
      updateEventTechnical(input.eventLogId, buildEventAnalysisPatch(eventAnalysis));

      void consolidateCompanionMemory(undefined, 'event');
    } catch {
      updateEventTechnical(input.eventLogId, { eventAnalysis: null });
    }
  };

  const generateReplyChain = async (messageText: string) => {
    const finalSceneContext = sceneText || replaceNames(mockAiText, aiName, playerName);
    let finalAiAction = '';
    let finalOutcome = '';

    try {
      const action = await getEventResponseAction(eventType, eventLocation, finalSceneContext, messageText);
      finalAiAction = action.intendedAction || `${aiName}按照你的建议认真行动起来。`;
      setReplyLines(splitTextIntoChatLines(replaceNames(action.spokenReply || mockAiResponse, aiName, playerName)));
    } catch {
      setReplyLines(splitTextIntoChatLines(replaceNames(mockAiResponse, aiName, playerName)));
      finalAiAction = `${aiName}按照你的建议认真行动起来。`;
    }

    try {
      finalOutcome = await getEventOutcome(displayEventTitle, eventType, eventLocation, finalSceneContext, messageText, finalAiAction);
    } catch {
      finalOutcome = `${displayEventTitle}慢慢结束了。${aiName}记住了你的建议，也记住了自己这次做出的选择。`;
    }

    const normalizedAiAction = replaceNames(finalAiAction, aiName, playerName);
    const normalizedOutcome = replaceNames(finalOutcome, aiName, playerName);

    setOutcomeText(normalizedOutcome);
    if (!eventLogged) {
      const eventId = `evt-story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      appendEvent({
        id: eventId,
        timestamp: Date.now(),
        month: currentMonth,
        type: 'event',
        summary: `${displayEventTitle}：场景中，${finalSceneContext} AI向培养者表达「${displayDialogue.join(' ')}」。培养者回应「${messageText}」。AI随后采取行动：${normalizedAiAction}。最终结果：${normalizedOutcome}`,
        tags: ['事件结果', eventType, eventLocation, ...(currentEvent?.tags ?? [])],
        emotionalImpact: estimateEventImpact(eventType),
        technical: {
          eventTitle,
          eventId: currentEvent?.id,
          eventType,
          location: eventLocation,
          playerInput: messageText,
          aiAction: normalizedAiAction,
        },
      });
      setEventLogged(true);
      void runEventAnalysisLater({
        eventLogId: eventId,
        eventTitle: displayEventTitle,
        eventType,
        eventLocation,
        sceneContext: finalSceneContext,
        playerInput: messageText,
        aiAction: normalizedAiAction,
        outcomeText: normalizedOutcome,
      });
    }
    setReplyLoading(false);
  };

  useEffect(() => {
    if (!showReply || !replyLoading || !playerReplyText || outcomeText) return;
    generateReplyChain(playerReplyText);
  }, []);

  const handleSend = async () => {
    const messageText = inputValue.trim();
    if (!messageText || replyLoading || showReply) return;

    setPlayerReplyText(messageText);
    setInputValue('');
    setShowReply(true);
    setReplyLoading(true);
    await generateReplyChain(messageText);
  };

  const handleContinue = () => {
    clearDraft(currentEvent?.id, activeSaveId);
    clearEvent();
    navigate('/raising/action-progress', { state: { skipProgress: true } });
  };

  const handleBack = () => {
    clearDraft(currentEvent?.id, activeSaveId);
    clearEvent();
    navigate('/raising/action-progress', { state: { skipProgress: true } });
  };

  const displayDialogue = dialogueLines.length
    ? dialogueLines
    : splitTextIntoChatLines(replaceNames(mockAiText, aiName, playerName));

  return (
    <div
      className="flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      {/* Location background — same as LocationPage */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: 1080, zIndex: 0 }}>
        <AssetSlot assetId={bgAssetId} width={1920} height={1080} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: 1920, height: 1080, backgroundColor: 'rgba(244, 252, 255, 0.20)' }}>
        <TopBar
          title="特殊事件"
          subtitle={`${displayEventTitle} / ${eventLocation}`}
          subtitleOn
          actionPoints={resources.actionPoints}
          funds={resources.funds}
          mentalWear={resources.mentalWear}
          physicalWear={resources.physicalWear}
          onBack={handleBack}
          backLabel="跳过事件"
        />

      <div
        className="flex items-center justify-center"
        style={{
          position: 'relative',
          zIndex: 2,
          width: 1920,
          height: 1008,
          paddingTop: 22,
        }}
      >
        {/* Modal card */}
        <div
          className="flex flex-col"
          style={{
            ...chromePanelStyle({ strong: true, padding: 0 }),
            width: 960,
            maxHeight: 820,
          }}
        >
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />

          {/* Title bar */}
          <div
            className="flex items-center justify-between px-24 flex-shrink-0"
            style={{
              position: 'relative',
              zIndex: 1,
              height: 68,
              borderBottom: '1px solid var(--color-border-soft)',
            }}
          >
            <div className="flex flex-col">
              <span style={{ fontSize: sf(22), fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {displayEventTitle}
              </span>
              <span style={{ fontSize: sf(13), color: 'var(--color-text-muted)', marginTop: 4 }}>
                事件地点 / {eventLocation}
              </span>
            </div>
            <span
              style={{
                border: '1px solid var(--color-border-soft)',
                color: 'var(--color-warm-accent)',
                fontSize: sf(13),
                fontWeight: 700,
                padding: '7px 12px',
              }}
            >
              SPECIAL EVENT
            </span>
          </div>

          {/* Scrollable body */}
          <div
            ref={scrollBodyRef}
            className="flex flex-col gap-20 flex-1"
            style={{ position: 'relative', zIndex: 1, padding: '24px 32px', overflow: 'auto', minHeight: 0 }}
          >
            {/* Narrator scene */}
            <div
              style={{
                minHeight: 92,
                padding: '4px 8px 8px',
                flexShrink: 0,
              }}
            >
              {!sceneReady ? (
                <span style={{ position: 'relative', zIndex: 1, fontSize: sf(18), color: 'rgba(244,252,255,0.78)', fontStyle: 'italic' }}>
                  场景展开中...
                </span>
              ) : sceneText ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {splitNarrationIntoParagraphs(sceneText).map((paragraph, index) => (
                    <p
                      key={`${paragraph}-${index}`}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        margin: 0,
                        fontSize: sf(24),
                        fontWeight: 600,
                        color: 'rgba(244,252,255,0.92)',
                        lineHeight: 1.9,
                        letterSpacing: '0.03em',
                        textShadow: '0 2px 18px rgba(0,0,0,0.42)',
                        fontFamily: '"Noto Serif SC", "Source Han Serif SC", Georgia, serif',
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Companion dialogue */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                minHeight: 120,
                padding: '4px 0',
                flexShrink: 0,
              }}
            >
              {!dialogueReady ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AIAvatar name={aiName} gender={aiGender} />
                  <AITextBubble name={aiName} text="思考中..." pending maxWidth="78%" />
                </div>
              ) : (
                displayDialogue.map((line, index) => (
                  <div key={`${line}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AIAvatar name={aiName} gender={aiGender} />
                    <AITextBubble name={aiName} text={line} maxWidth="78%" />
                  </div>
                ))
              )}
            </div>

            {/* Reply */}
            {showReply && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  minHeight: 120,
                  padding: '4px 0',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
                  <div
                    style={{
                      maxWidth: '72%',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid var(--color-border-soft)',
                      padding: '12px 16px',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                      clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: sf(14), lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                      {playerReplyText}
                    </p>
                  </div>
                  <div
                    className="talk-avatar-frame"
                    style={{
                      width: 80,
                      height: 80,
                      minWidth: 80,
                      minHeight: 80,
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.16)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-primary)',
                      fontSize: sf(24),
                      fontWeight: 800,
                      flexShrink: 0,
                      border: '1px solid var(--color-border-soft)',
                    }}
                  >
                    我
                  </div>
                </div>
                {replyLoading ? (
                  <>
                    {replyLines.map((line, index) => (
                      <div key={`${line}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <AIAvatar name={aiName} gender={aiGender} />
                        <AITextBubble name={aiName} text={line} maxWidth="78%" />
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <AIAvatar name={aiName} gender={aiGender} />
                      <AITextBubble name={aiName} text="AI正在思考中..." pending maxWidth="78%" />
                    </div>
                  </>
                ) : replyLines.length > 0 ? (
                  <>
                    {replyLines.map((line, index) => (
                      <div key={`${line}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <AIAvatar name={aiName} gender={aiGender} />
                        <AITextBubble name={aiName} text={line} maxWidth="78%" />
                      </div>
                    ))}
                    {outcomeText && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '14px 18px',
                          border: '1px solid rgba(244,252,255,0.30)',
                          background: 'rgba(0,0,0,0.18)',
                          color: 'rgba(244,252,255,0.92)',
                          fontSize: sf(17),
                          lineHeight: 1.75,
                          fontFamily: '"Noto Serif SC", "Source Han Serif SC", Georgia, serif',
                        }}
                      >
                        {outcomeText}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AIAvatar name={aiName} gender={aiGender} />
                    <AITextBubble name={aiName} text="正在回应..." pending maxWidth="78%" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed bottom area */}
          <div
            className="flex-shrink-0 flex flex-col items-center"
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '16px 32px 24px',
              minHeight: 116,
              borderTop: '1px solid var(--color-border-soft)',
            }}
          >
            {dialogueReady && !showReply ? (
              <div className="flex flex-col gap-4" style={{ width: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    padding: '0 4px',
                  }}
                >
                  <div
                    style={{
                      borderTop: '1px dashed rgba(244,252,255,0.38)',
                      paddingTop: 12,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: sf(15),
                        lineHeight: 1.7,
                        color: 'rgba(244,252,255,0.92)',
                        letterSpacing: '0.01em',
                        textAlign: 'center',
                      }}
                    >
                      {responseHintText}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-16" style={{ width: '100%' }}>
                  <div
                    style={{
                      flex: 1,
                      ...chromePanelStyle({ padding: 8 }),
                      height: 60,
                    }}
                  >
                    <div style={chromeDecorStyle} />
                    <div style={chromeInnerFrameStyle} />
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                      placeholder="输入你的回应..."
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--color-border-soft)',
                        outline: 'none',
                        fontSize: sf(18),
                        color: 'var(--color-text-primary)',
                        padding: '0 16px',
                        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                      }}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleSend}
                    style={{
                      width: 132,
                      height: 60,
                    }}
                  >
                    发送
                  </Button>
                </div>
              </div>
            ) : showReply && !replyLoading ? (
              <Button onClick={handleContinue}>
                继续
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

function estimateEventImpact(eventType: EventType): number {
  const impactByType: Partial<Record<EventType, number>> = {
    achievement: 6,
    choice: 7,
    discovery: 5,
    'art-dispute': 8,
    'social-friction': 7,
    help: 8,
    key: 9,
    observation: 5,
    daily: 4,
  };
  return impactByType[eventType] ?? 5;
}

function buildEventAnalysisPatch(eventAnalysis: EventMemoryAnalysis): Record<string, unknown> {
  return {
    eventAnalysis,
    personalityDeltas: eventAnalysis.personalityDeltas,
    memoryTags: eventAnalysis.memoryTags,
    relationshipSignal: eventAnalysis.relationshipSignal,
    companionMemory: eventAnalysis.companionMemory,
    diaryCandidate: eventAnalysis.diaryCandidate,
    endingForeshadow: eventAnalysis.endingForeshadow,
  };
}
