import { describe, expect, it } from 'vitest';
import {
  createCatTrapGame,
  findCatTrapEscapePath,
  getCatTrapNeighbors,
  playCatTrapTurn,
  type CatTrapCoord,
} from '../src/engine/cat-trap';

function blockCellsAround(cat: CatTrapCoord) {
  const game = createCatTrapGame([]);
  const blocked = getCatTrapNeighbors(game.board, cat);
  return createCatTrapGame(blocked);
}

describe('cat trap engine', () => {
  it('finds an escape path from the starting board', () => {
    const game = createCatTrapGame([]);
    const path = findCatTrapEscapePath(game.board, game.cat);

    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual(game.cat);
    expect(path?.length).toBeGreaterThan(1);
  });

  it('marks the game as trapped when all adjacent cells are blocked', () => {
    const game = blockCellsAround({ row: 5, col: 5 });
    const result = playCatTrapTurn(game, { row: 0, col: 0 });

    expect(result.result).toBe('trapped');
    expect(result.cat).toEqual({ row: 5, col: 5 });
  });

  it('marks the game as escaped when the cat reaches a boundary cell', () => {
    const game = createCatTrapGame([]);
    const result = playCatTrapTurn(
      {
        ...game,
        cat: { row: 1, col: 5 },
        board: game.board.map((row) => row.map((cell) => ({ ...cell, state: 'empty' as const }))),
      },
      { row: 5, col: 5 },
    );

    expect(result.result).toBe('escaped');
    expect(result.cat.row).toBe(0);
  });
});
