export type GomokuStone = 'black' | 'white';
export type GomokuCell = GomokuStone | null;
export type GomokuBoard = GomokuCell[][];

const BOARD_SIZE = 15;
const BITS_PER_NUMBER = 32;
const BITBOARD_SLOTS = 8;

export function boardToBitboards(board: GomokuBoard) {
  const blackBitboard = Array(BITBOARD_SLOTS).fill(0) as number[];
  const whiteBitboard = Array(BITBOARD_SLOTS).fill(0) as number[];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const position = row * BOARD_SIZE + col;
      const arrayIndex = Math.floor(position / BITS_PER_NUMBER);
      const bitIndex = position % BITS_PER_NUMBER;
      const cell = board[row]?.[col];

      if (cell === 'black') {
        blackBitboard[arrayIndex] |= 1 << bitIndex;
      } else if (cell === 'white') {
        whiteBitboard[arrayIndex] |= 1 << bitIndex;
      }
    }
  }

  return { blackBitboard, whiteBitboard };
}
