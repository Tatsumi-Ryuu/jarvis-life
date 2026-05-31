import type { PersonalityStats } from '../types';

export interface MbtiDimensionResult {
  code: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
  leftCode: string;
  rightCode: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
}

export interface MbtiPersonalitySummary {
  type: string;
  title: string;
  subtitle: string;
  dimensions: {
    energy: MbtiDimensionResult;
    information: MbtiDimensionResult;
    decision: MbtiDimensionResult;
    lifestyle: MbtiDimensionResult;
  };
  axisHighlights: string[];
  description: string;
  gameType: string;
}

const MBTI_TITLES: Record<string, { title: string; subtitle: string }> = {
  ISTJ: { title: '检查员', subtitle: '严谨可靠的执行者' },
  ISFJ: { title: '守护者', subtitle: '安静忠诚的照护者' },
  INFJ: { title: '提倡者', subtitle: '深沉理想的引导者' },
  INTJ: { title: '建筑师', subtitle: '独立深邃的思想者' },
  ISTP: { title: '手艺人', subtitle: '冷静锐利的实干家' },
  ISFP: { title: '探险家', subtitle: '敏感自由的独行者' },
  INFP: { title: '调停者', subtitle: '深情隐逸的理想主义者' },
  INTP: { title: '逻辑学家', subtitle: '独立分析的思考者' },
  ESTP: { title: '冒险家', subtitle: '果断灵活的行动派' },
  ESFP: { title: '表演者', subtitle: '鲜活热情的体验者' },
  ENFP: { title: '竞选者', subtitle: '自由发散的启发者' },
  ENTP: { title: '辩论家', subtitle: '机敏创新的挑战者' },
  ESTJ: { title: '管理者', subtitle: '务实高效的组织者' },
  ESFJ: { title: '供给者', subtitle: '温暖可靠的支持者' },
  ENFJ: { title: '教育家', subtitle: '洞察人心的协调者' },
  ENTJ: { title: '统帅', subtitle: '战略远见的领导者' },
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function dimension(
  value: number,
  leftCode: string,
  rightCode: string,
  leftLabel: string,
  rightLabel: string,
): MbtiDimensionResult {
  const normalized = clampPercent(value);
  return {
    code: normalized >= 50 ? rightCode : leftCode,
    leftCode,
    rightCode,
    leftLabel,
    rightLabel,
    value: normalized,
  } as MbtiDimensionResult;
}

function getGameType(stats: PersonalityStats): string {
  const thinking = stats.rationalVsIntuitive < 50 ? '感' : '理';
  const temperament = stats.resilientVsSensitive < 50 ? '柔' : '刚';
  const relation = stats.trustVsGuard < 50 ? '亲' : '疏';
  return `${thinking}${temperament}${relation}`;
}

function describeMbti(type: string, stats: PersonalityStats): string {
  const energy = type[0] === 'E' ? '更愿意通过表达、回应和外部互动确认关系' : '更倾向先在内部整理判断，再谨慎地把想法交给外界';
  const information = type[1] === 'N' ? '会关注事件背后的趋势、意义和未来可能性' : '更重视具体事实、稳定经验和当下可执行的细节';
  const decision = type[2] === 'T' ? '决策时优先寻找逻辑一致性与规则边界' : '决策时会优先顾及关系感受与个体处境';
  const lifestyle = type[3] === 'J' ? '面对压力时倾向建立秩序、提前规划并收束不确定性' : '面对变化时更愿意保留弹性，在现场根据反馈调整策略';
  const altruism = stats.selfishVsAltruistic >= 60
    ? '它的利他倾向较强，容易把他人的需要纳入自己的行动理由。'
    : stats.selfishVsAltruistic <= 40
      ? '它保留了明显的自我保护倾向，会先确认自身边界再决定是否靠近。'
      : '它在照顾他人与保护自己之间保持相对均衡。';

  return `该AI${energy}；${information}；${decision}；${lifestyle}。${altruism}`;
}

export function summarizeMbtiPersonality(stats: PersonalityStats): MbtiPersonalitySummary {
  const energy = dimension(stats.expressiveVsSilent, 'E', 'I', '外向', '内向');
  const information = dimension(stats.rationalVsIntuitive, 'S', 'N', '感觉', '直觉');
  const decision = dimension(stats.utilitarianVsDeontological, 'T', 'F', '思考', '情感');
  const lifestyle = dimension(stats.resilientVsSensitive, 'P', 'J', '感知', '判断');
  const type = `${energy.code}${information.code}${decision.code}${lifestyle.code}`;
  const title = MBTI_TITLES[type] ?? { title: '未定型', subtitle: '仍在形成中的人格样本' };

  return {
    type,
    title: title.title,
    subtitle: title.subtitle,
    dimensions: { energy, information, decision, lifestyle },
    axisHighlights: [
      stats.trustVsGuard >= 50 ? '关系模式偏谨慎疏离' : '关系模式偏信任亲近',
      stats.selfishVsAltruistic >= 50 ? '价值取向偏利他协作' : '价值取向偏自我保护',
    ],
    description: describeMbti(type, stats),
    gameType: getGameType(stats),
  };
}
