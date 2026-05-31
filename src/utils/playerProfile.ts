import type { PlayerGender, PlayerProfile } from '../types';

export function getPlayerGenderLabel(gender: PlayerGender | undefined): string {
  return gender === 'female' ? '女' : '男';
}

export function getPlayerPronoun(player: Pick<PlayerProfile, 'gender'>): string {
  return player.gender === 'female' ? '她' : '他';
}

export function getPlayerObjectPronoun(player: Pick<PlayerProfile, 'gender'>): string {
  return player.gender === 'female' ? '她' : '他';
}
