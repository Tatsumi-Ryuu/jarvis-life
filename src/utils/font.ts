/** Scale a base pixel font size by the global --font-scale CSS variable. */
export function sf(basePx: number): string {
  return `calc(${basePx}px * var(--font-scale, 1))`;
}
