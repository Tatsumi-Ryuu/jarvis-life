import type { ActionItem, EventDialogue, EventLogEntry, FullGameState } from '../types';

const BASE_TRIGGER_CHANCE = 0.4;
const TRIGGER_CHANCE_DECAY = 0.5;
const RECENT_STORY_WINDOW_MONTHS = 2;

interface EventSelectionContext {
  month: number;
  locationId: string;
  action: ActionItem;
  gameState: FullGameState;
  eventLog: EventLogEntry[];
}

export function selectRandomEvent(
  month: number,
  pool: EventDialogue[],
  context?: Partial<EventSelectionContext>,
): EventDialogue | null {
  if (pool.length === 0) return null;

  const eventsThisMonth = context?.eventLog?.filter(
    (entry) => entry.month === month && entry.type === 'event',
  ) ?? [];

  if (Math.random() >= getEventTriggerChance(eventsThisMonth.length)) return null;

  const eventLog = context?.eventLog ?? [];
  const recentEvents = getRecentStoryEvents(eventLog, month);

  const candidates = pool
    .filter((event) => matchesContext(event, month, context))
    .filter((event) => !hasEventAlreadyHappened(event, eventLog))
    .filter((event) => !isDuplicateTypeThisMonth(event, eventsThisMonth))
    .map((event) => ({ event, score: scoreEvent(event, context, recentEvents) }))
    .filter((candidate) => candidate.score > 0);

  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.score, 0);
  let roll = Math.random() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.score;
    if (roll <= 0) return candidate.event;
  }

  return candidates[candidates.length - 1].event;
}

export function getEventTriggerChance(eventsTriggeredThisMonth: number): number {
  return BASE_TRIGGER_CHANCE * (TRIGGER_CHANCE_DECAY ** Math.max(0, eventsTriggeredThisMonth));
}

function matchesContext(
  event: EventDialogue,
  month: number,
  context?: Partial<EventSelectionContext>,
): boolean {
  if (event.minMonth && month < event.minMonth) return false;
  if (event.maxMonth && month > event.maxMonth) return false;
  if (event.identityRequired && context?.gameState?.player.identity !== event.identityRequired) return false;

  if (context?.locationId && event.location !== context.locationId && event.location !== 'any') {
    return false;
  }

  return true;
}

function isDuplicateTypeThisMonth(event: EventDialogue, eventsThisMonth: EventLogEntry[]): boolean {
  return eventsThisMonth.some((entry) => {
    const eventType = typeof entry.technical?.eventType === 'string'
      ? entry.technical.eventType
      : entry.tags.find((tag) => tag === event.eventType);
    const location = typeof entry.technical?.location === 'string'
      ? entry.technical.location
      : entry.tags.find((tag) => tag === event.location);
    return eventType === event.eventType && location === event.location;
  });
}

function scoreEvent(
  event: EventDialogue,
  context?: Partial<EventSelectionContext>,
  recentEvents: EventLogEntry[] = [],
): number {
  let score = event.weight ?? 1;
  const action = context?.action;

  if (action) {
    if (event.relatedActions?.includes(action.id)) score += 2.4;
    if (event.relatedCategories?.includes(action.category)) score += 1.2;

    const actionAttributeTargets = action.effects
      .filter((effect) => effect.type === 'attribute')
      .map((effect) => effect.target);

    const attrMatches = event.relatedAttributes?.filter((key) => actionAttributeTargets.includes(key)).length ?? 0;
    score += attrMatches * 0.8;

    if (event.eventType === 'help' && isActionNearLimit(action, context)) score += 1.4;
    if (event.eventType === 'achievement' && actionAttributeTargets.length > 0) score += 0.5;
    if (event.eventType === 'art-dispute' && actionAttributeTargets.includes('art')) score += 1.8;
  }

  score *= getContinuityMultiplier(event, recentEvents);

  return Math.max(0, score);
}

function hasEventAlreadyHappened(event: EventDialogue, eventLog: EventLogEntry[]): boolean {
  return eventLog.some((entry) => {
    if (entry.type !== 'event') return false;
    const eventId = typeof entry.technical?.eventId === 'string' ? entry.technical.eventId : '';
    const eventTitle = typeof entry.technical?.eventTitle === 'string' ? entry.technical.eventTitle : '';
    return eventId === event.id || eventTitle === event.title;
  });
}

function getRecentStoryEvents(eventLog: EventLogEntry[], month: number): EventLogEntry[] {
  return eventLog.filter((entry) => (
    entry.type === 'event' &&
    entry.month <= month &&
    entry.month >= month - RECENT_STORY_WINDOW_MONTHS
  ));
}

function getContinuityMultiplier(event: EventDialogue, recentEvents: EventLogEntry[]): number {
  let multiplier = 1;
  const eventTags = new Set(event.tags ?? []);

  for (const entry of recentEvents) {
    const recentType = typeof entry.technical?.eventType === 'string' ? entry.technical.eventType : '';
    const recentLocation = typeof entry.technical?.location === 'string' ? entry.technical.location : '';

    if (recentType === event.eventType && recentLocation === event.location) {
      multiplier *= 0.25;
    } else if (recentType === event.eventType || recentLocation === event.location) {
      multiplier *= 0.72;
    }

    const overlap = entry.tags.filter((tag) => eventTags.has(tag)).length;
    if (overlap >= 2) {
      multiplier *= 0.45;
    } else if (overlap === 1) {
      multiplier *= 0.78;
    }
  }

  return multiplier;
}

function isActionNearLimit(action: ActionItem, context?: Partial<EventSelectionContext>): boolean {
  const attrs = context?.gameState?.aiAttributes;
  if (!attrs || !action.prerequisite) return false;

  return Object.entries(action.prerequisite).some(([key, min]) => {
    const value = attrs[key as keyof typeof attrs] ?? 0;
    return value >= min && value <= min + 8;
  });
}
