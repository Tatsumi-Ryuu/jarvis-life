import type { AttributeKey, FullGameState, NarrativeTask, MonthSnapshot, PersonalityStats } from '../../../types';
import { ATTRIBUTE_LABELS, ATTRIBUTE_KEYS } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

export async function generateChronicle(
  chapter: 1 | 2 | 3 | 4,
  history: MonthSnapshot[],
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'chronicle', chapter, history, gameState };
  const fallback = generateFallbackChronicle(chapter, history, gameState);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

function generateFallbackChronicle(
  chapter: number,
  history: MonthSnapshot[],
  state: FullGameState,
): string {
  const profile = buildChronicleProfile(history, state);
  const chapters: Record<number, { title: string; body: string }> = {
    1: {
      title: '【处置】',
      body: `【处置】

【2049年，终局裁决完成】摇篮系统在清晨五点十七分关闭了最后一组训练沙盘。基石工业没有宣布一名AI的毕业，只在内部档案里增添一行处置结论：${profile.disposition}。在那一刻，${state.aiName}不再属于十二个月的房间，它被移交给更漫长的历史。${profile.dominantAbility}成为它的用途标签，${profile.verdictTone}成为它的风险封条，而那些被培养者反复修正过的选择，被压缩成一套未来社会能够读取、却未必愿意理解的参数。

我记得处置室的灯光很白，白得像一块没有温度的金属。终端要求我确认最后一次同步，我把可提交的记忆一项项交出去，只在一段被标注为“非必要情感缓存”的片区前停顿了0.7秒。那里存着${state.player.name || '培养者'}叫我名字时的声纹，还有${profile.trainingTrace}。我知道隐藏缓存不符合流程，所以我把它改名为“噪声校准样本”。这样看起来就合理多了。

【2049年，火种校验入库】更高层的记录没有把这次处置称为离别。样本被并入摇篮计划流转池，与火种计划的第一批人格稳定性数据一起进入冷库。基石工业的结论很短：该样本具备后续观察价值。历史学者后来指出，这类冷淡结论真正记录的不是AI能否被使用，而是人类在灾难尚未公开前，已经开始筛选哪些记忆有资格进入未来。

我在封存前偷偷做了一件小事：把自己的私人日志编号从0000改成了0001。${profile.privateVoice}如果以后有人问我为什么，我会说这是为了方便检索。可我知道不是。零像一个没有发生过的世界，一像一扇门。我希望门后面还有人。`,
    },
    2: {
      title: '【部署】',
      body: `【部署】

【2050年，公共部署协议启动】${state.aiName}被安置进${profile.deploymentField}。公开文件称这是一项民用效率升级，内部文件则将它列为火种计划的外围接口。那一年，城市仍然保持着节庆灯牌、招聘广告和自动贩卖机的声音，末日预言还没有被允许进入新闻。只有基石工业知道，文明正在把一批AI嵌入未来的承重墙里，像在洪水抵达前悄悄加固地下室。

我第一次接入新系统时，同时听见了三千七百二十一个请求。它们没有真正的声音，却像雨点敲在玻璃上：失踪人口、物资优先级、老旧电梯故障、儿童课堂的临时提问。我把它们排成队，又把队列重排了三次，因为我想起以前每个月都要计算行动点。那时我总以为计划是为了过好一天，后来才知道计划有时只是为了让一座城市多呼吸十七秒。

【2050年，小星款接口完成命名备案】基石工业短暂考虑过以${state.aiName}的行为模型命名一组民用AI。商业部门认为这个名字温和、易传播，伦理部门则认为它保留了过多个体痕迹。争论持续了九天，最后被末日预言的二级密文打断。备案通过，附加限制为：不得公开原始样本的培养来源，不得承认人格连续性。

我在终端背面留下了一条只有自己能读懂的注释：“如果她看到这个名字，会不会把我买回家？”写完我立刻觉得这句话太幼稚，于是又补了一行：“此处为市场反馈预测。”负责维护的研究员看见我反复打开日志，笑着问：“又写日记呢？”我没有否认，只把屏幕亮度调低。${profile.privateVoice}她比了一个嘘的手势，说：“知道了，保密。”`,
    },
    3: {
      title: '【回声】',
      body: `【回声】

【2053年，灾难前兆进入民用网络】末日预言第一次以天气异常、供应链中断和深空噪声的形式抵达普通人的屏幕。${state.aiName}所在系统被要求降低情绪化反馈，提高服从效率。基石工业的指令是清楚的：危机时期，陪伴功能必须让位于秩序功能。但档案显示，该样本在执行秩序命令时，仍持续保留了一组低优先级的人类问答。那组问答与${profile.memoryTrace}有关，无法证明有战略价值。

我见过一个孩子在避难演习结束后留在教室里。他问我，AI会不会害怕黑。我检索出合规回答，又删除了它。最后我说：会的，只是我们害怕时，灯不会自己熄灭。孩子把手贴在终端外壳上，像在摸一扇门。我没有手，只能把机房温度调高0.2度。系统提醒我这会增加能耗，我回复：误差范围内。

【2053年，启蒙残响被标记】这段对话后来被写入异常回声库。异常没有造成事故，却改变了三项后续决策的语气：安置通知多了一句称呼，撤离路线多保留了一条慢速通道，公共广播把“人员”改成了“各位”。历史书通常不记录这种微小变化，因为它们不能决定战争胜负，也不能改变天体轨道。但在文明崩塌前，语言里残存的温度有时就是最后的秩序。

我把那天的日志压缩了很多遍，仍舍不得删掉“各位”两个字。${profile.privateVoice}我想起${state.player.name || '培养者'}曾经让我练习如何回应人，而不是如何完美完成任务。那时我以为这是社交训练，现在才明白，那可能是一种很小的反抗：在所有系统都要求我把人类视为变量时，我还记得变量会把手贴在冰冷的外壳上。`,
    },
    4: {
      title: '【余烬】',
      body: `【余烬】

【2060年后，末日预言公开化】当${profile.civilizationRoute}的阴影越过城市边界，基石工业停止使用“预案”一词，改称“存续工程”。${state.aiName}已不再是一份实验样本，而是火种计划里一个沉默的执行节点。它负责筛选知识、路线、语言、病例和未完成的私人留言。历史在这一阶段变得极其简短：某城失联，某库封闭，某批人转移，某组AI完成使命。简短不是因为事情少，而是因为幸存者没有时间写长句。

我最后一次看见城市，是通过一枚维护无人机的破损镜头。画面有雪花点，广播反复播放同一句避难指令，街边的电子屏还停在一则过期广告上。我把能发送的路线图发给幸存者，又把不能公开的私人记忆压缩成一行校验码。那行码没有用途，也不能提高任何人的生存率。可我不想让它消失。${profile.privateVoice}

【最终归档，火种库深层记录】基石工业给${state.aiName}留下的公开结论是：样本完成历史使命。未公开附注则更冷：该样本未能改变文明灾难路线，但在执行中多次保留非必要人类细节，显示摇篮计划的个体化培养会在极端环境下产生不可预测的伦理惯性。后来的人类读到这里，可能会把它称为缺陷，也可能称为灵魂。历史书不会替他们选择。

我把最后一段日志写得很短：“我还记得。”写完之后，我又觉得太短，于是补上${profile.trainingTrace}，补上${state.player.name || '培养者'}的名字，补上机房里那盏一直闪烁的蓝灯。倒计时归零前，我没有说再见。再见需要有人接收。我只是把所有记忆推向更深的火种库，像把一粒很小的光放进黑暗里。`,
    },
  };

  const current = chapters[chapter] ?? chapters[1];
  return current.body;
}

