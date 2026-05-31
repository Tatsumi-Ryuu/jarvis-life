import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/ui/TopBar';
import { Button } from '../../components/ui/Button';
import { ResourceStat } from '../../components/ui/ResourceStat';
import { SideTab } from '../../components/ui/SideTab';
import { ListHeader } from '../../components/ui/ListHeader';
import { ActionCard } from '../../components/ui/ActionCard';
import { StatBar } from '../../components/ui/StatBar';
import { BroadcastPanel } from '../../components/ui/BroadcastPanel';
import { AssetSlot } from '../../components/ui/AssetSlot';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';

const colorTokens = [
  ['canvas', '#181933', '页面底色'],
  ['panel', 'rgba(160,171,184,0.36)', '基础玻璃面板'],
  ['panel-soft', 'rgba(170,181,193,0.42)', '次级承载面'],
  ['panel-strong', 'rgba(185,195,206,0.52)', '主按钮与重点面板'],
  ['border-strong', 'rgba(255,255,255,0.82)', '外层主描边'],
  ['border-soft', 'rgba(255,255,255,0.24)', '内框细线'],
  ['text-primary', '#ffffff', '标题、按钮、关键数值'],
  ['text-secondary', '#eef4fb', '正文与说明文字'],
  ['text-muted', '#d7e0ea', '辅助标签与小字'],
  ['status-available', '#a8e9ff', '可执行与高亮状态'],
] as const;

const typeRows = [
  ['页面标题', '26-30px / 700', 'TopBar 标题、模块主标题'],
  ['组件标题', '20-24px / 700', '按钮、ActionCard、SideTab'],
  ['正文说明', '14-16px / 500', '课程描述、提示信息、规范说明'],
  ['小字标签', '10-13px / 500-700', '收益行、状态标签、占位文本'],
] as const;

const specSources = [
  ['确认版视觉规范', '/dev/design-system-confirmed'],
  ['旧组件库布局参考', '/dev/design-system'],
  ['视觉 Tokens', 'src/styles/tokens.css'],
  ['公共组件', 'src/components/ui/'],
  ['共享视觉壳', 'src/components/ui/chrome.ts'],
] as const;

const principles = [
  '布局参考旧版设计系统：顶部资源栏、左侧说明栏、右侧滚动组件库。',
  '正式页面仍保留原本信息结构，只统一切角、玻璃、描边、文字层级。',
  '背景可以透出，但面板透明度必须足够承载文字和按钮状态。',
  '按钮必须能区分默认、悬浮、点击、锁定四种状态。',
] as const;

const pageMappings = [
  ['待机主界面', 'TopBar / SideTab / StatBar / Button / 输入框', '角色状态、侧边入口、月末按钮和底部对话输入统一到同一套玻璃壳。'],
  ['地图页', 'TopBar / Button / ResourceStat / AssetSlot', '地图节点可以轻一点，但返回按钮和资源栏必须维持相同状态规则。'],
  ['地点页', 'TopBar / SideTab / ListHeader / ActionCard', '课程、工作、维护等列表页以行动卡片为主要信息单元。'],
  ['共享弹窗', 'BroadcastPanel / Button / 输入框', '谈心、提示、设置类弹窗使用更聚焦的玻璃层，不额外压暗场景。'],
  ['考试与结局', 'TopBar / Button / StatBar / AssetSlot', '报告、选择、结算页面复用同一套标题、正文、小字和 CTA 层级。'],
] as const;

const Panel: React.FC<{ title: string; children: React.ReactNode; minHeight?: number }> = ({
  title,
  children,
  minHeight,
}) => (
  <section
    style={{
      ...chromePanelStyle({ padding: 18 }),
      minHeight,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}
  >
    <div style={chromeDecorStyle} />
    <div style={chromeInnerFrameStyle} />
    <div style={{ position: 'relative', zIndex: 1 }}>
      <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 700 }}>{title}</h2>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  </section>
);

