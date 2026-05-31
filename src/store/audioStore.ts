import { create } from 'zustand';
import { audioManager } from '../engine/audio-manager';

const STORAGE_KEY = 'jarvis-settings-audio';

interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { musicVolume: 70, sfxVolume: 85, muted: false };
}

function saveSettings(s: AudioSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface AudioStore extends AudioSettings {
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMuted: (muted: boolean) => void;
}

const initial = loadSettings();
// 初始化时同步到 AudioManager
audioManager.setMusicVolume(initial.musicVolume);
audioManager.setSfxVolume(initial.sfxVolume);
audioManager.setMuted(initial.muted);

export const useAudioStore = create<AudioStore>((set) => ({
  ...initial,

  setMusicVolume: (v) =>
    set((s) => {
      audioManager.setMusicVolume(v);
      const next = { ...s, musicVolume: v };
      saveSettings(next);
      return { musicVolume: v };
    }),

  setSfxVolume: (v) =>
    set((s) => {
      audioManager.setSfxVolume(v);
      const next = { ...s, sfxVolume: v };
      saveSettings(next);
      return { sfxVolume: v };
    }),

  setMuted: (muted) =>
    set((s) => {
      audioManager.setMuted(muted);
      const next = { ...s, muted };
      saveSettings(next);
      return { muted };
    }),
}));
