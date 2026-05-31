import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { boardToBitboards, type GomokuBoard, type GomokuStone } from '../../engine/gomoku-bitboards';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import {
  createExamGomokuAiTestResultAction,
  createGomokuAiTestResultAction,
} from '../../data/gomoku-ai-test-action';
import { useGameStore } from '../../store/gameStore';
import { triggerSpecialEventAfterAction } from '../../engine/special-event-trigger';

const BOARD_SIZE = 15;
const EMPTY_BOARD = () => Array.from({ length: BOARD_SIZE }, () => Array<GomokuStone | null>(BOARD_SIZE).fill(null));
const DEFAULT_DIFFICULTY: Difficulty = 'medium';
const EXAM_GOMOKU_PATH = '/exam/company-entrance/gomoku';

type Difficulty = 'easy' | 'medium' | 'hard';
type Move = { row: number; col: number };
type GameResult = 'playing' | 'human-win' | 'ai-win' | 'draw';

const difficultyLabel: Record<Difficulty, string> = {
  easy: '轻松',
  medium: '标准',
  hard: '最高',
};

type GomokuScenario = 'dev' | 'raising' | 'exam';

type ScenarioConfig = {
  introEyebrow: string;
  introTitle: string;
  introText: string;
  rewardText: string;
  failureText: string;
  difficulty: Difficulty;
  shouldShowIntro: boolean;
  isManagedFlow: boolean;
};

const scenarioConfigs: Record<GomokuScenario, ScenarioConfig> = {
  dev: {
    introEyebrow: '开发调试',
    introTitle: '五子棋对战',
    introText: '',
    rewardText: '',
    failureText: '',
    difficulty: DEFAULT_DIFFICULTY,
    shouldShowIntro: false,
    isManagedFlow: false,
  },
  raising: {
    introEyebrow: '基石公司 · 志愿',
    introTitle: '五子棋AI测试',
    introText: '基石工业正在招募志愿者测试新型棋类对战AI。你将与它完成一局五子棋对战；若你获胜，将获得全属性 +3 与资金 +200，若失败，本轮没有奖励。',
    rewardText: '全属性 +3 / 资金 +200',
    failureText: '一无所获',
    difficulty: DEFAULT_DIFFICULTY,
    shouldShowIntro: true,
    isManagedFlow: true,
  },
  exam: {
    introEyebrow: '基石工业 · 等候区',
    introTitle: '益智陪伴型AI体验',
    introText: '您的AI正在检测中。在此期间，您可以体验本公司最新研制的益智陪伴型AI，您可以通过五子棋的方式参与我们的体验。如果胜利的话，我们会给予您的AI全属性提升5，奖励资金2000；如果失败也没有关系，重在体验。',
    rewardText: '全属性 +5 / 资金 +2000',
    failureText: '重在体验，无惩罚',
    difficulty: 'hard',
    shouldShowIntro: true,
    isManagedFlow: true,
  },
};

function createPseudoRandomSeed() {
  return (Date.now() ^ Math.floor(performance.now() * 1000) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function pseudoRandom(seed: number) {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}

function nextStone(stone: GomokuStone): GomokuStone {
  return stone === 'black' ? 'white' : 'black';
}

function findWinningLine(board: GomokuBoard, row: number, col: number): Move[] | null {
  const player = board[row]?.[col];
  if (!player) return null;

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dRow, dCol] of directions) {
    const line: Move[] = [{ row, col }];

    for (let step = 1; step < 5; step++) {
      const nextRow = row + dRow * step;
      const nextCol = col + dCol * step;
      if (board[nextRow]?.[nextCol] !== player) break;
      line.push({ row: nextRow, col: nextCol });
    }

    for (let step = 1; step < 5; step++) {
      const nextRow = row - dRow * step;
      const nextCol = col - dCol * step;
      if (board[nextRow]?.[nextCol] !== player) break;
      line.unshift({ row: nextRow, col: nextCol });
    }

    if (line.length >= 5) {
      return line.slice(0, 5);
    }
  }

  return null;
}

function isBoardFull(board: GomokuBoard) {
  return board.every((row) => row.every(Boolean));
}