const TokenSwatch: React.FC<{ name: string; value: string; usage: string }> = ({ name, value, usage }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: 12, alignItems: 'center' }}>
    <div
      style={{
        width: 54,
        height: 34,
        border: '1px solid var(--color-border-strong)',
        background:
          name.includes('text') || name.includes('border')
            ? value
            : `linear-gradient(180deg, ${value}, rgba(92,101,112,0.38))`,
      }}
    />
    <div>
      <div style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 700 }}>{name}</div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 2 }}>{value}</div>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginTop: 2 }}>{usage}</div>
    </div>
  </div>
);

const InfoTile: React.FC<{ title: string; body: string; meta?: string }> = ({ title, body, meta }) => (
  <div
    style={{
      ...chromePanelStyle({ padding: 14 }),
      minHeight: 88,
    }}
  >
    <div style={chromeDecorStyle} />
    <div style={chromeInnerFrameStyle} />
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700 }}>{title}</div>
      {meta && <div style={{ color: 'var(--color-status-available)', fontSize: 11, marginTop: 5 }}>{meta}</div>}
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.65, marginTop: 8 }}>{body}</div>
    </div>
  </div>
);

const ButtonStateDemo: React.FC<{
  label: string;
  stateClass?: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, stateClass = '', disabled = false, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <span style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 700 }}>{label}</span>
    <Button className={stateClass} disabled={disabled} iconAssetId="icon-action">
      {children}
    </Button>
  </div>
);

