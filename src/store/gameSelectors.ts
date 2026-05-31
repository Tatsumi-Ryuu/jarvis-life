import { useMemo } from 'react';
import { mockLocations } from '../data/mock-locations';
import { getWearStage } from '../engine/ap-calculator';
import { getNewUnlockedActionIdsForLocation } from './redDotSelectors';
import { determinePersonalityType } from '../engine/personality-calculator';
import { replaceNames } from '../engine/name-replacer';
import type { LocationId } from '../types';
import { useGameStore } from './gameStore';

export function usePlayerProfile() {
  return useGameStore((s) => s.player);
}

export function useAIInfo() {
  const aiName = useGameStore((s) => s.aiName);
  const attributes = useGameStore((s) => s.aiAttributes);
  const personality = useGameStore((s) => s.aiPersonality);

  return useMemo(
    () => ({
      aiName,
      attributes,
      personality,
      personalityType: determinePersonalityType(personality),
    }),
    [aiName, attributes, personality],
  );
}

export function useResources() {
  return useGameStore((s) => s.resources);
}

export function useCurrentMonth() {
  return useGameStore((s) => ({
    currentMonth: s.currentMonth,
    maxMonths: s.maxMonths,
  }));
}

export function useCurrentAction() {
  return useGameStore((s) => s.currentAction);
}

export function useCurrentEvent() {
  return useGameStore((s) => s.currentEvent);
}

export function useLastSettlement() {
  return useGameStore((s) => {
    const snapshots = s.monthlySnapshots;
    for (let i = snapshots.length - 1; i >= 0; i -= 1) {
      if (snapshots[i].settlement) return snapshots[i].settlement;
    }
    return null;
  });
}

export function useInventory() {
  return useGameStore((s) => s.inventory);
}

export function useGamePhase() {
  return useGameStore((s) => s.phase);
}

export function useWearStage() {
  return useGameStore((s) =>
    getWearStage(s.resources.physicalWear, s.resources.mentalWear),
  );
}

export function useMapNodes() {
  const identity = useGameStore((s) => s.player.identity);
  const attributes = useGameStore((s) => s.aiAttributes);
  const resources = useGameStore((s) => s.resources);
  const seenUnlockedActionIds = useGameStore((s) => s.redDots.seenUnlockedActionIds);

  return useMemo(
    () =>
      mockLocations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        assetId: loc.assetId,
        locked: loc.id === 'government' && identity !== 'committee',
        newUnlockedActionIds: getNewUnlockedActionIdsForLocation(
          loc.id,
          attributes,
          resources,
          identity,
          seenUnlockedActionIds,
        ),
      })),
    [attributes, identity, resources, seenUnlockedActionIds],
  );
}

export function useLocationData(locationId: LocationId | undefined) {
  const currentMonthActions = useGameStore((s) => s.currentMonthActions);
  const actionPoints = useGameStore((s) => s.resources.actionPoints);
  const funds = useGameStore((s) => s.resources.funds);
  const aiName = useGameStore((s) => s.aiName);
  const playerName = useGameStore((s) => s.player.name);
  const identity = useGameStore((s) => s.player.identity);
  const aiAttributes = useGameStore((s) => s.aiAttributes);

  return useMemo(() => {
    if (!locationId) return null;
    const loc = mockLocations.find((l) => l.id === locationId);
    if (!loc) return null;

    return {
      ...loc,
      actions: loc.actions.map((a) => {
        const notEnoughAP = a.ap > 0 && actionPoints < a.ap;
        const notEnoughFunds = a.cost > 0 && funds < a.cost;
        const identityBlocked = a.identityRequired && a.identityRequired !== identity;
        const prereqFailed = a.prerequisite
          ? Object.entries(a.prerequisite).some(([key, min]) => (
              (aiAttributes[key as keyof typeof aiAttributes] ?? 0) < (min ?? 0)
            ))
          : false;

        let status = a.status;
        if (notEnoughAP || notEnoughFunds || identityBlocked || prereqFailed) status = 'locked';

        return {
          ...a,
          status,
          description: replaceNames(a.description, aiName, playerName),
        };
      }),
    };
  }, [actionPoints, currentMonthActions, funds, locationId, aiName, playerName, identity, aiAttributes]);
}

export function useQuestionnaireAnswers() {
  return useGameStore((s) => s.questionnaireAnswers);
}

export function useMonthlySnapshot(month: number) {
  return useGameStore((s) =>
    s.monthlySnapshots[month - 1] ?? null,
  );
}
