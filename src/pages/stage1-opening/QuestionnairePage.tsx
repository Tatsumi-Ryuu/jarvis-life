import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { calculateIdentity } from '../../engine/identity-calculator';
import { AssetSlot } from '../../components/ui/AssetSlot';

const questions = [
  { id: 1, text: '你更相信规则还是直觉？', options: [
    { label: 'A. 我更相信有明确规则的事情', value: 'rational' },
    { label: 'B. 我会根据自己的直觉来做判断', value: 'intuitive' },
    { label: 'C. 视情况而定，两者都很重要', value: 'balanced' },
  ]},
  { id: 2, text: '一个陌生人向你求助，你的第一反应是？', options: [
    { label: 'A. 尽力帮助', value: 'trust' },
    { label: 'B. 先观察', value: 'cautious' },
    { label: 'C. 不关我事', value: 'guarded' },
  ]},
  { id: 3, text: '你希望你的AI伙伴为你做什么？', options: [
    { label: 'A. 功能型——高效完成任务', value: 'functional' },
    { label: 'B. 陪伴型——温暖的情感陪伴', value: 'companion' },
    { label: 'C. 平衡型——两者兼顾', value: 'balanced' },
  ]},
  { id: 4, text: '你对AI有自己的想法怎么看？', options: [
    { label: 'A. 期待——那会很有趣', value: 'open' },
    { label: 'B. 担心——会不会失控', value: 'worried' },
    { label: 'C. 无所谓——能干活就行', value: 'neutral' },
  ]},
  { id: 5, text: '你认为自己有社会责任感吗？', options: [
    { label: 'A. 有，我应该为社会做贡献', value: 'responsible' },
    { label: 'B. 有一些，但先顾好自己', value: 'moderate' },
    { label: 'C. 我只关心身边的人', value: 'personal' },
  ]},
];

export const QuestionnairePage: React.FC = () => {
  const navigate = useNavigate();
  const { question } = useParams();
  const recordAnswer = useGameStore((s) => s.recordQuestionnaireAnswer);
  const setIdentity = useGameStore((s) => s.setIdentity);
  const qIndex = Math.max(0, Math.min(4, (parseInt(question || '1') || 1) - 1));
  const current = questions[qIndex];
  const [selected, setSelected] = useState<string | null>(null);
  const isLast = qIndex === 4;

  return (
    <div className="flex flex-col items-center justify-center"
      style={{ width: 1920, height: 1080, backgroundColor: 'var(--color-canvas)', position: 'relative' }}>
      {/* Background */}
      <div className="absolute inset-0">
        <AssetSlot assetId="bg_story" width={1920} height={1080} />
      </div>

      {/* Progress */}
      <div style={{ position: 'relative', zIndex: 10, fontSize: 18, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 40 }}>
        第 {qIndex + 1}/5 题
      </div>

      {/* Question */}
      <div style={{ position: 'relative', zIndex: 10, fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 60, maxWidth: 700, textAlign: 'center' }}>
        {current.text}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-4" style={{ width: 600, position: 'relative', zIndex: 10 }}>
        {current.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className="text-left cursor-pointer transition-transform active:scale-95"
            style={{
              padding: '20px 24px',
              backgroundColor: selected === opt.value ? 'var(--color-panel-strong)' : 'var(--color-panel)',
              border: selected === opt.value ? '6px solid var(--color-border-strong)' : '4px solid var(--color-border-soft)',
              boxShadow: selected === opt.value ? '6px 6px 0 rgba(46,126,168,0.30)' : 'none',
              color: 'var(--color-text-primary)',
              fontSize: 20,
              fontWeight: selected === opt.value ? 700 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Submit / Next */}
      <div className="mt-12" style={{ position: 'relative', zIndex: 10 }}>
        <button
          disabled={!selected}
          onClick={() => {
            if (selected) recordAnswer(qIndex, selected);
            if (isLast) {
              const answers = [...useGameStore.getState().questionnaireAnswers];
              answers[qIndex] = selected!;
              const result = calculateIdentity(answers);
              setIdentity(result.identity, result.awarenessTier);
              navigate('/identity-result');
            } else {
              navigate(`/questionnaire/${qIndex + 2}`);
            }
            setSelected(null);
          }}
          className="font-bold cursor-pointer transition-transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            width: 260, height: 86,
            backgroundColor: 'var(--color-action)',
            border: '6px solid var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31,111,152,0.30)',
            color: 'var(--color-text-primary)',
            fontSize: 28, fontWeight: 700,
          }}
        >
          {isLast ? '提交' : '下一题'}
        </button>
      </div>
    </div>
  );
};
