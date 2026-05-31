import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/ui/TopBar';
import { Button } from '../../components/ui/Button';
import { ResourceStat } from '../../components/ui/ResourceStat';
import { SideTab } from '../../components/ui/SideTab';
import { ListHeader } from '../../components/ui/ListHeader';
import { ActionCard } from '../../components/ui/ActionCard';
import { StatBar } from '../../components/ui/StatBar';
import { AssetSlot } from '../../components/ui/AssetSlot';

const colorTokens = [
  ['canvas', '#EAF8FF', '页面背景'],
  ['panel', '#F4FCFF', '基础面板'],
  ['panel-soft', '#DDF7FF', '次级容器'],
  ['panel-strong', '#CFEFFF', '激活状态'],
  ['action', '#8FE0FF', '主操作'],
  ['border-strong', '#174D72', '主描边'],
  ['border-soft', '#236B91', '次描边'],
  ['text-primary', '#163E5A', '主文字'],
  ['text-secondary', '#1A5E86', '副文字'],
  ['text-muted', '#8AAEC0', '弱化文字'],
  ['warm-accent', '#FFE6B8', '图标占位'],
  ['danger', '#E74B5C', '危险提示'],
] as const;

const typeRows = [
  ['页面主标题', '30px / Bold', '顶栏标题、模块标题'],
  ['卡片标题', '28px / Bold', '行动卡片标题、主按钮文字'],
  ['顶栏数值', '26px / Bold', '行动点、资金、精神磨损'],
  ['Tab 标题', '24px / Bold', '侧边导航入口'],
  ['正文', '20px / Regular', '卡片描述、主要说明'],
  ['状态与收益', '18px / Bold', '状态、消耗收益条'],
] as const;

const specSources = [
  ['Figma v2 视觉规范', 'docs/游戏设计文档/界面体验/Figma全局UI组件库与设计规范_v2.md'],
  ['React 组件规范', 'docs/游戏设计文档/共享规范/组件库规范.md'],
  ['实现色彩 Tokens', 'src/styles/tokens.css'],
  ['Tailwind 映射', 'tailwind.config.ts'],
  ['当前 UI 组件', 'src/components/ui/'],
] as const;

const Panel: React.FC<{ title: string; children: React.ReactNode; width?: number }> = ({
  title,
  children,
  width,
}) => (
  <section
    className="flex flex-col gap-4"
    style={{
      width: width ?? '100%',
      backgroundColor: 'rgba(244, 252, 255, 0.92)',
      borderWidth: 4,
      borderStyle: 'solid',
      borderColor: 'var(--color-border-soft)',
      boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.22)',
      padding: 20,
    }}
  >
    <h2 className="m-0 text-page-title text-text-primary">{title}</h2>
    {children}
  </section>
);

const TokenSwatch: React.FC<{ name: string; hex: string; usage: string }> = ({ name, hex, usage }) => (
  <div className="flex items-center gap-3">
    <div
      style={{
        width: 58,
        height: 40,
        backgroundColor: hex,
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor: 'var(--color-border-strong)',
      }}
    />
    <div className="flex flex-col">
      <span className="text-resource-label text-text-primary">{name}</span>
      <span className="text-small text-text-secondary">{hex} · {usage}</span>
    </div>
  </div>
);

