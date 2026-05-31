import type { GameState } from '../types';

export const mockGameState: GameState = {
  player: {
    name: '李明',
    identity: 'researcher',
    awarenessTier: 2,
    gender: 'male',
    customAddress: '李老师',
  },
  aiName: '小星',
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
};
