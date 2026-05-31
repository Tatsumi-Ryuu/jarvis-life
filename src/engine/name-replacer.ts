const DEFAULT_AI_NAME = '小星';
const DEFAULT_PLAYER_NAME = '李明';

export function replaceNames(
  text: string,
  aiName: string,
  playerName: string,
): string {
  let result = text;
  if (aiName && aiName !== DEFAULT_AI_NAME) {
    result = result.replaceAll(DEFAULT_AI_NAME, aiName);
  }
  if (playerName && playerName !== DEFAULT_PLAYER_NAME) {
    result = result.replaceAll(DEFAULT_PLAYER_NAME, playerName);
  }
  return result;
}
