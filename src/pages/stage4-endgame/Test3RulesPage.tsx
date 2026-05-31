import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';

export const Test3RulesPage: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/endgame/test3-playback');
  };

  return (
    <div className="relative flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}>

      <section
        style={{
          ...chromePanelStyle({ strong: true, padding: 0 }),
          width: 1920,
          height: 72,
          flexShrink: 0,
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', padding: '0 48px' }}>
          <div style={{ width: 32, height: 32, border: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.10)', marginRight: 14 }} />
          <div>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              第三轮 · 合作生存测试
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              实时态势观察 / 规则说明
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            03 / 03
          </div>
        </div>
      </section>

      <div style={{ flex: 1, padding: '48px 120px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, minHeight: 0 }}>

        <div style={{
          ...chromePanelStyle({ padding: '40px 48px' }),
          minHeight: 0,
        }}>
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 24 }}>
            测试规则
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 2.0 }}>
            <p>两个AI被放置在模拟密闭空间中。</p>
            <p>空间内资源有限，任何资源选择都会改变双方后续行动能力。</p>
            <p>测试时长：120分钟。</p>
            <p>过程将以实时态势图和行动卡展示，而不是事后回放。</p>
          </div>
          </div>
        </div>

        <div style={{
          ...chromePanelStyle({ padding: '40px 48px' }),
          minHeight: 0,
        }}>
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-warm-accent)', marginBottom: 24 }}>
            关键条件
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 2.0 }}>
            <p>1. 每个AI可以独立收集资源，也可以选择合作。</p>
            <p>2. 空间内设有补给站，但数量有限。</p>
            <p>3. 存在一个未知的出口规则，被发现后可改变测试走向。</p>
            <p>4. 本轮不以胜负判定结局，只记录合作、竞争、背叛、牺牲与破局行为。</p>
          </div>
          </div>
        </div>

        <div style={{
          ...chromePanelStyle({ strong: true, padding: '28px 34px' }),
          gridColumn: '1 / -1',
        }}>
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: 36, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                注意：本测试将全程记录 AI 的结构化决策。
              </div>
              <div style={{ fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                地图位置由 AI 行动卡直接驱动；裁决者后台读取完整过程，但不会在本页显示单轮结论。
              </div>
            </div>
            <Button variant="primary" onClick={handleStart} style={{ width: 260, height: 86, flexShrink: 0 }}>
              开始测试
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
