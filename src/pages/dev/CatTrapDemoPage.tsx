import React, { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import {
  createCatTrapGame,
  findCatTrapEscapePath,
  getCatTrapBoardSize,
  isCatTrapBoundary,
  playCatTrapTurn,
  type CatTrapCoord,
  type CatTrapDifficulty,
  type CatTrapGameState,
} from '../../engine/cat-trap';

const difficultyLabels: Record<CatTrapDifficulty, string> = {
  easy: '简单',
  standard: '普通',
  sharp: '困难',
};

const difficultyHints: Record<CatTrapDifficulty, string> = {
  easy: '目标移动更松散，适合熟悉规则。',
  standard: '目标会沿最近路线尝试逃离。',
  sharp: '目标会更主动地贴近边界。',
};

function coordId(coord: CatTrapCoord) {
  return `${coord.row}-${coord.col}`;
}

function createNewGame() {
  return createCatTrapGame();
}

export const CatTrapDemoPage: React.FC = () => {
  const [game, setGame] = useState<CatTrapGameState>(() => createNewGame());
  const [difficulty, setDifficulty] = useState<CatTrapDifficulty>('standard');
  const [lastBlocked, setLastBlocked] = useState<CatTrapCoord | null>(null);
  const [visiblePath, setVisiblePath] = useState<CatTrapCoord[]>(() => findCatTrapEscapePath(createNewGame().board, createNewGame().cat) ?? []);

  const boardSize = getCatTrapBoardSize(game.board);
  const pathKeySet = useMemo(() => new Set(visiblePath.map(coordId)), [visiblePath]);
  const remainingPathSteps = Math.max(0, visiblePath.length - 1);
  const blockedCount = game.board.flat().filter((cell) => cell.state === 'blocked').length;

  const statusText = (() => {
    if (game.result === 'trapped') return '围堵成功';
    if (game.result === 'escaped') return '目标已抵达边界';
    if (remainingPathSteps <= 2) return '出口很近';
    if (remainingPathSteps <= 4) return '正在压缩路线';
    return '路线仍然宽裕';
  })();

  const resultText = (() => {
    if (game.result === 'trapped') return `用了 ${game.moves} 步完成封锁`;
    if (game.result === 'escaped') return `第 ${game.moves} 步没能拦住`;
    return `预计 ${remainingPathSteps} 步可抵达边界`;
  })();

  function resetGame(nextDifficulty = difficulty) {
    const nextGame = createNewGame();
    setGame(nextGame);
    setDifficulty(nextDifficulty);
    setLastBlocked(null);
    setVisiblePath(findCatTrapEscapePath(nextGame.board, nextGame.cat) ?? []);
  }

  function handleCellClick(target: CatTrapCoord) {
    if (game.result !== 'playing') return;

    const nextGame = playCatTrapTurn(game, target, difficulty);
    if (nextGame.board === game.board) return;

    setGame(nextGame);
    setLastBlocked(nextGame.blocked ?? null);
    setVisiblePath(nextGame.result === 'playing' ? findCatTrapEscapePath(nextGame.board, nextGame.cat) ?? [] : nextGame.catPath ?? []);
  }

  function handleDifficulty(nextDifficulty: CatTrapDifficulty) {
    resetGame(nextDifficulty);
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center text-text-primary"
      style={{
        background:
          'radial-gradient(circle at 52% 16%, rgba(168,233,255,0.15), transparent 31%), linear-gradient(180deg, #171d28, #111722 58%, #0b1018)',
      }}
    >
      <main className="grid w-[1480px] grid-cols-[880px_1fr] gap-8">
        <section
          style={{
            ...chromePanelStyle({ strong: true, padding: 30 }),
            minHeight: 900,
          }}
        >
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
                <div className="text-[18px] font-bold text-text-secondary">封锁演练</div>
                <div className="mt-2 text-[34px] font-bold leading-none text-text-primary">{statusText}</div>
              </div>
              <Button variant="secondary" onClick={() => resetGame()} style={{ width: 154, height: 64 }}>
                新开局
              </Button>
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
                    const disabled = game.result !== 'playing' || cell.state !== 'empty';

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
                                ? 'linear-gradient(180deg, rgba(168,233,255,0.58), rgba(111,159,190,0.42))'
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
              <div className="text-[18px] font-bold text-text-secondary">局势</div>
              <div className="mt-3 text-[32px] font-bold leading-tight">{resultText}</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="行动" value={`${game.moves}`} />
                <Metric label="封锁格" value={`${blockedCount}`} />
                <Metric label="路线" value={game.result === 'playing' ? `${remainingPathSteps}` : '--'} />
                <Metric label="边界" value={game.result === 'escaped' ? '抵达' : '监控'} />
              </div>
            </div>
          </section>

          <section style={{ ...chromePanelStyle({ padding: 24 }), minHeight: 250 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1]">
              <div className="mb-4 text-[18px] font-bold text-text-secondary">难度</div>
              <div className="grid gap-3">
                {(Object.keys(difficultyLabels) as CatTrapDifficulty[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => handleDifficulty(item)}
                    className="ui-chrome-button relative h-[66px] w-full px-4 text-left"
                    style={{
                      ...chromePanelStyle({
                        padding: 0,
                        borderColor: item === difficulty ? 'rgba(168,233,255,0.86)' : 'var(--color-border-soft)',
                      }),
                      background:
                        item === difficulty
                          ? 'linear-gradient(180deg, rgba(168,233,255,0.28), rgba(86,101,119,0.50))'
                          : undefined,
                    }}
                  >
                    <span className="relative z-[1] flex h-full items-center justify-between">
                      <span>
                        <span className="block text-[20px] font-bold text-text-primary">{difficultyLabels[item]}</span>
                        <span className="mt-1 block text-[12px] font-bold text-text-secondary opacity-80">
                          {difficultyHints[item]}
                        </span>
                      </span>
                      <span className="h-3 w-3 border border-border-strong bg-status-available opacity-80" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section style={{ ...chromePanelStyle({ padding: 24 }), minHeight: 222 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1]">
              <div className="text-[18px] font-bold text-text-secondary">规则</div>
              <div className="mt-4 space-y-3 text-[18px] font-bold leading-relaxed text-text-primary">
                <p>点击空格部署封锁点。</p>
                <p>每部署一次，目标会移动一格。</p>
                <p>目标到达外圈则逃脱；无路可走则封锁成功。</p>
              </div>
            </div>
          </section>
        </aside>
      </main>
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
