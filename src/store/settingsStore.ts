import { create } from 'zustand';
import {
  clearUserAIConfig,
  loadUserAIConfig,
  saveUserAIConfig,
  type AIConfigSaveResult,
  type UserAIConfig,
} from '../services/ai-config-service';

export type FontSize = 'small' | 'medium' | 'large';
export type { UserAIConfig };

const FONT_SCALES: Record<FontSize, string> = {
  small: '0.85',
  medium: '1',
  large: '1.15',
};

const STORAGE_KEY = 'jarvis-settings-font-size';

interface SettingsState {
  fontSize: FontSize;
  aiConfig: UserAIConfig;
  setFontSize: (size: FontSize) => void;
  saveAIConfig: (config: Partial<UserAIConfig>) => AIConfigSaveResult;
  clearAIConfig: () => UserAIConfig;
}

function applyFontScale(size: FontSize) {
  document.documentElement.style.setProperty('--font-scale', FONT_SCALES[size]);
}

const savedSize = (localStorage.getItem(STORAGE_KEY) as FontSize) || 'medium';
applyFontScale(savedSize);

export const useSettingsStore = create<SettingsState>((set) => ({
  fontSize: savedSize,
  aiConfig: loadUserAIConfig(),
  setFontSize: (size) => {
    localStorage.setItem(STORAGE_KEY, size);
    applyFontScale(size);
    set({ fontSize: size });
  },
  saveAIConfig: (config) => {
    const result = saveUserAIConfig(config);
    if (result.ok) set({ aiConfig: result.config });
    return result;
  },
  clearAIConfig: () => {
    const config = clearUserAIConfig();
    set({ aiConfig: config });
    return config;
  },
}));
