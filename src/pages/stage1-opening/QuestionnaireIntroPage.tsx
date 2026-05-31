import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetSlot } from '../../components/ui/AssetSlot';

export const QuestionnaireIntroPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: 1920, height: 1080, backgroundColor: 'var(--color-canvas)' }}
    >
      <div className="absolute inset-0">
        <AssetSlot assetId="bg_story" width={1920} height={1080} />
      </div>

      <div
        className="relative z-10"
        style={{
          position: 'absolute',
          left: 285,
          top: 255,
          width: 860,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.72)',
            letterSpacing: 4,
            marginBottom: 28,
            textShadow: '0 1px 6px rgba(0,0,0,0.45)',
          }}
        >
          参与者登记
        </div>

        <div
          className="whitespace-pre-line text-left"
          style={{
            width: '100%',
            fontSize: 32,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.95,
            letterSpacing: 0.5,
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}
        >
          {'在与你的 AI 伙伴见面之前，系统需要先了解你。\n\n这份简短问卷会帮助我们判断你的陪伴需求、沟通习惯和价值倾向，从而为你安排更适合的对象。\n\n请根据第一反应作答，你的回答会影响接下来的体验。'}
        </div>
      </div>

      <div
        className="relative z-10"
        style={{
          position: 'absolute',
          right: 90,
          bottom: 78,
        }}
      >
        <button
          onClick={() => navigate('/questionnaire/1')}
          className="font-bold cursor-pointer transition-transform hover:-translate-y-1 active:scale-95"
          style={{
            width: 280,
            height: 90,
            backgroundColor: 'var(--color-action)',
            border: '6px solid var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31,111,152,0.30)',
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: 700,
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          开始登记
        </button>
      </div>
    </div>
  );
};