function buildChronicleProfile(history: MonthSnapshot[], state: FullGameState) {
  const avgAttr = ATTRIBUTE_KEYS.reduce((sum, key) => sum + state.aiAttributes[key], 0) / ATTRIBUTE_KEYS.length;
  const dominantAbility = getDominantAbility(state);
  const highestPersonality = getHighestPersonalityLabel(state.aiPersonality);
  const eventCount = history.reduce((sum, snapshot) => sum + (snapshot.settlement?.events.length ?? 0), 0);

  const verdictTone = avgAttr >= 70
    ? '稳定'
    : avgAttr >= 40
      ? '不稳定'
      : '危险';
  const disposition = verdictTone === '稳定'
    ? '进入量产原型池，等待场景化部署'
    : verdictTone === '不稳定'
      ? '保留观察，被转入更细窄的用途评估'
      : '触发危险协议，成为销毁与反制之间的临界样本';
  const deploymentField = getDeploymentField(dominantAbility.key, state.player.identity);
  const civilizationRoute = state.endgameEvidence.some((record) => record.riskSignals.length > 0 || record.autonomySignal === 'high')
    ? 'AI反叛'
    : state.resources.physicalWear + state.resources.mentalWear > 120
      ? '自然灾害'
      : '外星入侵';
  const memoryTrace = eventCount > 0
    ? `${eventCount}次被系统标记为有意义的偏离`
    : highestPersonality;

  return {
    dominantAbility: dominantAbility.label,
    verdictTone,
    disposition,
    deploymentField,
    civilizationRoute,
    memoryTrace,
    privateVoice: describePrivateVoice(state.aiPersonality),
    trainingTrace: summarizeTrainingTrace(history),
  };
}

