import type { Identity, AwarenessTier } from '../types';

export function calculateIdentity(answers: string[]): { identity: Identity; awarenessTier: AwarenessTier } {
  const scores = { volunteer: 0, researcher: 0, committee: 0 };

  // Q1: rational/intuitive → volunteer vs researcher
  if (answers[0] === 'rational') scores.volunteer += 1;
  else scores.researcher += 1;

  // Q2: trust/guard → volunteer vs committee
  if (answers[1] === 'trust') scores.volunteer += 1;
  else scores.committee += 1;

  // Q3: functional/companion → researcher vs volunteer
  if (answers[2] === 'functional') scores.researcher += 1;
  else scores.volunteer += 1;

  // Q4: open/worried → committee vs researcher
  if (answers[3] === 'open') scores.committee += 1;
  else scores.researcher += 1;

  // Q5: responsible/personal → committee vs volunteer
  if (answers[4] === 'responsible') scores.committee += 1;
  else scores.volunteer += 1;

  const max = Math.max(scores.volunteer, scores.researcher, scores.committee);
  let identity: Identity;
  if (scores.committee === max) identity = 'committee';
  else if (scores.researcher === max) identity = 'researcher';
  else identity = 'volunteer';

  const awarenessTier: AwarenessTier = identity === 'volunteer' ? 1 : 2;

  return { identity, awarenessTier };
}
