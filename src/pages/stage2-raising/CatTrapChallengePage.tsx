import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { createFindCatResultAction } from '../../data/cat-trap-action';
import { triggerSpecialEventAfterAction } from '../../engine/special-event-trigger';
import {
  createCatTrapGame,
  findCatTrapEscapePath,
  getCatTrapBoardSize,
  isCatTrapBoundary,
  playCatTrapTurn,
  type CatTrapCoord,
  type CatTrapGameState,
} from '../../engine/cat-trap';
import { useGameStore } from '../../store/gameStore';

function coordId(coord: CatTrapCoord) {
  return `${coord.row}-${coord.col}`;
}

function createNewGame() {
  return createCatTrapGame();
}

export const CatTrapChallengePage: React.FC = () => {
  const navigate = useNavigate();
  const applyActionResult = useGameStore((s) => s.applyActionResult);
  const setCurrentLocationId = useGameStore((s) => s.setCurrentLocationId);
  const [game, setGame] = useState<CatTrapGameState>(() => createNewGame());
  const [lastBlocked, setLastBlocked] = useState<CatTrapCoord | null>(null);
  const [visiblePath, setVisiblePath] = useState<CatTrapCoord[]>(() => {
    const initialGame = createNewGame();
    return findCatTrapEscapePath(initialGame.board, initialGame.cat) ?? [];
  });
  const [showIntro, setShowIntro] = useState(true);
  const resultHandledRef = useRef(false);

  const boardSize = getCatTrapBoardSize(game.board);
  const pathKeySet = useMemo(() => new Set(visiblePath.map(coordId)), [visiblePath]);
  const remainingPathSteps = Math.max(0, visiblePath.length - 1);
  const blockedCount = game.board.flat().filter((cell) => cell.state === 'blocked').length;

  const statusText = (() => {
    if (game.result === 'trapped') return '找到它了';
    if (game.result === 'escaped') return '它跑掉了';
    if (remainingPathSteps <= 2) return '快拦住它';
    if (remainingPathSteps <= 4) return '正在缩小范围';
    return '小心它逃走';
  })();

  useEffect(() => {
    if (game.result === 'playing' || resultHandledRef.current) return;

    resultHandledRef.current = true;
    const won = game.result === 'trapped';
    const timer = window.setTimeout(() => {
      const resultAction = createFindCatResultAction(won);
      setCurrentLocationId('park');
      applyActionResult(resultAction);
      triggerSpecialEventAfterAction(resultAction, 'park');
      navigate('/raising/action-progress', { state: { skipProgress: true } });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [applyActionResult, game.result, navigate, setCurrentLocationId]);

  function handleCellClick(target: CatTrapCoord) {
    if (showIntro || game.result !== 'playing') return;

    const nextGame = playCatTrapTurn(game, target, 'standard');
    if (nextGame === game) return;

    setGame(nextGame);
    setLastBlocked(nextGame.blocked ?? null);
    setVisiblePath(nextGame.result === 'playing' ? findCatTrapEscapePath(nextGame.board, nextGame.cat) ?? [] : nextGame.catPath ?? []);
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center text-text-primary"
      style={{
        background:
          'radial-gradient(circle at 52% 16%, rgba(168,233,255,0.16), transparent 31%), linear-gradient(180deg, #171d28, #111722 58%, #0b1018)',
      }}
    >
      <main className="grid w-[1360px] grid-cols-[860px_1fr] gap-8">
        <section style={{ ...chromePanelStyle({ strong: true, padding: 30 }), minHeight: 900 }}>
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <div className="relative z-[1] flex h-full flex-col items-center">
            <div
              className="mb-6 flex w-full items-center justify-between gap-6"
              style={{
                height: 106,
                padding: '18px 22px',
                border: '1px solid var(--color-border-soft)',
                background: 'rgba(255,255,255,0.08)',
              }}
            >
              <div>
                <div className="text-[18px] font-bold text-text-secondary">找到小猫</div>
                <div className="mt-2 text-[34px] font-bold leading-none text-text-primary">{statusText}</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold text-text-secondary opacity-75">行动</div>
                <div className="mt-1 text-[28px] font-bold">{game.moves}</div>
              </div>
            </div>

            <div
              className="relative grid w-[760px]"
              style={{
                gridTemplateRows: `repeat(${boardSize}, 48px)`,
                justifyContent: 'center',
                rowGap: 12,
                padding: '34px 22px',
                border: '1px solid var(--color-border-soft)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04)), rgba(0,0,0,0.16)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07), 0 18px 36px rgba(0,0,0,0.18)',
              }}
            >
              {game.board.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex justify-center gap-3"
                  style={{ transform: rowIndex % 2 === 0 ? 'translateX(-27px)' : 'translateX(27px)' }}
                >
                  {row.map((cell) => {
                    const isBoundary = isCatTrapBoundary(game.board, cell);
                    const isLastBlocked = lastBlocked ? cell.row === lastBlocked.row && cell.col === lastBlocked.col : false;
                    const isPath = pathKeySet.has(coordId(cell)) && cell.state === 'empty';
                    const disabled = showIntro || game.result !== 'playing' || cell.state !== 'empty';

                    return (
                      <button
                        key={coordId(cell)}
                        aria-label={`第 ${cell.row + 1} 行，第 ${cell.col + 1} 列`}
                        disabled={disabled}
                        onClick={() => handleCellClick(cell)}
                        className="relative h-12 w-12 p-0 disabled:cursor-default"
                        style={{
                          clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)',
                          border: '1px solid rgba(255,255,255,0.48)',
                          background:
                            cell.state === 'blocked'
                              ? 'linear-gradient(180deg, #5f6d7b, #202c38)'
                              : isPath
                                ? 'linear-gradient(180deg, rgba(168,233,255,0.52), rgba(111,159,190,0.34))'
                                : isBoundary
                                  ? 'linear-gradient(180deg, rgba(255,230,184,0.34), rgba(255,255,255,0.07))'
                                  : 'linear-gradient(180deg, rgba(236,248,255,0.34), rgba(128,150,171,0.34))',
                          boxShadow: isLastBlocked
                            ? '0 0 0 3px rgba(255,230,184,0.42), inset 0 0 0 1px rgba(255,255,255,0.12)'
                            : cell.state === 'cat'
                              ? '0 0 24px rgba(168,233,255,0.52), inset 0 0 0 1px rgba(255,255,255,0.16)'
                              : 'inset 0 0 0 1px rgba(255,255,255,0.10)',
                        }}
                      >
                        {cell.state === 'cat' ? (
                          <span
                            className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2"
                            style={{
                              clipPath: 'polygon(50% 0, 92% 25%, 92% 75%, 50% 100%, 8% 75%, 8% 25%)',
                              background:
                                'radial-gradient(circle at 34% 30%, #ffffff 0 8%, #a8e9ff 9% 23%, #244d62 58%, #111820 100%)',
                              border: '1px solid rgba(255,255,255,0.68)',
                            }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <section style={{ ...chromePanelStyle({ padding: 24 }), minHeight: 238 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1]">
              <div className="text-[18px] font-bold text-text-secondary">目标</div>
              <div className="mt-3 text-[30px] font-bold leading-tight">
                {game.result === 'playing' ? `离外圈还有 ${remainingPathSteps} 步` : '正在结算奖励'}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="封锁" value={`${blockedCount}`} />
                <Metric label="路线" value={game.result === 'playing' ? `${remainingPathSteps}` : '--'} />
                <Metric label="胜利" value="身心 -10 / 资金 +100" />
                <Metric label="失败" value="身心 -5 / 资金 +100" />
              </div>
            </div>
          </section>

          <section style={{ ...chromePanelStyle({ padding: 24 }), minHeight: 210 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1]">
              <div className="text-[18px] font-bold text-text-secondary">现场</div>
              <div className="mt-4 space-y-3 text-[18px] font-bold leading-relaxed text-text-primary">
                <p>点击空格缩小小猫的活动范围。</p>
                <p>每次点击后，小猫会移动一格。</p>
                <p>别让它抵达外圈。</p>
              </div>
            </div>
          </section>
        </aside>
      </main>

      {showIntro ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 1001, background: 'rgba(0,0,0,0.52)' }}
        >
          <section style={{ ...chromePanelStyle({ strong: true, padding: 32 }), width: 620 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1] flex flex-col gap-6">
              <div>
                <div className="text-[18px] font-bold text-text-secondary">公园行动</div>
                <div className="mt-2 text-[34px] font-bold leading-none text-text-primary">找到小猫</div>
              </div>
              <p className="m-0 text-[20px] font-bold leading-relaxed text-text-secondary">
                有小猫走失了，找到它，别让它跑掉！
              </p>
              <div
                className="grid grid-cols-2 gap-3"
                style={{
                  border: '1px solid var(--color-border-soft)',
                  background: 'rgba(255,255,255,0.07)',
                  padding: 16,
                }}
              >
                <Metric label="消耗" value="1 行动点" />
                <Metric label="胜利奖励" value="身心 -10 / 资金 +100" />
                <Metric label="失败奖励" value="身心 -5 / 资金 +100" />
                <Metric label="目标" value="拦住它" />
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="secondary" onClick={() => navigate('/raising/location/park')} style={{ width: 170, height: 62 }}>
                  返回
                </Button>
                <Button variant="primary" onClick={() => setShowIntro(false)} style={{ width: 210, height: 68 }}>
                  开始寻找
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

type MetricProps = {
  label: string;
  value: string;
};

const Metric: React.FC<MetricProps> = ({ label, value }) => (
  <div
    style={{
      border: '1px solid var(--color-border-soft)',
      background: 'rgba(255,255,255,0.07)',
      padding: '12px 14px',
    }}
  >
    <div className="text-[13px] font-bold text-text-secondary opacity-75">{label}</div>
    <div className="mt-1 text-[24px] font-bold text-text-primary">{value}</div>
  </div>
);