function getFallbackMove(board: GomokuBoard): Move | null {
  const nearby: Move[] = [];
  const empty: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col]) continue;
      empty.push({ row, col });

      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
          if (dRow === 0 && dCol === 0) continue;
          if (board[row + dRow]?.[col + dCol]) {
            nearby.push({ row, col });
            dRow = 2;
            break;
          }
        }
      }
    }
  }

  const pool = nearby.length ? nearby : empty;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const GomokuAiDemoPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRaisingEvent = location.pathname === '/raising/company/gomoku-ai-test';
  const isExamEvent = location.pathname === EXAM_GOMOKU_PATH;
  const scenario: GomokuScenario = isExamEvent ? 'exam' : isRaisingEvent ? 'raising' : 'dev';
  const scenarioConfig = scenarioConfigs[scenario];
  const applyActionResult = useGameStore((s) => s.applyActionResult);
  const setCurrentLocationId = useGameStore((s) => s.setCurrentLocationId);
  const [board, setBoard] = useState<GomokuBoard>(() => EMPTY_BOARD());
  const [humanPlayer, setHumanPlayer] = useState<GomokuStone>('black');
  const [currentPlayer, setCurrentPlayer] = useState<GomokuStone>('black');
  const [gameStarted, setGameStarted] = useState(false);
  const [result, setResult] = useState<GameResult>('playing');
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [winningLine, setWinningLine] = useState<Move[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [showIntro, setShowIntro] = useState(scenarioConfig.shouldShowIntro);
  const [settlementResult, setSettlementResult] = useState<'won' | 'lost' | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const boardRef = useRef(board);
  const resultRef = useRef(result);
  const currentPlayerRef = useRef(currentPlayer);
  const humanPlayerRef = useRef(humanPlayer);
  const computerPlayerRef = useRef<GomokuStone>('white');
  const aiRequestInFlightRef = useRef(false);
  const aiRequestIdRef = useRef(0);

  const computerPlayer = useMemo(() => nextStone(humanPlayer), [humanPlayer]);
  const isHumanTurn = gameStarted && result === 'playing' && currentPlayer === humanPlayer && !aiThinking;

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  useEffect(() => {
    humanPlayerRef.current = humanPlayer;
    computerPlayerRef.current = computerPlayer;
  }, [computerPlayer, humanPlayer]);

  useEffect(() => {
    const worker = new Worker(new URL('../../engine/gomoku-ai-worker.js', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const { type, move, progress, requestId } = event.data as {
        type: string;
        move?: Move | null;
        progress?: number;
        requestId?: number;
      };

      if (type === 'PROGRESS_UPDATE' && typeof progress === 'number') {
        setAiProgress(Math.max(8, Math.min(96, progress)));
        return;
      }

      if (type === 'BEST_MOVE_FOUND') {
        if (requestId !== aiRequestIdRef.current || currentPlayerRef.current !== computerPlayerRef.current) {
          return;
        }

        aiRequestInFlightRef.current = false;
        const fallbackMove = getFallbackMove(boardRef.current);
        window.setTimeout(() => {
          if (requestId !== aiRequestIdRef.current || currentPlayerRef.current !== computerPlayerRef.current) {
            return;
          }

          setAiThinking(false);
          setAiProgress(100);
          applyMove(
            move && boardRef.current[move.row]?.[move.col] === null ? move : fallbackMove,
            computerPlayerRef.current,
          );
        }, 120);
      }
    };

    worker.onerror = () => {
      aiRequestInFlightRef.current = false;
      const fallbackMove = getFallbackMove(boardRef.current);
      setAiThinking(false);
      if (currentPlayerRef.current === computerPlayerRef.current) {
        applyMove(fallbackMove, computerPlayerRef.current);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [computerPlayer]);

  const statusText = (() => {
    if (!gameStarted) return '点击开始';
    if (result === 'human-win') return '你赢了';
    if (result === 'ai-win') return 'AI 赢了';
    if (result === 'draw') return '平局';
    if (aiThinking) return 'AI 正在思考';
    return isHumanTurn ? '轮到你落子' : '等待 AI';
  })();

  useEffect(() => {
    if (!scenarioConfig.isManagedFlow || settlementResult || result === 'playing') return;
    setSettlementResult(result === 'human-win' ? 'won' : 'lost');
  }, [result, scenarioConfig.isManagedFlow, settlementResult]);

  function resetGame() {
    setBoard(EMPTY_BOARD());
    setHumanPlayer('black');
    setCurrentPlayer('black');
    setGameStarted(false);
    setResult('playing');
    setLastMove(null);
    setWinningLine([]);
    setAiThinking(false);
    setAiProgress(0);
    setSettlementResult(null);
    aiRequestInFlightRef.current = false;
    aiRequestIdRef.current += 1;
    workerRef.current?.postMessage({ type: 'NEW_GAME' });
  }

  function startGame() {
    const seed = createPseudoRandomSeed();
    const nextHumanPlayer: GomokuStone = pseudoRandom(seed) < 0.5 ? 'black' : 'white';
    const freshBoard = EMPTY_BOARD();
    setBoard(freshBoard);
    boardRef.current = freshBoard;
    setHumanPlayer(nextHumanPlayer);
    humanPlayerRef.current = nextHumanPlayer;
    computerPlayerRef.current = nextStone(nextHumanPlayer);
    setCurrentPlayer('black');
    currentPlayerRef.current = 'black';
    setGameStarted(true);
    setResult('playing');
    resultRef.current = 'playing';
    setLastMove(null);
    setWinningLine([]);
    setAiProgress(0);
    setSettlementResult(null);
    aiRequestInFlightRef.current = false;
    aiRequestIdRef.current += 1;
    workerRef.current?.postMessage({ type: 'NEW_GAME' });

    if (nextHumanPlayer === 'white') {
      window.setTimeout(() => requestAiMove(freshBoard), 350);
    }
  }

  function applyMove(move: Move | null, player: GomokuStone) {
    if (!move || resultRef.current !== 'playing' || currentPlayerRef.current !== player) return;

    setBoard((previousBoard) => {
      if (previousBoard[move.row]?.[move.col] !== null) return previousBoard;

      const nextBoard = previousBoard.map((row) => [...row]);
      nextBoard[move.row][move.col] = player;
      boardRef.current = nextBoard;
      setLastMove(move);

      const line = findWinningLine(nextBoard, move.row, move.col);
      if (line) {
        setWinningLine(line);
        setResult(player === humanPlayerRef.current ? 'human-win' : 'ai-win');
        resultRef.current = player === humanPlayerRef.current ? 'human-win' : 'ai-win';
        return nextBoard;
      }

      if (isBoardFull(nextBoard)) {
        setResult('draw');
        resultRef.current = 'draw';
        return nextBoard;
      }

      const next = nextStone(player);
      setCurrentPlayer(next);
      currentPlayerRef.current = next;
      if (next === computerPlayerRef.current) {
        window.setTimeout(() => requestAiMove(nextBoard), 120);
      }

      return nextBoard;
    });
  }

  function requestAiMove(nextBoard: GomokuBoard) {
    const worker = workerRef.current;
    if (
      !worker ||
      resultRef.current !== 'playing' ||
      currentPlayerRef.current !== computerPlayerRef.current ||
      aiRequestInFlightRef.current
    ) {
      return;
    }

    const { blackBitboard, whiteBitboard } = boardToBitboards(nextBoard);
    const requestId = aiRequestIdRef.current + 1;
    aiRequestIdRef.current = requestId;
    aiRequestInFlightRef.current = true;
    setAiThinking(true);
    setAiProgress(10);
    worker.postMessage({
      type: 'FIND_BEST_MOVE',
      data: {
        blackBitboard,
        whiteBitboard,
        computerPlayer: computerPlayerRef.current,
        humanPlayer: humanPlayerRef.current,
        difficulty: scenarioConfig.difficulty,
        requestId,
      },
    });
  }

  function handleCellClick(row: number, col: number) {
    if (!isHumanTurn || board[row][col] !== null) return;
    applyMove({ row, col }, humanPlayer);
  }

  function finishRaisingEvent() {
    if (!settlementResult) return;
    const resultAction = createGomokuAiTestResultAction(settlementResult === 'won');
    setCurrentLocationId('company');
    applyActionResult(resultAction);
    triggerSpecialEventAfterAction(resultAction, 'company');
    navigate('/raising/action-progress', { state: { skipProgress: true } });
  }

  function finishExamEvent() {
    if (!settlementResult) return;
    const resultAction = createExamGomokuAiTestResultAction(settlementResult === 'won');
    setCurrentLocationId('company');
    applyActionResult(resultAction);
    navigate('/exam/testing');
  }

  function finishManagedEvent() {
    if (isExamEvent) {
      finishExamEvent();
      return;
    }
    finishRaisingEvent();
  }

  const winningKeySet = new Set(winningLine.map((move) => `${move.row}-${move.col}`));
  const sideText = humanPlayer === 'black' ? '你执黑，先手' : '你执白，后手';
  const phaseText = gameStarted ? sideText : '开局随机决定先后手';

  return (
    <div
      className="flex h-full w-full items-center justify-center text-text-primary"
      style={{
        background:
          'radial-gradient(circle at 50% 18%, rgba(168,233,255,0.14), transparent 30%), var(--color-canvas)',
      }}
    >
      <main
        className="flex flex-col items-center"
        style={{
          ...chromePanelStyle({ strong: true, padding: 28 }),
          width: 980,
          minHeight: 930,
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        <div className="relative z-[1] flex w-full flex-col items-center">
          <div
            className="mb-6 flex w-full items-center justify-between gap-6"
            style={{
              height: 104,
              padding: '18px 22px',
              border: '1px solid var(--color-border-soft)',
              background: 'rgba(255,255,255,0.08)',
            }}
          >
            <div>
              <div className="text-[18px] font-bold text-text-secondary">五子棋对战</div>
              <div className="mt-2 text-[32px] font-bold leading-none text-text-primary">{phaseText}</div>
            </div>
            <div className="flex items-center gap-3">
              {!scenarioConfig.isManagedFlow ? (
                <>
                  <Button variant="secondary" onClick={startGame} style={{ width: 160, height: 64 }}>
                    {gameStarted ? '新开局' : '开始'}
                  </Button>
                <Button variant="secondary" onClick={() => resetGame()} style={{ width: 136, height: 64 }}>
                  重置
                </Button>
                </>
              ) : null}
            </div>
          </div>

          <div
            className="mb-6 grid w-full grid-cols-3 gap-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <div
              style={{
                border: '1px solid var(--color-border-soft)',
                background: 'rgba(255,255,255,0.07)',
                padding: '14px 18px',
              }}
            >
              <div className="text-[14px] font-bold opacity-70">状态</div>
              <div className="mt-1 text-[22px] font-bold text-text-primary">{statusText}</div>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border-soft)',
                background: 'rgba(255,255,255,0.07)',
                padding: '14px 18px',
              }}
            >
              <div className="text-[14px] font-bold opacity-70">执棋</div>
              <div className="mt-1 text-[22px] font-bold text-text-primary">
                {gameStarted ? (humanPlayer === 'black' ? '黑棋先手' : '白棋后手') : '随机决定'}
              </div>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border-soft)',
                background: 'rgba(255,255,255,0.07)',
                padding: '14px 18px',
              }}
            >
              <div className="text-[14px] font-bold opacity-70">AI</div>
              <div className="mt-1 text-[22px] font-bold text-text-primary">
                {difficultyLabel[scenarioConfig.difficulty]}
              </div>
            </div>
            {scenarioConfig.isManagedFlow ? (
              <div
                style={{
                  border: '1px solid var(--color-border-soft)',
                  background: 'rgba(255,255,255,0.07)',
                  padding: '14px 18px',
                }}
              >
                <div className="text-[14px] font-bold opacity-70">胜利奖励</div>
                <div className="mt-1 text-[22px] font-bold text-text-primary">{scenarioConfig.rewardText}</div>
              </div>
            ) : null}
          </div>

          <div className="mb-5 h-3 w-full overflow-hidden border border-border-soft bg-black/20">
            <div
              className="h-full bg-status-available transition-[width] duration-150"
              style={{ width: `${aiThinking ? aiProgress : result === 'playing' ? 0 : 100}%` }}
            />
          </div>

          <div
            className={`grid aspect-square w-[680px] grid-cols-[repeat(15,minmax(0,1fr))] border-[4px] border-[#ffffff] bg-[#cbe6f2] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.22)] ${
              !gameStarted ? 'opacity-55' : ''
            }`}
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isLastMove = lastMove?.row === rowIndex && lastMove.col === colIndex;
                const isWinning = winningKeySet.has(`${rowIndex}-${colIndex}`);
                const isCenter = rowIndex === 7 && colIndex === 7;

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className="relative aspect-square border border-[#6d97aa] bg-[#d7eef8] p-0 hover:bg-[#eaf8ff] disabled:cursor-default disabled:hover:bg-[#d7eef8]"
                    disabled={!isHumanTurn || Boolean(cell)}
                    aria-label={`第 ${rowIndex + 1} 行，第 ${colIndex + 1} 列`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {isCenter && !cell ? (
                      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5e879a]" />
                    ) : null}
                    {cell ? (
                      <span
                        className={`absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
                          cell === 'black'
                            ? 'bg-[radial-gradient(circle_at_32%_28%,#585858,#050505_72%)]'
                            : 'border border-black/10 bg-[radial-gradient(circle_at_32%_28%,#ffffff,#d7d7d7_74%)]'
                        } ${isWinning ? 'ring-4 ring-warm-accent ring-offset-2 ring-offset-[#d7eef8]' : ''}`}
                      />
                    ) : null}
                    {isLastMove && !isWinning ? (
                      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff4a4a] shadow-[0_0_12px_rgba(255,74,74,0.9)]" />
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </main>

      {showIntro ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 1001, background: 'rgba(0,0,0,0.52)' }}
        >
          <section style={{ ...chromePanelStyle({ strong: true, padding: 32 }), width: 680 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1] flex flex-col gap-6">
              <div>
                <div className="text-[18px] font-bold text-text-secondary">{scenarioConfig.introEyebrow}</div>
                <div className="mt-2 text-[34px] font-bold leading-none text-text-primary">{scenarioConfig.introTitle}</div>
              </div>
              <p className="m-0 text-[20px] font-bold leading-relaxed text-text-secondary">
                {scenarioConfig.introText}
              </p>
              <div
                className="grid grid-cols-2 gap-3"
                style={{
                  border: '1px solid var(--color-border-soft)',
                  background: 'rgba(255,255,255,0.07)',
                  padding: 16,
                }}
              >
                <Metric label="消耗" value={isExamEvent ? '无行动点消耗' : '1 行动点'} />
                <Metric label="AI难度" value={difficultyLabel[scenarioConfig.difficulty]} />
                <Metric label="胜利奖励" value={scenarioConfig.rewardText} />
                <Metric label="失败结果" value={scenarioConfig.failureText} />
              </div>
              <div className="flex justify-center gap-4">
                {isRaisingEvent ? (
                  <Button variant="secondary" onClick={() => navigate('/raising/location/company')} style={{ width: 170, height: 62 }}>
                    返回
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowIntro(false);
                    startGame();
                  }}
                  style={{ width: 230, height: 68 }}
                >
                  {isExamEvent ? '开始体验' : '开始测试'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {settlementResult ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 1002, background: 'rgba(0,0,0,0.56)' }}
        >
          <section style={{ ...chromePanelStyle({ strong: true, padding: 32 }), width: 640 }}>
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div className="relative z-[1] flex flex-col items-center gap-6 text-center">
              <div className="text-[18px] font-bold text-text-secondary">测试结束</div>
              <div className="text-[34px] font-bold leading-tight text-text-primary">
                {settlementResult === 'won'
                  ? `你赢了，恭喜你获得${scenarioConfig.rewardText.replace(' / ', '，')}`
                  : isExamEvent
                    ? '很遗憾，本次未获胜，但体验已经完成，无额外惩罚'
                    : '很遗憾，你一无所获'}
              </div>
              <Button variant="primary" onClick={finishManagedEvent} style={{ width: 240, height: 72 }}>
                {isExamEvent ? '继续检测' : '查看结果'}
              </Button>
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
    <div className="mt-1 text-[22px] font-bold text-text-primary">{value}</div>
  </div>
);