export const DesignSystemPreviewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="design-system-preview flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: 'var(--color-canvas)',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <style>
        {`
          .design-system-preview [style*="border-width: 6px"] {
            border-width: 3px !important;
          }

          .design-system-preview [style*="border-width: 4px"] {
            border-width: 2px !important;
          }

          .design-system-preview [style*="border-width: 3px"] {
            border-width: 1px !important;
          }

          .design-system-preview .border-2 {
            border-width: 1px !important;
          }

          .design-system-preview [style*="border-color: var(--color-border-strong)"],
          .design-system-preview [style*="border-color: var(--color-border-soft)"],
          .design-system-preview .border-border-strong\\/30 {
            border-color: rgba(35, 107, 145, 0.38) !important;
          }

          .design-system-preview [style*="box-shadow"] {
            box-shadow: 4px 4px 0 rgba(46, 126, 168, 0.14) !important;
          }
        `}
      </style>
      <TopBar
        title="设计规范预览"
        subtitle="当前引用的规范、Tokens 与组件库"
        subtitleOn
        actionPoints={10}
        funds={3000}
        mentalWear={12}
        onBack={() => navigate('/raising/idle/1')}
        iconAssetId="icon_settings"
      />

      <main className="flex flex-1 overflow-hidden" style={{ height: 984 }}>
        <aside
          className="flex flex-col gap-5"
          style={{
            width: 390,
            padding: 24,
            backgroundColor: 'var(--color-panel)',
            borderRightWidth: 4,
            borderRightStyle: 'solid',
            borderRightColor: 'var(--color-border-soft)',
          }}
        >
          <Panel title="规范来源">
            <div className="flex flex-col gap-3">
              {specSources.map(([title, path]) => (
                <div
                  key={path}
                  style={{
                    backgroundColor: 'var(--color-panel-soft)',
                    borderWidth: 3,
                    borderStyle: 'solid',
                    borderColor: 'var(--color-border-soft)',
                    padding: '12px 14px',
                  }}
                >
                  <div className="text-status text-text-primary">{title}</div>
                  <div className="text-small text-text-secondary" style={{ marginTop: 4 }}>
                    {path}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="视觉原则">
            <div className="flex flex-col gap-3 text-body text-text-secondary">
              <span>浅蓝像素风系统界面</span>
              <span>硬描边、硬阴影、无圆角</span>
              <span>桌面横屏 1920 x 1080 优先</span>
              <span>顶栏资源固定：行动点、资金、精神磨损</span>
            </div>
          </Panel>
        </aside>

        <div className="flex-1 overflow-y-auto" style={{ padding: 28 }}>
          <div className="flex flex-col gap-7">
            <div className="grid grid-cols-2 gap-7">
              <Panel title="色彩 Tokens">
                <div className="grid grid-cols-2 gap-4">
                  {colorTokens.map(([name, hex, usage]) => (
                    <TokenSwatch key={name} name={name} hex={hex} usage={usage} />
                  ))}
                </div>
              </Panel>

              <Panel title="文字层级">
                <div className="flex flex-col gap-3">
                  {typeRows.map(([label, spec, usage]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                      style={{
                        borderBottomWidth: 2,
                        borderBottomStyle: 'solid',
                        borderBottomColor: 'rgba(35, 107, 145, 0.24)',
                        paddingBottom: 10,
                      }}
                    >
                      <span className="text-status text-text-primary">{label}</span>
                      <span className="text-tab-subtitle text-text-secondary">{spec}</span>
                      <span className="text-small text-text-muted" style={{ width: 210 }}>
                        {usage}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="全局顶栏与资源项">
              <div
                className="flex items-center justify-between px-6"
                style={{
                  width: 1420,
                  height: 96,
                  backgroundColor: 'rgba(244, 252, 255, 0.91)',
                  borderWidth: 4,
                  borderStyle: 'solid',
                  borderColor: 'var(--color-border-strong)',
                  boxShadow: '0 8px 0 rgba(31, 111, 152, 0.30)',
                }}
              >
                <div className="flex items-center gap-3">
                  <AssetSlot assetId="icon_map" width={34} height={34} />
                  <div className="flex items-baseline gap-2">
                    <span className="text-page-title text-text-primary">学校</span>
                    <span className="text-tab-subtitle text-text-secondary">课程训练与助教打工</span>
                  </div>
                </div>
                <div className="flex items-center gap-10">
                  <ResourceStat label="行动点" value={8} />
                  <ResourceStat label="资金" value={1850} />
                  <ResourceStat label="精神磨损" value={24} />
                </div>
                <Button variant="secondary">返回地图</Button>
              </div>
            </Panel>

            <div className="grid grid-cols-[330px_1fr] gap-4">
              <Panel title="侧边 Tab">
                <div className="flex flex-col gap-4">
                  <SideTab title="课程" subtitle="当前视图" active onClick={() => undefined} iconAssetId="icon_diary" />
                  <SideTab title="打工" subtitle="可切换" active={false} onClick={() => undefined} iconAssetId="icon_funds" />
                  <SideTab title="维护" subtitle="恢复状态" active={false} onClick={() => undefined} iconAssetId="icon_mental" />
                </div>
              </Panel>

              <Panel title="按钮与列表标题栏">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-6">
                    <Button iconAssetId="icon_ap">开始执行</Button>
                    <Button variant="monthEnd" iconAssetId="icon_save" subText="行动点未用完将确认">
                      结束本月
                    </Button>
                    <Button variant="secondary">取消</Button>
                  </div>
                  <ListHeader
                    title="学识课程"
                    rightContent={<span className="text-tab-subtitle text-text-secondary">3 门可训练 / 1 门已完成</span>}
                  />
                  <ListHeader
                    title="商场打工"
                    variant="breadcrumb"
                    rightContent={<span className="text-tab-subtitle text-text-secondary">商场 / 打工</span>}
                  />
                </div>
              </Panel>
            </div>

            <Panel title="行动卡片状态">
              <div className="flex flex-col gap-6">
                <ActionCard
                  title="常识文化课"
                  description="基础课程，适合稳步提升学识，不会造成明显压力。"
                  status="available"
                  effects="学识 +0.5  精神磨损 +5  资金 -200"
                  apCost={1}

                  onAction={() => undefined}
                />
                <ActionCard
                  title="少儿演讲课"
                  description="推荐给口才偏低的 AI，本月收益更均衡。"
                  status="recommended"
                  effects="口才 +1.0  精神磨损 +10  资金 -500"
                  apCost={2}

                  onAction={() => undefined}
                />
                <ActionCard
                  title="助教打工"
                  description="本月已经完成，收入和属性变化已经写入日志。"
                  status="completed"
                  effects="资金 +500  责任 +0.3"
                  apCost={2}
                  onAction={() => undefined}
                />
              </div>
            </Panel>

            <Panel title="角色状态片段">
              <div className="grid grid-cols-[320px_1fr] gap-7">
                <div
                  className="flex flex-col items-center justify-center gap-4"
                  style={{
                    height: 390,
                    backgroundColor: 'var(--color-panel-soft)',
                    borderWidth: 4,
                    borderStyle: 'solid',
                    borderColor: 'var(--color-border-soft)',
                  }}
                >
                  <AssetSlot assetId="portrait_ai_normal" width={190} height={300} />
                  <span className="text-card-title text-text-primary">小星</span>
                </div>
                <div className="flex flex-col gap-5 justify-center">
                  <StatBar label="学识" value={7} />
                  <StatBar label="艺术" value={4} />
                  <StatBar label="体能" value={3} />
                  <StatBar label="逻辑" value={8} />
                  <StatBar label="口才" value={5} />
                  <StatBar label="社交" value={6} />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
};
