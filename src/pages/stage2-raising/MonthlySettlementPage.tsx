import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { useMonthlySnapshot } from '../../store/gameSelectors';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from '../../types';
import { AssetSlot } from '../../components/ui/AssetSlot';

export const MonthlySettlementPage: React.FC = () => {
  const navigate = useNavigate();
  const { month: monthParam } = useParams<{ month: string }>();
  const currentMonth = useGameStore((s) => s.currentMonth);
  const displayMonth = parseInt(monthParam || '1') || currentMonth;

  const snapshot = useMonthlySnapshot(displayMonth);
  const currentAttributes = useGameStore((s) => s.aiAttributes);
  const resources = useGameStore((s) => s.resources);

  const startState = snapshot?.monthStartState;

  const attributeChanges = ATTRIBUTE_KEYS.map((key) => {
    const before = startState?.attributes[key] ?? currentAttributes[key];
    const after = currentAttributes[key];
    return { key, label: ATTRIBUTE_LABELS[key], before, after, delta: after - before };
  });

  const fundsBefore = startState?.funds ?? 0;
  const fundsAfter = resources.funds;
  const fundsIncome = fundsAfter - fundsBefore > 0 ? fundsAfter - fundsBefore : 0;
  const fundsExpense = fundsAfter - fundsBefore < 0 ? fundsAfter - fundsBefore : 0;

  const physicalWearBefore = startState?.physicalWear ?? 0;
  const physicalWearAfter = resources.physicalWear;
  const mentalWearBefore = startState?.mentalWear ?? 0;
  const mentalWearAfter = resources.mentalWear;

  const getNextRoute = () => {
    const nextMonth = currentMonth + 1;
    if (nextMonth === 6) return '/exam/notification';
    if (nextMonth > 12) return '/endgame/notification';
    return `/raising/month-start/${nextMonth}`;
  };

  return (
    <div
      className="relative flex items-start justify-center pt-[10px]"
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: 'var(--color-canvas)',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        overflowY: 'auto',
      }}
    >
      <div className="absolute inset-0">
        <AssetSlot assetId="bg_home" width={1920} height={1080} />
      </div>

      <div
        className="relative z-10 flex flex-col gap-6"
        style={{
          width: 1200,
          padding: '0 0 40px 0',
        }}
      >
        {/* Title */}
        <div
          className="flex items-center justify-center"
          style={{
            height: 80,
            backgroundColor: 'var(--color-panel)',
            borderWidth: 6,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
          }}
        >
          <span
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            第{displayMonth}月结算
          </span>
        </div>

        {/* Attribute changes section */}
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-soft)',
            padding: '20px 24px',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 12,
              display: 'block',
            }}
          >
            属性变化
          </span>
          <div className="flex flex-col gap-2">
            {attributeChanges.map((attr) => (
              <div
                key={attr.key}
                className="flex items-center justify-between px-4"
                style={{
                  height: 40,
                  backgroundColor: 'var(--color-panel-soft)',
                  borderWidth: 3,
                  borderStyle: 'solid',
                  borderColor: 'var(--color-border-soft)',
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    minWidth: 80,
                  }}
                >
                  {attr.label}
                </span>
                <span style={{ fontSize: 18, color: 'var(--color-text-secondary)' }}>
                  {Math.round(attr.before)}
                </span>
                <span style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>&rarr;</span>
                <span style={{ fontSize: 18, color: 'var(--color-text-primary)' }}>
                  {Math.round(attr.after)}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color:
                      attr.delta > 0
                        ? 'var(--color-status-available)'
                        : attr.delta < 0
                        ? 'var(--color-danger)'
                        : 'var(--color-text-muted)',
                    minWidth: 80,
                    textAlign: 'right',
                  }}
                >
                  {attr.delta > 0 ? '+' : ''}{Math.round(attr.delta)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Funds section */}
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-soft)',
            padding: '20px 24px',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 12,
              display: 'block',
            }}
          >
            资金
          </span>
          <div className="flex flex-col gap-2">
            {[
              { label: '本月收入', value: fundsIncome, color: 'var(--color-status-available)' },
              { label: '本月支出', value: fundsExpense, color: 'var(--color-danger)' },
              { label: '余额', value: fundsAfter, color: 'var(--color-text-primary)', bold: true },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4"
                style={{
                  height: 40,
                  backgroundColor: row.bold ? 'var(--color-panel-strong)' : 'var(--color-panel-soft)',
                  borderWidth: 3,
                  borderStyle: 'solid',
                  borderColor: row.bold ? 'var(--color-border-strong)' : 'var(--color-border-soft)',
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: row.bold ? 700 : 400,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: row.bold ? 700 : 400,
                    color: row.color,
                  }}
                >
                  {row.value > 0 && row.label !== '余额' ? '+' : ''}
                  {Math.round(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wear section */}
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-soft)',
            padding: '20px 24px',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 12,
              display: 'block',
            }}
          >
            磨损
          </span>
          <div className="flex flex-col gap-2">
            {[
              { label: '身体', before: physicalWearBefore, after: physicalWearAfter, delta: physicalWearAfter - physicalWearBefore },
              { label: '精神', before: mentalWearBefore, after: mentalWearAfter, delta: mentalWearAfter - mentalWearBefore },
            ].map((w) => (
              <div
                key={w.label}
                className="flex items-center justify-between px-4"
                style={{
                  height: 40,
                  backgroundColor: 'var(--color-panel-soft)',
                  borderWidth: 3,
                  borderStyle: 'solid',
                  borderColor: 'var(--color-border-soft)',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 80 }}>
                  {w.label}
                </span>
                <span style={{ fontSize: 18, color: 'var(--color-text-secondary)' }}>{Math.round(w.before)}</span>
                <span style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>&rarr;</span>
                <span style={{ fontSize: 18, color: 'var(--color-text-primary)' }}>{Math.round(w.after)}</span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: w.delta > 0 ? 'var(--color-danger)' : w.delta < 0 ? 'var(--color-status-available)' : 'var(--color-text-muted)',
                    minWidth: 80,
                    textAlign: 'right',
                  }}
                >
                  {w.delta > 0 ? '+' : ''}{Math.round(w.delta)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Continue button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => navigate(getNextRoute())}
            className="cursor-pointer font-bold"
            style={{
              width: 260,
              height: 86,
              backgroundColor: 'var(--color-action)',
              borderWidth: 6,
              borderStyle: 'solid',
              borderColor: 'var(--color-border-strong)',
              boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              fontFamily: 'Inter, "Noto Sans SC", sans-serif',
            }}
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
};
