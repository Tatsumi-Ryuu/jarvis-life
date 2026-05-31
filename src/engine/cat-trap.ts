export type CatTrapCellState = 'empty' | 'blocked' | 'cat';
export type CatTrapResult = 'playing' | 'trapped' | 'escaped';
export type CatTrapDifficulty = 'easy' | 'standard' | 'sharp';

export type CatTrapCoord = {
  row: number;
  col: number;
};

export type CatTrapCell = CatTrapCoord & {
  state: CatTrapCellState;
};

export type CatTrapBoard = CatTrapCell[][];

export type CatTrapGameState = {
  board: CatTrapBoard;
  cat: CatTrapCoord;
  moves: number;
  result: CatTrapResult;
};

export type CatTrapMoveResult = CatTrapGameState & {
  blocked?: CatTrapCoord;
  catPath?: CatTrapCoord[];
};

const DEFAULT_SIZE = 11;
const CENTER_INDEX = Math.floor(DEFAULT_SIZE / 2);
const DEFAULT_BLOCKED_CELLS: CatTrapCoord[] = [
  { row: 1, col: 3 },
  { row: 1, col: 8 },
  { row: 2, col: 6 },
  { row: 3, col: 1 },
  { row: 3, col: 9 },
  { row: 4, col: 4 },
  { row: 6, col: 2 },
  { row: 6, col: 8 },
  { row: 7, col: 5 },
  { row: 8, col: 1 },
  { row: 8, col: 7 },
  { row: 9, col: 4 },
];

const EVEN_ROW_DIRECTIONS: CatTrapCoord[] = [
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
];

const ODD_ROW_DIRECTIONS: CatTrapCoord[] = [
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
];

function sameCoord(a: CatTrapCoord, b: CatTrapCoord) {
  return a.row === b.row && a.col === b.col;
}

function coordKey(coord: CatTrapCoord) {
  return `${coord.row}:${coord.col}`;
}

function cloneBoard(board: CatTrapBoard): CatTrapBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function getCatTrapBoardSize(board: CatTrapBoard) {
  return board.length;
}

export function isCatTrapCoordInside(board: CatTrapBoard, coord: CatTrapCoord) {
  return coord.row >= 0 && coord.row < board.length && coord.col >= 0 && coord.col < (board[coord.row]?.length ?? 0);
}

export function isCatTrapBoundary(board: CatTrapBoard, coord: CatTrapCoord) {
  const size = getCatTrapBoardSize(board);
  return coord.row === 0 || coord.col === 0 || coord.row === size - 1 || coord.col === size - 1;
}

export function getCatTrapNeighbors(board: CatTrapBoard, coord: CatTrapCoord) {
  const directions = coord.row % 2 === 0 ? EVEN_ROW_DIRECTIONS : ODD_ROW_DIRECTIONS;
  return directions
    .map((direction) => ({ row: coord.row + direction.row, col: coord.col + direction.col }))
    .filter((neighbor) => isCatTrapCoordInside(board, neighbor));
}

export function createCatTrapGame(blockedCells = DEFAULT_BLOCKED_CELLS): CatTrapGameState {
  const cat = { row: CENTER_INDEX, col: CENTER_INDEX };
  const blockedSet = new Set(blockedCells.map(coordKey));
  const board = Array.from({ length: DEFAULT_SIZE }, (_, row) =>
    Array.from({ length: DEFAULT_SIZE }, (_, col) => {
      const coord = { row, col };
      const state: CatTrapCellState = sameCoord(coord, cat) ? 'cat' : blockedSet.has(coordKey(coord)) ? 'blocked' : 'empty';
      return { ...coord, state };
    }),
  );

  return {
    board,
    cat,
    moves: 0,
    result: 'playing',
  };
}

export function findCatTrapEscapePath(board: CatTrapBoard, cat: CatTrapCoord): CatTrapCoord[] | null {
  if (isCatTrapBoundary(board, cat)) {
    return [cat];
  }

  const visited = new Set<string>([coordKey(cat)]);
  const queue: CatTrapCoord[][] = [[cat]];

  while (queue.length) {
    const path = queue.shift();
    if (!path) break;

    const current = path[path.length - 1];
    const neighbors = getCatTrapNeighbors(board, current)
      .filter((neighbor) => board[neighbor.row][neighbor.col].state !== 'blocked')
      .filter((neighbor) => !visited.has(coordKey(neighbor)));

    for (const neighbor of neighbors) {
      const nextPath = [...path, neighbor];
      if (isCatTrapBoundary(board, neighbor)) {
        return nextPath;
      }

      visited.add(coordKey(neighbor));
      queue.push(nextPath);
    }
  }

  return null;
}

function findAnyOpenNeighbor(board: CatTrapBoard, cat: CatTrapCoord) {
  return getCatTrapNeighbors(board, cat).find((neighbor) => board[neighbor.row][neighbor.col].state === 'empty') ?? null;
}

function findFarthestOpenNeighbor(board: CatTrapBoard, cat: CatTrapCoord) {
  const center = { row: CENTER_INDEX, col: CENTER_INDEX };
  const openNeighbors = getCatTrapNeighbors(board, cat).filter((neighbor) => board[neighbor.row][neighbor.col].state === 'empty');
  if (!openNeighbors.length) return null;

  return openNeighbors.reduce((best, neighbor) => {
    const bestScore = Math.abs(best.row - center.row) + Math.abs(best.col - center.col);
    const nextScore = Math.abs(neighbor.row - center.row) + Math.abs(neighbor.col - center.col);
    return nextScore > bestScore ? neighbor : best;
  });
}

function chooseCatStep(board: CatTrapBoard, cat: CatTrapCoord, difficulty: CatTrapDifficulty) {
  if (difficulty === 'easy') {
    const looseStep = findAnyOpenNeighbor(board, cat);
    return {
      nextCat: looseStep,
      path: looseStep ? [cat, looseStep] : null,
    };
  }

  const path = findCatTrapEscapePath(board, cat);
  if (path && path.length > 1) {
    return {
      nextCat: path[1],
      path,
    };
  }

  const fallback = findFarthestOpenNeighbor(board, cat);
  return {
    nextCat: fallback,
    path: fallback ? [cat, fallback] : null,
  };
}

export function playCatTrapTurn(
  state: CatTrapGameState,
  target: CatTrapCoord,
  difficulty: CatTrapDifficulty = 'standard',
): CatTrapMoveResult {
  if (state.result !== 'playing' || !isCatTrapCoordInside(state.board, target)) {
    return state;
  }

  const targetCell = state.board[target.row][target.col];
  if (targetCell.state !== 'empty') {
    return state;
  }

  const board = cloneBoard(state.board);
  board[target.row][target.col].state = 'blocked';
  const catMove = chooseCatStep(board, state.cat, difficulty);

  if (!catMove.nextCat) {
    return {
      board,
      cat: state.cat,
      moves: state.moves + 1,
      result: 'trapped',
      blocked: target,
      catPath: catMove.path ?? [],
    };
  }

  board[state.cat.row][state.cat.col].state = 'empty';
  board[catMove.nextCat.row][catMove.nextCat.col].state = 'cat';

  return {
    board,
    cat: catMove.nextCat,
    moves: state.moves + 1,
    result: isCatTrapBoundary(board, catMove.nextCat) ? 'escaped' : 'playing',
    blocked: target,
    catPath: catMove.path ?? [],
  };
}
