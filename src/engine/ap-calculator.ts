import type { WearStage } from '../types';

export function calculateMaxAP(physicalWear: number, mentalWear: number): number {
  const maxWear = Math.max(physicalWear, mentalWear);
  if (maxWear >= 81) return 5;
  if (maxWear >= 61) return 7;
  if (maxWear >= 31) return 9;
  return 10;
}

export function getWearStage(physicalWear: number, mentalWear: number): WearStage {
  const maxWear = Math.max(physicalWear, mentalWear);
  if (maxWear >= 81) return 'danger';
  if (maxWear >= 61) return 'high';
  if (maxWear >= 31) return 'medium';
  return 'low';
}

export function getWearColor(physicalWear: number, mentalWear: number): string {
  const maxWear = Math.max(physicalWear, mentalWear);
  if (maxWear >= 81) return 'var(--color-danger)';
  if (maxWear >= 61) return 'var(--color-wear-high)';
  if (maxWear >= 31) return 'var(--color-wear-medium)';
  return 'var(--color-text-primary)';
}

export function getSingleWearColor(value: number): string {
  if (value >= 81) return 'var(--color-danger)';
  if (value >= 61) return 'var(--color-wear-high)';
  if (value >= 31) return 'var(--color-wear-medium)';
  return 'var(--color-text-primary)';
}

const START_YEAR = 2040;
const START_MONTH = 3;

export function formatGameDate(gameMonth: number): string {
  const totalMonths = START_MONTH + gameMonth - 1;
  const year = START_YEAR + Math.floor((totalMonths - 1) / 12);
  const month = ((totalMonths - 1) % 12) + 1;
  return `${year}年${month}月`;
}
