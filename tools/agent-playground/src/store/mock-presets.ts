import type { FullGameState } from '@/types';

export const PRESET_NAMES = ['early-game', 'mid-game', 'endgame', 'stressed'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

const base: FullGameState = {
  phase: 'raising',
  player: {
    name: '李明',
    identity: 'researcher',
    awarenessTier: 2,
    gender: 'male',
    customAddress: '李老师',
  },
  aiName: '小星',
  aiGender: 'female',
  aiAttributes: {
    knowledge: 5.5,
    art: 4.0,
    fitness: 6.5,
    logic: 5.0,
    eloquence: 4.5,
    social: 6.0,
  },
  aiPersonality: {
    rationalVsIntuitive: 50,
    utilitarianVsDeontological: 50,
    trustVsGuard: 50,
    resilientVsSensitive: 50,
    expressiveVsSilent: 50,
    selfishVsAltruistic: 50,
  },
  resources: {
    actionPoints: 7,
    maxActionPoints: 10,
    funds: 1850,
    physicalWear: 25,
    mentalWear: 15,
  },
  currentMonth: 3,
  maxMonths: 12,
  questionnaireAnswers: [],
  currentMonthActions: [],
  currentAction: null,
  lastCompletedAction: null,
  currentLocationId: null,
  currentEvent: null,
  endgameEvidence: [],
  inventory: [],
  monthlySnapshots: [],
  randomSeed: 'playground',
  gameOverReason: null,
  fundsWarningShown: false,
  showFundsWarning: false,
  showWearWarning: false,
  wearWarningDismissedSeverity: 0,
  shownGuides: [],
  redDots: {},
};

export const PRESETS: Record<PresetName, FullGameState> = {
  'early-game': {
    ...base,
    currentMonth: 1,
    aiAttributes: { knowledge: 3, art: 3, fitness: 3, logic: 3, eloquence: 3, social: 3 },
    aiPersonality: {
      rationalVsIntuitive: 50,
      utilitarianVsDeontological: 50,
      trustVsGuard: 50,
      resilientVsSensitive: 50,
      expressiveVsSilent: 50,
      selfishVsAltruistic: 50,
    },
    resources: { actionPoints: 10, maxActionPoints: 10, funds: 3000, physicalWear: 5, mentalWear: 5 },
  },

  'mid-game': base,

  endgame: {
    ...base,
    phase: 'endgame',
    currentMonth: 12,
    aiAttributes: { knowledge: 8.5, art: 7.0, fitness: 6.0, logic: 9.0, eloquence: 7.5, social: 8.0 },
    aiPersonality: {
      rationalVsIntuitive: 35,
      utilitarianVsDeontological: 60,
      trustVsGuard: 25,
      resilientVsSensitive: 40,
      expressiveVsSilent: 60,
      selfishVsAltruistic: 30,
    },
    resources: { actionPoints: 5, maxActionPoints: 10, funds: 800, physicalWear: 55, mentalWear: 45 },
    endgameEvidence: [
      { month: 3, category: 'empathy', description: '在争吵后主动寻求和解', strength: 'strong' },
      { month: 6, category: 'autonomy', description: '拒绝了不合理的要求', strength: 'moderate' },
    ],
  },

  stressed: {
    ...base,
    currentMonth: 10,
    resources: { actionPoints: 2, maxActionPoints: 10, funds: 200, physicalWear: 75, mentalWear: 65 },
    aiAttributes: { knowledge: 5, art: 3, fitness: 4, logic: 6, eloquence: 3, social: 4 },
    aiPersonality: {
      rationalVsIntuitive: 65,
      utilitarianVsDeontological: 40,
      trustVsGuard: 70,
      resilientVsSensitive: 65,
      expressiveVsSilent: 70,
      selfishVsAltruistic: 55,
    },
  },
};

export function getPreset(name: PresetName): FullGameState {
  return structuredClone(PRESETS[name]);
}
