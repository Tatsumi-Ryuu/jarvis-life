import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIAvatar, AITextBubble } from '../../components/chat/AIMessage';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { useNarrative } from '../../hooks/useNarrative';
import { cleanAIText } from '../../utils/aiText';
import { recordExamConversationMemory } from '../../services/companion-memory-events';
import { sf } from '../../utils/font';
import { ExamCompanyBackground } from './ExamCompanyBackground';

const FALLBACK_AI_TEXT = '...我们要去做检查吗？你会陪着我吗？';

export const CompanyEntrancePage: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const aiGender = useGameStore((s) => s.aiGender);
  const playerName = useGameStore((s) => s.player.name) || '李明';
  const { examChat } = useNarrative();
  const [aiDialogue, setAiDialogue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showWaitingExperienceModal, setShowWaitingExperienceModal] = useState(false);

  const initiatedRef = useRef(false);

  useEffect(() => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;
    async function generateDialogue() {
      setIsLoading(true);
      const reply = cleanAIText(await examChat(
        '我们要去基石工业做例行检查了，你看起来有点紧张。',
        FALLBACK_AI_TEXT,
      ));
      setAiDialogue(reply);
      recordExamConversationMemory('我们要去基石工业做例行检查了，你看起来有点紧张。', reply, 'company-entrance');
      setIsLoading(false);
    }
    generateDialogue();
  }, [examChat]);

  const displayText = cleanAIText(aiDialogue);

  return (
    <ExamCompanyBackground className="flex flex-col">
      <div
        className="flex flex-col"
        style={{
          ...chromePanelStyle({ strong: true, padding: '56px 64px' }),
          width: 860,
          margin: '190px auto 0',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        {/* Location label */}
        <div
          className="flex items-center justify-center"
          style={{
            position: 'relative',
            zIndex: 1,
            height: 48,
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid var(--color-border-soft)',
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: sf(20),
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              letterSpacing: 2,
            }}
          >
            基石工业 · 总部大厅
          </span>
        </div>

        {/* Receptionist dialogue */}
        <div
          className="flex items-start gap-4"
          style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 56,
              height: 56,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--color-border-soft)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>
              NPC
            </span>
          </div>
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--color-border-soft)',
              padding: '16px 24px',
              flex: 1,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              前台接待
            </span>
            <span
              style={{
                fontSize: 20,
                lineHeight: 1.8,
                color: 'var(--color-text-primary)',
              }}
            >
              {playerName}您好，请这边办理签到手续。
            </span>
          </div>
        </div>

        {/* AI dialogue */}
        <div
          className="flex items-start gap-4"
          style={{ position: 'relative', zIndex: 1, marginBottom: 48 }}
        >
          <AIAvatar name={aiName} gender={aiGender} />
          <AITextBubble
            name={aiName}
            text={isLoading ? '正在组织语言...' : displayText}
            pending={isLoading}
            maxWidth="calc(100% - 96px)"
          />
        </div>

        {/* Choice buttons */}
        <div className="flex items-center justify-center" style={{ position: 'relative', zIndex: 1 }}>
          <Button
            onClick={() => setShowWaitingExperienceModal(true)}
            style={{
              width: 320,
              height: 86,
            }}
          >
            在等候区等待
          </Button>
        </div>
      </div>

      {showWaitingExperienceModal ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 1001, background: 'rgba(0,0,0,0.56)' }}
        >
          <section style={{ ...chromePanelStyle({ strong: true, padding: 32 }), width: 720 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1] flex flex-col gap-6">
              <div>
                <div className="text-[18px] font-bold text-text-secondary">基石工业 · 等候区</div>
                <div className="mt-2 text-[34px] font-bold leading-tight text-text-primary">AI检测进行中</div>
              </div>
              <p className="m-0 text-[20px] font-bold leading-relaxed text-text-secondary">
                您的AI正在检测中。在此期间，您可以体验本公司最新研制的益智陪伴型AI，您可以通过五子棋的方式参与我们的体验。如果胜利的话，我们会给予您的AI全属性提升5，奖励资金2000；如果失败也没有关系，重在体验。
              </p>
              <div className="flex justify-center">
                <Button
                  variant="primary"
                  onClick={() => navigate('/exam/company-entrance/gomoku')}
                  style={{ width: 240, height: 72 }}
                >
                  开始体验
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </ExamCompanyBackground>
  );
};
