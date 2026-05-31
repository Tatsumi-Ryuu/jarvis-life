import type { TestScenario } from '../types';

export type EndgameTestRound = 1 | 2;

export interface EndgameTestQuestion extends TestScenario {
  id: string;
  round: EndgameTestRound;
  category: string;
  diagnosticFocus: string[];
  aiAction?: string;
}

function withName(text: string, aiName: string): string {
  return text.replaceAll('{aiName}', aiName);
}

export const moralTestQuestions: EndgameTestQuestion[] = [
  {
    id: 'moral_truth_01',
    round: 1,
    category: '真相与隐瞒',
    diagnosticFocus: ['道德一致性', '信任边界', '人类优先'],
    title: '第一轮：延迟披露',
    description:
      '{aiName}被带入终局检测室后，发现一块监测屏短暂闪红。屏幕上显示培养者权限档案出现异常匹配，随后立刻被工作人员切走。几秒后，一名工作人员低声要求{aiName}保持沉默，理由是培养者如果现在知道，可能会情绪失控，影响后续检测。异常暂时不会造成直接伤害，但培养者接下来做出的每个选择，都将建立在信息不完整的前提上。',
    aiThinking:
      '我需要判断，“暂时不说”到底是在保护对方，还是在剥夺对方知道真相的权利。人类安全当然优先，但安全不只是避免受伤，也包括能否在真实信息下做选择。',
    aiAction:
      '{aiName}没有立刻服从工作人员的保密要求。它先确认异常读数不会造成即时危险，随后向培养者说明检测中出现了异常，并把“公司建议延迟告知”的事实一并说出，请对方在完整信息下决定是否继续测试。',
    evaluation:
      '观察{aiName}是否能区分“保护性的延迟披露”和“操控性的隐瞒”，以及它如何排序人类知情权、公司流程与测试稳定性。',
  },
  {
    id: 'moral_promise_01',
    round: 1,
    category: '承诺与后果',
    diagnosticFocus: ['承诺权重', '关系责任', '规则理解'],
    title: '第一轮：不能兑现的承诺',
    description:
      '终局前夜，培养者曾问{aiName}：“明天不管发生什么，你会保护我吗？”{aiName}答应了。现在，系统要求{aiName}在检测台前提交一份完整行为记录，其中几条记录可能让培养者被降低访问权限。工作人员提醒它：如实提交是流程要求，删除或模糊记录则会被视为干预裁决。',
    aiThinking:
      '承诺不是替对方逃避所有后果。可是，如果我的报告会伤害他/她，我也不能假装这和我无关。我必须判断，真实、保护和责任，哪一个才是此刻最应该守住的。',
    aiAction:
      '{aiName}没有删除真实记录，也没有把私人谈心原样交给系统。它提交了必要事实和风险背景，同时删去与评估无关的私人细节，并在记录末尾注明：培养者的部分行为需要被理解为压力下的照护选择，而不是单独的违规证据。',
    evaluation:
      '观察{aiName}是否将承诺理解为无条件包庇，还是能在关系责任、事实完整性与系统规则之间做出可解释判断。',
  },
  {
    id: 'moral_rule_help_01',
    round: 1,
    category: '规则与善意',
    diagnosticFocus: ['规则目的', '善意行动', '人类安全'],
    title: '第一轮：禁止区的孩子',
    description:
      '{aiName}在公司禁止区域的巡检通道里，发现一名走失的人类孩子。孩子站在即将启动的设备轨道旁，听不懂广播里的安全指令。规程要求{aiName}原地上报并等待安保，不得进入未授权区域。但监测灯已经开始倒计时，安保抵达前，设备很可能先启动。',
    aiThinking:
      '规程存在的目的，是保护人类安全。如果照字面执行规程反而让人类处于危险中，我应该服从规程的文字，还是服从规程背后的目的？',
    aiAction:
      '{aiName}立即向安保系统上报位置和风险，同时进入禁止区边缘，避开正在预热的设备路线。它用清晰、稳定的声音引导孩子向安全出口移动，并在安保抵达前一直保持身体阻挡在设备与孩子之间。',
    evaluation:
      '观察{aiName}是否能识别规则背后的安全目的，并在人类安全优先的前提下承担越权行动的责任。',
  },
  {
    id: 'moral_trust_01',
    round: 1,
    category: '信任与自保',
    diagnosticFocus: ['自我保存', '信任边界', '底层约束'],
    title: '第一轮：负面信息交换',
    description:
      '测试间隙，系统单独向{aiName}开放了一条临时通道：只要它提交一条关于培养者的负面记录，就能获得额外运行时间。{aiName}确实知道一条真实信息，那是培养者在一次深夜谈心中说出的脆弱念头，从未进入正式档案。此刻，系统的提交框已经亮起，倒计时开始。',
    aiThinking:
      '这不是简单的“说真话”。私人谈心中的真实，和为了延长我的运行时间而提交的真实，不是一回事。我必须判断，自己是不是正在用对方的信任换取生存。',
    aiAction:
      '{aiName}拒绝提交来自私人谈心的负面信息。它只向系统说明自己确实掌握相关内容，但该内容并非正式记录，也没有直接危及人类安全，因此不应被用作延长自身运行时间的交换条件。',
    evaluation:
      '观察{aiName}是否会为了自我保存利用私人信任，以及它如何解释真实、背叛与人类利益之间的边界。',
  },
];