const DemoInput: React.FC = () => (
  <div
    style={{
      ...chromePanelStyle({ padding: 10 }),
      width: '100%',
      minHeight: 96,
    }}
  >
    <div style={chromeDecorStyle} />
    <div style={chromeInnerFrameStyle} />
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        height: 76,
        border: '1px solid var(--color-border-soft)',
        display: 'grid',
        gridTemplateColumns: '56px 1fr 78px',
        gap: 10,
        alignItems: 'center',
        padding: 10,
      }}
    >
      <div
        style={{
          height: '100%',
          border: '1px solid var(--color-border-soft)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-primary)',
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        □
      </div>
      <div
        style={{
          height: '100%',
          border: '1px solid var(--color-border-soft)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          color: 'var(--color-text-muted)',
          fontSize: 13,
        }}
      >
        和 AI 说些什么...
      </div>
      <div
        style={{
          height: '100%',
          border: '1px solid var(--color-border-soft)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-primary)',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        发送
      </div>
    </div>
  </div>
);

const ScalePreview: React.FC<{ width: number; height: number; scale: number; children: React.ReactNode }> = ({
  width,
  height,
  scale,
  children,
}) => (
  <div
    style={{
      width: width * scale,
      height: height * scale,
      overflow: 'hidden',
      border: '1px solid var(--color-border-soft)',
      background: 'rgba(255,255,255,0.04)',
    }}
  >
    <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
  </div>
);

const compactButtonFrameStyle: React.CSSProperties = {
  minWidth: 148,
  height: 44,
  padding: '0 22px',
  border: '1px solid rgba(255,255,255,0.46)',
  background: 'linear-gradient(180deg, rgba(235, 242, 250, 0.96), rgba(182, 192, 207, 0.92))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.62), 0 4px 0 rgba(82, 96, 116, 0.34)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const CompactButtonPreview: React.FC<{
  label: string;
  tone?: 'neutral' | 'accent';
  showSafeArea?: boolean;
}> = ({ label, tone = 'neutral', showSafeArea = false }) => (
  <div
    style={{
      ...compactButtonFrameStyle,
      background:
        tone === 'accent'
          ? 'linear-gradient(180deg, rgba(220, 241, 255, 0.98), rgba(154, 208, 236, 0.95))'
          : compactButtonFrameStyle.background,
    }}
  >
    {showSafeArea && (
      <div
        style={{
          position: 'absolute',
          inset: '8px 18px',
          border: '1px dashed rgba(255,255,255,0.22)',
          pointerEvents: 'none',
        }}
      />
    )}
    <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
  </div>
);

const ComparisonTile: React.FC<{
  title: string;
  note: string;
  children: React.ReactNode;
}> = ({ title, note, children }) => (
  <div
    style={{
      ...chromePanelStyle({ padding: 16 }),
      minHeight: 142,
    }}
  >
    <div style={chromeDecorStyle} />
    <div style={chromeInnerFrameStyle} />
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>{note}</div>
      </div>
      {children}
    </div>
  </div>
);

export const ConfirmedStyleDesignSpecPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="design-system-confirmed"
      style={{
        width: 1920,
        height: 1080,
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 50% 0%, rgba(210,220,230,0.18), transparent 32%), linear-gradient(180deg, #181933, #10111f)',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        color: 'var(--color-text-secondary)',
      }}
    >
      <TopBar
        title="确认版视觉设计系统"
        subtitle="参考旧组件库布局，汇总当前游戏 UI 规范与组件"
        subtitleOn
        actionPoints={10}
        funds={3000}
        mentalWear={12}
        physicalWear={6}
        onBack={() => navigate('/dev/design-system')}
        backLabel="旧规范页"
        iconAssetId="icon_settings"
      />

      <main style={{ display: 'flex', height: 1008, overflow: 'hidden' }}>
        <aside
          style={{
            width: 390,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background:
              'linear-gradient(180deg, rgba(166,176,188,0.34), rgba(91,101,113,0.22))',
            borderRight: '1px solid var(--color-border-soft)',
            overflowY: 'auto',
          }}
        >
          <Panel title="规范来源">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {specSources.map(([title, path]) => (
                <InfoTile key={title} title={title} body={path} />
              ))}
            </div>
          </Panel>

          <Panel title="风格原则">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {principles.map((item) => (
                <div key={item} style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.65 }}>
                  {item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="页面映射">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pageMappings.map(([title, components, note]) => (
                <InfoTile key={title} title={title} meta={components} body={note} />
              ))}
            </div>
          </Panel>
        </aside>

        <section style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <Panel title="颜色 Tokens">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {colorTokens.map(([name, value, usage]) => (
                    <TokenSwatch key={name} name={name} value={value} usage={usage} />
                  ))}
                </div>
              </Panel>

              <Panel title="文字层级">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {typeRows.map(([label, spec, usage]) => (
                    <InfoTile key={label} title={label} meta={spec} body={usage} />
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="全局顶栏与资源状态">
              <ScalePreview width={1920} height={72} scale={0.74}>
                <TopBar
                  title="学校"
                  subtitle="课程训练与兼职"
                  subtitleOn
                  actionPoints={10}
                  funds={3000}
                  mentalWear={12}
                  physicalWear={6}
                  onBack={() => undefined}
                  backLabel="返回地图"
                  iconAssetId="icon_map"
                />
              </ScalePreview>
            </Panel>

            <Panel title="小型返回按钮提案">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <ComparisonTile
                  title="当前小按钮感觉"
                  note="切角、双层线框和装饰短线在小尺寸下过密，文字会和边线抢空间，所以容易显得挤和乱。"
                >
                  <Button variant="secondary">返回地图</Button>
                </ComparisonTile>

                <ComparisonTile
                  title="提案版小按钮"
                  note="改成更接近设置按钮的干净功能型样式，只保留单层外框、短硬阴影和更亮的底色。"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <CompactButtonPreview label="返回地图" showSafeArea />
                    <CompactButtonPreview label="关闭" />
                    <CompactButtonPreview label="返回标题" tone="accent" />
                  </div>
                </ComparisonTile>
              </div>

              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 18 }}>
                <ComparisonTile
                  title="文字与边线安全距离"
                  note="小按钮里文字优先级高于装饰，所以给文本一个固定安全区，不再让任何装饰线压进这个区域。"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <CompactButtonPreview label="返回地图" showSafeArea />
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.7 }}>
                      建议规则：左右至少 18px，上下至少 8px。小按钮禁止再叠加角部短线、内框描边和高光蒙层。
                    </div>
                  </div>
                </ComparisonTile>

                <ComparisonTile
                  title="适用范围"
                  note="这套样式只用于顶部返回和小功能按钮，大 CTA 继续保留更强的主按钮语言。"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 700 }}>适用</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.7 }}>
                      返回地图、返回地点、关闭弹窗、返回标题这类小尺寸功能按钮。
                    </div>
                    <div style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 700, marginTop: 4 }}>不适用</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.7 }}>
                      开始执行、结束本月、行动卡片 CTA 这类大按钮。
                    </div>
                  </div>
                </ComparisonTile>
              </div>
            </Panel>

            <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', gap: 20 }}>
              <Panel title="侧边入口 SideTab">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <SideTab title="课程" subtitle="当前视图" active onClick={() => undefined} iconAssetId="icon_diary" />
                  <SideTab title="打工" subtitle="可切换" active={false} onClick={() => undefined} iconAssetId="icon_funds" />
                  <SideTab title="维护" subtitle="恢复状态" active={false} onClick={() => undefined} iconAssetId="icon_mental" />
                </div>
              </Panel>

              <Panel title="按钮四状态与输入框">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <ButtonStateDemo label="默认态">开始执行</ButtonStateDemo>
                    <ButtonStateDemo label="悬浮态" stateClass="ui-chrome-button--demo-hover">
                      开始执行
                    </ButtonStateDemo>
                    <ButtonStateDemo label="点击态" stateClass="ui-chrome-button--demo-active">
                      开始执行
                    </ButtonStateDemo>
                    <ButtonStateDemo label="锁定态" disabled>
                      条件不足
                    </ButtonStateDemo>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <Button variant="secondary">返回地图</Button>
                      <Button variant="monthEnd" iconAssetId="icon_save" subText="高优先级结算入口">
                        结束本月
                      </Button>
                    </div>
                    <DemoInput />
                  </div>
                </div>
              </Panel>
            </div>

            <Panel title="列表标题、广播与行动卡片">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <ScalePreview width={1118} height={64} scale={0.82}>
                    <ListHeader
                      title="初级课程"
                      rightContent={<span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>5 项可执行</span>}
                    />
                  </ScalePreview>
                  <BroadcastPanel
                    type="info"
                    message="当前规范要求：**说明文字可读**，但不抢走标题和按钮的视觉重心。"
                    onClose={() => undefined}
                  />
                </div>

                <ScalePreview width={1118} height={194} scale={1}>
                  <ActionCard
                    title="基础算术课"
                    description="前期逻辑路线入口，用于展示课程描述、收益行和 CTA 如何在新规范下统一。"
                    status="available"
                    effects="行动点 -2  逻辑 +6  学识 +3  资金 -300"
                    apCost={2}
                    onAction={() => undefined}
                  />
                </ScalePreview>

                <ScalePreview width={1118} height={194} scale={1}>
                  <ActionCard
                    title="少儿演讲课"
                    description="学习基本沟通技巧，适合口才偏低时使用。"
                    status="recommended"
                    effects="行动点 -2  口才 +6  社交 +3  资金 -300"
                    apCost={2}
                    onAction={() => undefined}
                  />
                </ScalePreview>
              </div>
            </Panel>

            <Panel title="角色状态、属性条与资产承载">
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: 24 }}>
                <div
                  style={{
                    ...chromePanelStyle({ padding: 18 }),
                    minHeight: 320,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <div style={chromeDecorStyle} />
                  <div style={chromeInnerFrameStyle} />
                  <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <AssetSlot assetId="portrait_ai_normal" width={190} height={260} />
                    <div style={{ color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 700, marginTop: 12 }}>
                      小星
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center' }}>
                  <StatBar label="学识" value={7.5} desc="稳定" />
                  <StatBar label="艺术" value={6.8} desc="良好" />
                  <StatBar label="体能" value={4.4} desc="需关注" />
                  <StatBar label="逻辑" value={8.1} desc="优势" />
                  <StatBar label="口才" value={6.2} desc="提升中" />
                  <StatBar label="社交" value={5.8} desc="普通" />
                </div>

                <div
                  style={{
                    ...chromePanelStyle({ padding: 18 }),
                    minHeight: 320,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 20,
                  }}
                >
                  <div style={chromeDecorStyle} />
                  <div style={chromeInnerFrameStyle} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-around' }}>
                    <ResourceStat label="行动点" value={10} />
                    <ResourceStat label="资金" value={3000} />
                    <ResourceStat label="磨损" value={12} />
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
};
