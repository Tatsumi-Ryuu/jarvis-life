/**
 * 音轨清单
 *
 * 添加新音轨只需在此文件新增一行。
 * 音频文件统一放在 public/audio/ 下。
 */

const audioUrl = (p: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}audio/${p}`;
};

// 背景音乐（循环播放）
export const BGM_TRACKS: Record<string, string> = {
  global: audioUrl('bgm/global.mp3'),
};

export type BgmKey = keyof typeof BGM_TRACKS;

// 音效（一次性播放）
export const SFX_TRACKS: Record<string, string> = {
  click: audioUrl('sfx/click.mp3'),
};

export type SfxKey = keyof typeof SFX_TRACKS;
