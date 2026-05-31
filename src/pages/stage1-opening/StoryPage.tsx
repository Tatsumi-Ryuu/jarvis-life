import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssetSlot } from '../../components/ui/AssetSlot';

const storyPages = [
  {
    text: '您好，欢迎您参加基石工业AI体验计划。\n\n基石建造未来。',
    btnText: '下一页',
  },
  {
    text: '基石工业成立于2032年。\n\n作为全球最大的AI基础设施供应商，我们的AI系统已覆盖全球87%的公共领域——从城市交通到家庭助手，从医疗诊断到教育辅助。\n\n一个全新的时代已经到来——AI时代。',
    btnText: '下一页',
  },
  {
    text: '如今，越来越多的人开始需要情感陪伴AI。\n\n基石工业正在研发新一代情感型AI，探索AI与人类之间更深层次的情感连接可能性。\n\n我们邀请您成为这项研究的参与者，在接下来的12个月里，与AI伙伴共同生活，见证一段关于陪伴与成长的故事。\n\n请注意：所有交互数据将被记录用于研究目的。',
    btnText: '继续',
  },
];

export const StoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { page } = useParams();
  const pageIndex = Math.max(0, Math.min(2, (parseInt(page || '1') || 1) - 1));
  const current = storyPages[pageIndex];
  const isLast = pageIndex === 2;

  const goNext = () => {
    if (isLast) navigate('/questionnaire-intro');
    else navigate(`/story/${pageIndex + 2}`);
  };

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
          width: 790,
          minHeight: 360,
        }}
      >
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
          {current.text}
        </div>
      </div>

      <div
        className="relative z-10 flex items-center"
        style={{
          position: 'absolute',
          right: 90,
          bottom: 78,
          gap: 26,
        }}
      >
        {!isLast && (
          <button
            onClick={() => navigate('/questionnaire-intro')}
            className="cursor-pointer underline"
            style={{
              fontSize: 20,
              color: '#FFFFFF',
              background: 'none',
              border: 'none',
              padding: 0,
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            跳过
          </button>
        )}
        <button
          onClick={goNext}
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
          {current.btnText}
        </button>
      </div>
    </div>
  );
};
