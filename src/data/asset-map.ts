import type { AiGender } from '../types';

export type PortraitEmotion = 'normal' | 'happy' | 'tired' | 'confused' | 'hurt';
export type PortraitVariant = 'full' | 'half';

export function getPortraitId(
  emotion: PortraitEmotion,
  gender: AiGender,
  variant: PortraitVariant = 'full',
): string {
  const prefix = variant === 'half' ? 'portrait_half' : 'portrait_ai';
  return `${prefix}_${gender}_${emotion}`;
}

export function getStickerId(emotion: string, gender: AiGender): string {
  return `sticker_${gender}_${emotion}`;
}

const assetUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}${path}`;
};

export const assetMap: Record<string, string> = {
  // Backgrounds
  bg_title: assetUrl('assets/backgrounds/bg_title.jpg?v=4'),
  bg_home: assetUrl('assets/backgrounds/bg_home.jpg'),
  bg_school: assetUrl('assets/backgrounds/bg_school.jpg'),
  bg_park: assetUrl('assets/backgrounds/bg_park.jpg'),
  bg_company: assetUrl('assets/backgrounds/bg_company.jpg'),
  bg_government: assetUrl('assets/backgrounds/bg_government.jpg'),
  bg_mall: assetUrl('assets/backgrounds/bg_mall.jpg'),
  bg_office: assetUrl('assets/backgrounds/bg_office.jpg'),
  bg_logistics: assetUrl('assets/backgrounds/bg_logistics.jpg'),
  bg_map: assetUrl('assets/backgrounds/bg_map.jpg'),
  bg_map2: assetUrl('assets/backgrounds/bg_map2.jpg'),
  bg_story: assetUrl('assets/backgrounds/bg_story.jpg'),
  bg_company_entrance: assetUrl('assets/backgrounds/bg_company_entrance.png'),
  bg_company_testing: assetUrl('assets/backgrounds/bg_company_testing.png'),
  bg_terminal: assetUrl('assets/backgrounds/bg_terminal.png'),
  bg_month_start: assetUrl('assets/backgrounds/bg_month_start.png'),

  // AI full-body portraits
  portrait_ai_male_normal: assetUrl('assets/portraits/portrait_ai_male_normal.jpg'),
  portrait_ai_male_happy: assetUrl('assets/portraits/portrait_ai_male_happy.png'),
  portrait_ai_male_tired: assetUrl('assets/portraits/portrait_ai_male_tired.png'),
  portrait_ai_male_confused: assetUrl('assets/portraits/portrait_ai_male_confused.png'),
  portrait_ai_male_hurt: assetUrl('assets/portraits/portrait_ai_male_hurt.png'),
  portrait_ai_female_normal: assetUrl('assets/portraits/portrait_ai_female_normal.jpg'),
  portrait_ai_female_happy: assetUrl('assets/portraits/portrait_ai_female_happy.png'),
  portrait_ai_female_tired: assetUrl('assets/portraits/portrait_ai_female_tired.png'),
  portrait_ai_female_confused: assetUrl('assets/portraits/portrait_ai_female_confused.png'),
  portrait_ai_female_hurt: assetUrl('assets/portraits/portrait_ai_female_hurt.png'),

  // AI half-body portraits
  portrait_half_male_normal: assetUrl('assets/portraits/portrait_half_male_normal.png'),
  portrait_half_male_happy: assetUrl('assets/portraits/portrait_half_male_happy.png'),
  portrait_half_male_tired: assetUrl('assets/portraits/portrait_half_male_tired.png'),
  portrait_half_male_confused: assetUrl('assets/portraits/portrait_half_male_confused.png'),
  portrait_half_male_hurt: assetUrl('assets/portraits/portrait_half_male_hurt.png'),
  portrait_half_female_normal: assetUrl('assets/portraits/portrait_half_female_normal.png'),
  portrait_half_female_happy: assetUrl('assets/portraits/portrait_half_female_happy.png'),
  portrait_half_female_tired: assetUrl('assets/portraits/portrait_half_female_tired.png'),
  portrait_half_female_confused: assetUrl('assets/portraits/portrait_half_female_confused.png'),
  portrait_half_female_hurt: assetUrl('assets/portraits/portrait_half_female_hurt.png'),

  // Legacy aliases
  portrait_ai_normal: assetUrl('assets/portraits/portrait_ai_male_normal.jpg'),
  portrait_ai_happy: assetUrl('assets/portraits/portrait_ai_male_happy.png'),
  portrait_ai_tired: assetUrl('assets/portraits/portrait_ai_male_tired.png'),
  portrait_ai_confused: assetUrl('assets/portraits/portrait_ai_male_confused.png'),
  portrait_ai_hurt: assetUrl('assets/portraits/portrait_ai_male_hurt.png'),

  // UI icons
  icon_ap: assetUrl('assets/icons/icon_ap.png'),
  icon_funds: assetUrl('assets/icons/icon_funds.png'),
  icon_mental: assetUrl('assets/icons/icon_mental.png'),
  icon_physical: assetUrl('assets/icons/icon_physical.png'),
  icon_map: assetUrl('assets/icons/icon_map.svg'),
  icon_diary: assetUrl('assets/icons/icon_diary.svg'),
  icon_backpack: assetUrl('assets/icons/icon_backpack.svg'),
  icon_talk: assetUrl('assets/icons/icon_talk.svg'),
  'icon-action': assetUrl('assets/icons/icon_action.svg'),
  icon_settings: assetUrl('assets/icons/icon_settings.png'),
  icon_save: assetUrl('assets/icons/icon_save.png'),
  icon_warn: assetUrl('assets/icons/icon_warn.png'),

  // UI assets
  logo_jarvis_life: assetUrl('assets/brand/jarvis-life-logo-512.jpg?v=2'),
  ui_avatar_ai_male: assetUrl('assets/ui/ui_avatar_ai_male.jpg'),
  ui_avatar_ai_female: assetUrl('assets/ui/ui_avatar_ai_female.jpg'),

  // Stickers - female
  sticker_female_greeting: assetUrl('assets/stickers/sticker_female_greeting.png'),
  sticker_female_sparkle: assetUrl('assets/stickers/sticker_female_sparkle.png'),
  sticker_female_confused: assetUrl('assets/stickers/sticker_female_confused.png'),
  sticker_female_tired: assetUrl('assets/stickers/sticker_female_tired.png'),
  sticker_female_angry: assetUrl('assets/stickers/sticker_female_angry.png'),
  sticker_female_cry: assetUrl('assets/stickers/sticker_female_cry.png'),

  // Stickers - male
  sticker_male_greeting: assetUrl('assets/stickers/sticker_male_greeting.png'),
  sticker_male_sparkle: assetUrl('assets/stickers/sticker_male_sparkle.png'),
  sticker_male_confused: assetUrl('assets/stickers/sticker_male_confused.png'),
  sticker_male_tired: assetUrl('assets/stickers/sticker_male_tired.png'),
  sticker_male_angry: assetUrl('assets/stickers/sticker_male_angry.png'),
  sticker_male_cry: assetUrl('assets/stickers/sticker_male_cry.png'),
};
