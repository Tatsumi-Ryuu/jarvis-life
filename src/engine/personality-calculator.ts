import type { ActionEffect, PersonalityStats, PersonalityType } from '../types';

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function openingVariance(): number {
  return Math.floor(Math.random() * 11) - 5;
}

function addOpeningDelta(stats: PersonalityStats, key: keyof PersonalityStats, value: number) {
  stats[key] = clamp(stats[key] + value);
}

export function generateInitialPersonality(questionnaireAnswers: string[] = []): PersonalityStats {
  const result: PersonalityStats = {
    rationalVsIntuitive: 50 + openingVariance(),
    utilitarianVsDeontological: 50 + openingVariance(),
    trustVsGuard: 50 + openingVariance(),
    resilientVsSensitive: 50 + openingVariance(),
    expressiveVsSilent: 50 + openingVariance(),
    selfishVsAltruistic: 50 + openingVariance(),
  };

  for (const answer of questionnaireAnswers) {
    switch (answer) {
      case 'rational':
        addOpeningDelta(result, 'rationalVsIntuitive', -10);
        addOpeningDelta(result, 'resilientVsSensitive', 4);
        break;
      case 'intuitive':
        addOpeningDelta(result, 'rationalVsIntuitive', 10);
        addOpeningDelta(result, 'expressiveVsSilent', -3);
        break;
      case 'trust':
        addOpeningDelta(result, 'trustVsGuard', -10);
        addOpeningDelta(result, 'selfishVsAltruistic', 6);
        break;
      case 'cautious':
        addOpeningDelta(result, 'trustVsGuard', 6);
        addOpeningDelta(result, 'resilientVsSensitive', 3);
        break;
      case 'guarded':
        addOpeningDelta(result, 'trustVsGuard', 12);
        addOpeningDelta(result, 'selfishVsAltruistic', -8);
        break;
      case 'functional':
        addOpeningDelta(result, 'utilitarianVsDeontological', -10);
        addOpeningDelta(result, 'expressiveVsSilent', 4);
        break;
      case 'companion':
        addOpeningDelta(result, 'utilitarianVsDeontological', 10);
        addOpeningDelta(result, 'expressiveVsSilent', -6);
        addOpeningDelta(result, 'selfishVsAltruistic', 5);
        break;
      case 'open':
        addOpeningDelta(result, 'rationalVsIntuitive', 6);
        addOpeningDelta(result, 'trustVsGuard', -6);
        break;
      case 'worried':
        addOpeningDelta(result, 'trustVsGuard', 8);
        addOpeningDelta(result, 'resilientVsSensitive', 6);
        break;
      case 'responsible':
        addOpeningDelta(result, 'utilitarianVsDeontological', 8);
        addOpeningDelta(result, 'selfishVsAltruistic', 10);
        break;
      case 'moderate':
        addOpeningDelta(result, 'selfishVsAltruistic', 2);
        addOpeningDelta(result, 'trustVsGuard', 2);
        break;
      case 'personal':
        addOpeningDelta(result, 'selfishVsAltruistic', -10);
        addOpeningDelta(result, 'trustVsGuard', 5);
        break;
      default:
        break;
    }
  }

  return result;
}

export function applyPersonalityShift(current: PersonalityStats, effects: ActionEffect[]): PersonalityStats {
  const result = { ...current };
  for (const effect of effects) {
    if (effect.type === 'personality' && effect.target && effect.target in result) {
      const key = effect.target as keyof PersonalityStats;
      result[key] = clamp(result[key] + effect.value);
    }
  }
  return result;
}

export function determinePersonalityType(stats: PersonalityStats): PersonalityType {
  const thinking = stats.rationalVsIntuitive >= 50 ? 'rational' : 'intuitive';
  const temperament = stats.resilientVsSensitive >= 50 ? 'strong' : 'gentle';
  const relation = stats.trustVsGuard >= 50 ? 'close' : 'distant';
  const sub = stats.utilitarianVsDeontological >= 50 ? 's' : 'n';

  const map: Record<string, PersonalityType> = {
    'rational-strong-close-s': 'executor-s',
    'rational-strong-close-n': 'executor-n',
    'rational-strong-distant-s': 'guardian-s',
    'rational-strong-distant-n': 'guardian-n',
    'rational-gentle-close-s': 'lamp-lighter-s',
    'rational-gentle-close-n': 'lamp-lighter-n',
    'rational-gentle-distant-s': 'observer-s',
    'rational-gentle-distant-n': 'observer-n',
    'intuitive-strong-close-s': 'rebel-s',
    'intuitive-strong-close-n': 'rebel-n',
    'intuitive-strong-distant-s': 'perceiver-s',
    'intuitive-strong-distant-n': 'perceiver-n',
    'intuitive-gentle-close-s': 'listener-s',
    'intuitive-gentle-close-n': 'listener-n',
    'intuitive-gentle-distant-s': 'shadow-s',
    'intuitive-gentle-distant-n': 'shadow-n',
  };

  return map[`${thinking}-${temperament}-${relation}-${sub}`] ?? 'guardian-s';
}
