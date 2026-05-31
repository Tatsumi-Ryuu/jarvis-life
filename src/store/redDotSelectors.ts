import { useMemo } from 'react';
import { mockLocations } from '../data/mock-locations';
import type { ActionItem, AIAttributes, Identity, LocationId, ResourceState } from '../types';
import { useGameStore } from './gameStore';

export function getNewUnlockedActionIdsForLocation(
  locationId: LocationId,
  attributes: AIAttributes,
  resources: ResourceState,
  identity: Identity,
  seenUnlockedActionIds: string[],
): string[] {
  const location = mockLocations.find((loc) => loc.id === locationId);
  if (!location) return [];

  return location.actions
    .filter((action) => isNewlyUnlockedAction(action, attributes, resources, identity, seenUnlockedActionIds))
    .map((action) => action.id);
}

export function useRedDotMapNodes() {
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

export function useRedDotFlags() {
  const currentMonth = useGameStore((s) => s.currentMonth);
  const inventory = useGameStore((s) => s.inventory);
  const redDots = useGameStore((s) => s.redDots);
  const identity = useGameStore((s) => s.player.identity);
  const attributes = useGameStore((s) => s.aiAttributes);
  const resources = useGameStore((s) => s.resources);

  return useMemo(() => {
    const diary = redDots.finalizedDiaryMonths.some((month) => (
      month < currentMonth && !redDots.readDiaryMonths.includes(month)
    ));
    const backpack = inventory.some((item) => !redDots.seenInventoryItemIds.includes(item.id));
    const map = mockLocations.some((location) => (
      getNewUnlockedActionIdsForLocation(
        location.id,
        attributes,
        resources,
        identity,
        redDots.seenUnlockedActionIds,
      ).length > 0
    ));

    return {
      talk: !redDots.talkUsedMonths.includes(currentMonth),
      diary,
      backpack,
      map,
    };
  }, [attributes, currentMonth, identity, inventory, redDots, resources]);
}

function isNewlyUnlockedAction(
  action: ActionItem,
  attributes: AIAttributes,
  resources: ResourceState,
  identity: Identity,
  seenUnlockedActionIds: string[],
): boolean {
  if (!action.prerequisite || Object.keys(action.prerequisite).length === 0) return false;
  if (seenUnlockedActionIds.includes(action.id)) return false;
  if (action.identityRequired && action.identityRequired !== identity) return false;
  if (action.ap > 0 && resources.actionPoints < action.ap) return false;
  if (action.cost > 0 && resources.funds < action.cost) return false;

  return Object.entries(action.prerequisite).every(([key, min]) => (
    (attributes[key as keyof AIAttributes] ?? 0) >= (min ?? 0)
  ));
}
