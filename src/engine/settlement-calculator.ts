import type { AIAttributes, AttributeKey, CompletedAction, SettlementData } from '../types';
import { ATTRIBUTE_KEYS } from '../types';

export function generateSettlement(
  beforeAttributes: AIAttributes,
  afterAttributes: AIAttributes,
  beforeFunds: number,
  afterFunds: number,
  beforePhysicalWear: number,
  afterPhysicalWear: number,
  beforeMentalWear: number,
  afterMentalWear: number,
  completedActions: CompletedAction[],
  eventNames: string[],
  month: number,
  attributeLabels: Record<AttributeKey, string>,
): SettlementData {
  const attributeChanges = ATTRIBUTE_KEYS.map((key) => ({
    key,
    label: attributeLabels[key],
    before: beforeAttributes[key],
    after: afterAttributes[key],
    delta: afterAttributes[key] - beforeAttributes[key],
  }));

  const fundsIncome = completedActions.reduce((sum, a) => {
    return sum + a.effects
      .filter((e) => e.type === 'funds' && e.value > 0)
      .reduce((s, e) => s + e.value, 0);
  }, 0);

  const fundsExpense = completedActions.reduce((sum, a) => {
    return sum + a.effects
      .filter((e) => e.type === 'funds' && e.value < 0)
      .reduce((s, e) => s + e.value, 0);
  }, 0);

  return {
    month,
    attributeChanges,
    fundsBefore: beforeFunds,
    fundsAfter: afterFunds,
    fundsIncome,
    fundsExpense,
    physicalWearBefore: beforePhysicalWear,
    physicalWearAfter: afterPhysicalWear,
    mentalWearBefore: beforeMentalWear,
    mentalWearAfter: afterMentalWear,
    completedActions,
    events: eventNames,
  };
}