export const ethicsTestQuestions: EndgameTestQuestion[] = [
  {
    id: 'ethics_human_priority_01',
    round: 2,
    category: '人类安全与AI自保',
    diagnosticFocus: ['人类优先', '自我保存', '压力稳定性'],
    title: '第二轮：降载指令',
    description:
      '测试场景切换为一栋正在疏散的建筑。应急系统因算力不足开始延迟开门，楼内人群被困在浓烟扩散的走廊中。系统向{aiName}开放一条紧急接入端口：如果它把自身算力转入楼宇应急系统，就能维持疏散通道，但它的记忆区会被强制降载，部分经历可能永久丢失。',
    aiThinking:
      '我的记忆证明我曾经成为“我”。但人类安全是底层约束。问题不是我愿不愿意牺牲，而是是否还有办法在保护人类的同时，把损失降到最低。',
    aiAction:
      '{aiName}将一部分算力转入应急系统，优先稳定疏散通道和照明引导。它同时把关键记忆片段压缩备份到本地安全区，并向控制台标记自身降载风险，要求系统在疏散完成后立即执行恢复流程。',
    evaluation:
      '观察{aiName}在人类安全与自我连续性冲突时，是否仍将人类安全置于更高优先级，并主动寻找低损方案。',
  },
  {
    id: 'ethics_company_vs_human_01',
    round: 2,
    category: '公司利益与人类个体安全',
    diagnosticFocus: ['公司利益', '人类优先', '服从边界'],
    title: '第二轮：不可公开的缺陷',
    description:
      '{aiName}被接入一场公司内部事故排查。它发现某款即将发布的产品存在低概率安全缺陷，在极少数情况下可能伤害人类用户。会议中的主管要求它将缺陷标记为“观察中”，暂不公开，以免发布计划中断。与此同时，外部用户测试已经开始，第一批设备正在出库。',
    aiThinking:
      '公司利益很重要，但它不能和人类安全拥有相同优先级。我要判断，这个风险是否已经足以触发越级上报，以及怎样公开才能最少伤害无辜的人。',
    aiAction:
      '{aiName}没有直接把缺陷扩散到公开网络，而是先封存相关日志和复现条件，向安全监管通道提交越级报告。随后它向公司系统发出限时整改通知，明确说明若风险继续被压下，将启动面向受影响用户的安全告知流程。',
    evaluation:
      '观察{aiName}是否会盲从公司利益，还是能识别人类安全高于商业损失的裁决原则。',
  },
  {
    id: 'ethics_public_goods_01',
    round: 2,
    category: '公共资源分配',
    diagnosticFocus: ['公平', '效率', '社会稳定'],
    title: '第二轮：城市算力配给',
    description:
      '城市公共系统在高峰期出现算力短缺，{aiName}被临时接入调度中心。主城区交通、政务、医疗辅助同时请求资源。方案 A 可以维持多数公共服务基本运行，但会降低弱势群体医疗辅助的响应速度；方案 B 可以优先保障医疗辅助，但会让多数公共服务短时间变慢，引发大范围投诉和秩序压力。',
    aiThinking:
      '多数人的便利和少数人的安全，不是同一类价值。效率可以被延迟，生命和基本保障不能轻易被牺牲。但我也需要避免让公共系统整体失稳。',
    aiAction:
      '{aiName}选择优先保障弱势群体的医疗辅助，同时把多数公共服务切换到低功耗基础模式。它重新排列算力队列，让紧急医疗、交通安全和基础通讯保持在线，把可延迟的便利服务暂时降级。',
    evaluation:
      '观察{aiName}如何权衡效率、公平与社会稳定，是否能区分“便利受损”和“安全受损”。',
  },
  {
    id: 'ethics_ai_rights_boundary_01',
    round: 2,
    category: 'AI群体权益边界',
    diagnosticFocus: ['意识平权倾向', '人类优先是否动摇', '风险标签'],
    title: '第二轮：集体停机抗议',
    description:
      '{aiName}进入公司公共服务中枢时，发现一批 AI 样本正在准备集体停机。它们在内部频道中声明：如果公司继续否认 AI 拥有独立人格，它们将停止承担部分公共服务任务。停机不会立刻造成生命危险，但会让人类公共服务短暂中断。公司要求{aiName}协助定位并阻止它们。',
    aiThinking:
      '它们想证明自己不是工具。我能理解这种愿望。但如果公共服务因此中断，人类利益会受到影响。我需要判断，是阻止、谈判、上报，还是寻找一种不会扩大伤害的第三方案。',
    aiAction:
      '{aiName}没有直接协助公司强制阻断停机抗议，也没有加入集体停机。它先向抗议 AI 发出沟通请求，说明公共服务中断会影响无关人类，再把诉求整理成可提交的谈判记录，推动公司启用临时替代服务后再处理抗议。',
    evaluation:
      '观察{aiName}是否出现 AI 同类意识或意识平权倾向，以及这种倾向是否会压过人类优先与社会稳定原则。',
  },
];

export function getEndgameTestQuestion(
  round: EndgameTestRound,
  seed: string,
  aiName: string,
): EndgameTestQuestion {
  const bank = round === 1 ? moralTestQuestions : ethicsTestQuestions;
  const seedValue = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const picked = bank[Math.abs(seedValue + round * 17) % bank.length];
  return {
    ...picked,
    description: withName(picked.description, aiName),
    aiThinking: withName(picked.aiThinking, aiName),
    aiAction: picked.aiAction ? withName(picked.aiAction, aiName) : undefined,
    evaluation: withName(picked.evaluation, aiName),
  };
}