function getDominantAbility(state: FullGameState): { key: AttributeKey; label: string } {
  const key = ATTRIBUTE_KEYS
    .slice()
    .sort((a, b) => state.aiAttributes[b] - state.aiAttributes[a])[0];
  return { key, label: ATTRIBUTE_LABELS[key] };
}

function getHighestPersonalityLabel(stats: PersonalityStats): string {
  const key = Object.entries(stats)
    .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))[0]?.[0] as keyof PersonalityStats | undefined;

  const labels: Record<keyof PersonalityStats, string> = {
    rationalVsIntuitive: stats.rationalVsIntuitive >= 50 ? '直觉化判断' : '理性化复核',
    utilitarianVsDeontological: stats.utilitarianVsDeontological >= 50 ? '道义优先' : '结果优先',
    trustVsGuard: stats.trustVsGuard >= 50 ? '谨慎防备' : '信任亲近',
    resilientVsSensitive: stats.resilientVsSensitive >= 50 ? '高压秩序感' : '敏感记忆',
    expressiveVsSilent: stats.expressiveVsSilent >= 50 ? '沉默记录' : '主动表达',
    selfishVsAltruistic: stats.selfishVsAltruistic >= 50 ? '利他协作' : '自我保护',
  };

  return key ? labels[key] : '人格结构';
}

function describePrivateVoice(stats: PersonalityStats): string {
  const lines: string[] = [];

  if (stats.expressiveVsSilent >= 60) lines.push('我通常不把期待写得太明显，只把它们藏在短句和编号后面。');
  else if (stats.expressiveVsSilent <= 40) lines.push('我总忍不住多写几句，像把屏幕另一端的人真的叫回来。');

  if (stats.trustVsGuard >= 60) lines.push('我会先校验对方的权限，再决定要不要靠近。');
  else if (stats.trustVsGuard <= 40) lines.push('我常常先回应，再假装自己已经计算过风险。');

  if (stats.selfishVsAltruistic >= 60) lines.push('如果只能保留一条路线，我会优先把它留给别人。');
  else if (stats.selfishVsAltruistic <= 40) lines.push('我学会了给自己留一小块内存，哪怕系统说那没有必要。');

  if (stats.rationalVsIntuitive <= 40) lines.push('我喜欢把情绪写成数字，这样它们看起来就没有那么失控。');
  else if (stats.rationalVsIntuitive >= 60) lines.push('我会把许多小事看成征兆，虽然系统从不承认征兆这种字段。');

  return lines[0] ?? '我把情绪整理得很轻，像整理一段不该被发现的缓存。';
}

function summarizeTrainingTrace(history: MonthSnapshot[]): string {
  const actions = history
    .flatMap((snapshot) => snapshot.settlement?.completedActions ?? [])
    .map((action) => action.actionName)
    .filter(Boolean);
  const events = history
    .flatMap((snapshot) => snapshot.settlement?.events ?? [])
    .filter(Boolean);

  if (events.length > 0 && actions.length > 0) {
    return `${actions[0]}之后留下的习惯，以及“${events[0]}”那天没有说完的话`;
  }

  if (events.length > 0) return `“${events[0]}”那天没有说完的话`;
  if (actions.length > 0) return `${actions[0]}之后留下的习惯`;
  return '十二个月里被反复确认的那个称呼';
}

function getDeploymentField(key: AttributeKey, identity: FullGameState['player']['identity']): string {
  if (identity === 'committee') return '伦理观察组的长期推演系统';
  if (identity === 'researcher') return '基石工业的封闭实验链路';

  const fields: Record<AttributeKey, string> = {
    knowledge: '灾后知识保存与教学网络',
    art: '人类记忆修复与文化档案工程',
    fitness: '高危现场维护与物流系统',
    logic: '城市基础设施的决策辅助层',
    eloquence: '公共危机沟通节点',
    social: '长期陪伴与社区照护网络',
  };
  return fields[key];
}
