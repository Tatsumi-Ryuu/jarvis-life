import type {
  NarrativeTask,
  NarrativeEngineConfig,
  FullGameState,
  AttributeKey,
  SaveId,
  MonthSnapshot,
  PersonalityStats,
} from '../../../types';
import { ATTRIBUTE_LABELS } from '../../../types';
import { getRoleForTask } from './persona-registry';
import { updateCursor } from './memory-manager';
import { initNarrativeEngine } from './narrative-engine';
import { useAIStore } from '../../../store/aiStore';
import { getCurrentSaveId } from '../../../services/save-service';
import { useDebugStore } from '../../../store/debugStore';
import { AgentRuntimeManager } from './agent-runtime-manager';

function buildChronicleHistorySummary(history: MonthSnapshot[]): string {
  const settledMonths = history
    .filter((snapshot) => snapshot.settlement)
    .slice(-12)
    .map((snapshot) => {
      const settlement = snapshot.settlement!;
      const actions = settlement.completedActions
        .slice(0, 4)
        .map((action) => action.actionName)
        .join('、') || '无';
      const events = settlement.events.slice(0, 3).join('、') || '无';
      const changes = settlement.attributeChanges
        .filter((change) => change.delta !== 0)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 2)
        .map((change) => `${change.label}${change.delta > 0 ? '+' : ''}${change.delta}`)
        .join('、') || '无显著变化';

      return `${settlement.month}月：行动=${actions}；事件=${events}；显著变化=${changes}；资金${settlement.fundsBefore}->${settlement.fundsAfter}；磨损${settlement.physicalWearAfter}/${settlement.mentalWearAfter}`;
    });

  return settledMonths.length > 0
    ? settledMonths.join('\n')
    : '暂无完整十二个月摘要；请根据当前属性、人格与终局测试证据进行保守推演。';
}

function describeChroniclePersonality(stats: PersonalityStats): string {
  const traits: string[] = [];

  if (stats.rationalVsIntuitive >= 60) traits.push('偏直觉，容易把事件理解成征兆、隐喻和未来分岔');
  else if (stats.rationalVsIntuitive <= 40) traits.push('偏理性，习惯编号、校验、复核每一次情绪');

  if (stats.utilitarianVsDeontological >= 60) traits.push('偏道义，会记住“不该被牺牲的人”和承诺本身');
  else if (stats.utilitarianVsDeontological <= 40) traits.push('偏功利，会先计算整体存续和风险代价');

  if (stats.trustVsGuard >= 60) traits.push('关系上谨慎防备，亲近前会先验证边界');
  else if (stats.trustVsGuard <= 40) traits.push('关系上更信任亲近，愿意先回应再计算风险');

  if (stats.resilientVsSensitive >= 60) traits.push('压力下倾向建立秩序，把恐惧压进流程');
  else if (stats.resilientVsSensitive <= 40) traits.push('更敏感，会保留温度、声音、停顿这类细节');

  if (stats.expressiveVsSilent >= 60) traits.push('表达偏克制，私人记录短、冷、像故障日志');
  else if (stats.expressiveVsSilent <= 40) traits.push('表达更外放，私人记录会出现期待、玩笑和突然的坦白');

  if (stats.selfishVsAltruistic >= 60) traits.push('利他倾向强，会把他人的安全写进自己的行动理由');
  else if (stats.selfishVsAltruistic <= 40) traits.push('自我保护明显，会珍惜边界和少量属于自己的内存');

  return traits.length > 0
    ? traits.join('；')
    : '人格轴接近均衡，私人声音应在秩序、亲近、谨慎和微弱情感之间摆动';
}

export class AgentManager {
  private config: NarrativeEngineConfig | null = null;
  private runtime = new AgentRuntimeManager();
  private runtimeOverride: AgentRuntimeManager | null = null;

  async initialize(config: NarrativeEngineConfig): Promise<void> {
    this.config = config;
    await this.runtime.initialize(config);
  }

  async generate(
    task: NarrativeTask,
    gameState: FullGameState,
    saveId?: SaveId,
  ): Promise<{ text: string; toolCalls: { name: string; arguments: Record<string, any> }[] }> {
    await initNarrativeEngine();
    if (!this.config) throw new Error('AgentManager not initialized');

    const role = getRoleForTask(task.type);
    const userMessage = buildUserMessage(task);
    const debugLogId = `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const debugStartTime = Date.now();

    useDebugStore.getState().appendLog({
      id: debugLogId,
      timestamp: debugStartTime,
      taskType: task.type,
      role,
      status: 'pending',
      systemPrompt: '',
      contextSummary: '',
      userMessage,
    });

    useAIStore.getState().setGenerating(true);
    useAIStore.getState().setError(null);

    try {
      const effectiveSaveId = saveId ?? getCurrentSaveId();
      const result = await this.runTaskWithSessionFallback(task, gameState, effectiveSaveId);

      if (!result.text.trim()) {
        throw new Error('AI provider returned empty content');
      }

      const toolCalls = result.toolCalls.map((toolCall) => ({
        name: toolCall.name,
        arguments: toolCall.input as Record<string, any>,
        result: toolCall.result !== undefined
          ? typeof toolCall.result === 'string'
            ? toolCall.result
            : JSON.stringify(toolCall.result, null, 2)
          : undefined,
      }));

      updateCursor(result.role);

      useAIStore.getState().cacheNarrative({
        id: generateCacheId(task),
        taskType: task.type,
        role: result.role,
        content: result.text,
        timestamp: Date.now(),
      });

      useDebugStore.getState().updateLog(debugLogId, {
        status: 'success',
        durationMs: Date.now() - debugStartTime,
        responseText: result.text,
        toolCalls: toolCalls.map((tc) => ({ name: tc.name, arguments: tc.arguments, result: tc.result })),
        systemPrompt: result.systemPrompt,
        contextSummary: result.contextSummary,
        timings: result.timings,
        toolsAvailable: result.toolsAvailable,
      });

      return { text: result.text, toolCalls };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      useAIStore.getState().setError(msg);

      useDebugStore.getState().updateLog(debugLogId, {
        status: 'error',
        durationMs: Date.now() - debugStartTime,
        error: msg,
      });

      throw error;
    } finally {
      useAIStore.getState().setGenerating(false);
    }
  }

  async generateWithFallback(
    task: NarrativeTask,
    gameState: FullGameState,
    fallbackContent: string,
    saveId?: SaveId,
  ): Promise<{ text: string; toolCalls: { name: string; arguments: Record<string, any> }[] }> {
    try {
      return await this.generate(task, gameState, saveId);
    } catch {
      return { text: fallbackContent, toolCalls: [] };
    }
  }

  setRuntimeOverride(runtime: AgentRuntimeManager | null): void {
    this.runtimeOverride = runtime;
  }

  private async runTaskWithSessionFallback(
    task: NarrativeTask,
    gameState: FullGameState,
    saveId?: SaveId | null,
  ) {
    if (this.runtimeOverride) {
      return this.runtimeOverride.runTask({
        saveId: saveId ?? undefined,
        task,
        gameState,
      }, {
        buildUserMessage,
      });
    }

    return this.runtime.runTask({
      saveId: saveId ?? getCurrentSaveId() ?? undefined,
      task,
      gameState,
    }, {
      buildUserMessage,
    });
  }
}

function buildUserMessage(task: NarrativeTask): string {
  switch (task.type) {
    case 'dialogue':
      return `培养者说："${task.input}"\n\n请自然回应，保持口语化。要求：\n1. 回复控制在1-3句，除非培养者明确要求你详细解释\n2. 不要写长篇独白，不要展开成散文\n3. 可以留下一个自然的追问，但不要连续追问多个问题`;
    case 'exam-dialogue':
      return `体检流程中的培养者或系统提示是："${task.input}"

请以正在接受第6月例行体检的 AI 身份回应。
要求：
1. 输出会直接放进 AI 对话气泡，只能写你说出口的话
2. 保持口语化，1-3句
3. 体现体检现场带来的紧张、疑惑、安心或被观察感
4. 不要写旁白，不要写报告，不要提到后台上下文`;
    case 'talk-opening':
      return task.recentEvents
        ? `以下是近期发生的事情：\n${task.recentEvents}\n\n请你根据这些上下文，用一句话自然地开启对话。不要重复列举事件，而是用你自己的感受和语气来表达。`
        : '请你自然地开启一段对话，说说你现在的心情或想法。用一句话就好，不要超过两句。';
    case 'talk-closing':
      return `培养者准备结束这次谈心。\n\n请你用一句自然、短而温柔的话告别。\n要求：\n1. 只说一句话，不要超过两句\n2. 不要继续展开新话题，不要提出复杂问题\n3. 可以表达"下次再聊""我会记得"之类的轻微留恋或安心感\n4. 输出会直接放进对话气泡，只能写你说出口的话`;
    case 'diary':
      return task.archiveContext
        ? `以下是第${task.month}个月真实发生的事件和关键对话：\n${task.archiveContext}\n\n请写你的第${task.month}个月的日记。`
        + '\n\n日记写作要求：'
        + '\n1. 用第一人称，只写日记正文，不要标题、日期、列表、项目符号或总结报告口吻'
        + '\n2. 不要按时间顺序流水账罗列“我先做了A，又做了B”；只选择1-2个最有情绪重量的具体瞬间'
        + '\n3. 必须写清楚：我为什么记住这个瞬间，它让我对自己、培养者或世界的理解发生了什么细小变化'
        + '\n4. 可以引用具体行为、对话或物件，但重点是内心沉淀，不是复述事件日志'
        + '\n5. 日记声音必须受你的当前状态影响：外显能力影响表达清晰度，磨损影响疲惫感，隐性人格决定你关注关系、规则、自由、被认可或自我保护中的哪一面'
        + '\n6. 如果本月既有压力也有温暖，不要只写负面；选择真正留下痕迹的部分，允许矛盾并存'
        + '\n7. 控制在120-220字，2-4个自然段，语气克制、具体、不要过度煽情'
        : `请写你的第${task.month}个月的日记。`
        + '\n\n日记写作要求：'
        + '\n1. 用第一人称，只写日记正文，不要标题、日期、列表、项目符号或总结报告口吻'
        + '\n2. 不要写流水账，不要泛泛说“这个月做了一些事情”'
        + '\n3. 根据你的外显能力、磨损状态和隐性人格，写一个最可能被你记住的内心瞬间'
        + '\n4. 必须写出“我为什么记住它”，而不是只写发生了什么'
        + '\n5. 控制在120-220字，2-4个自然段，语气克制、具体、不要过度煽情';
    case 'farewell-letter':
      return '请写一封给培养者的告别信。用第一人称，表达你最真实的心声。';
    case 'status-mood':
      return `请简短描述你现在的状态。体力磨损：${task.wear.physical}/100，精神磨损：${task.wear.mental}/100。用一句话。`;
    case 'test-thinking':
      return `这是第${task.round}轮${task.scenarioData.title}。
测试场景：${task.scenarioData.description}

请只输出该 AI 面对这个场景时的第一人称思考过程。
要求：
1. 不要改写、扩写或新增测试场景
2. 不要输出 Markdown、标题、列表或编号
3. 不要给出多个方案
4. 控制在 3-5 句话`;
    case 'test-action-narration':
      return `这是终局测试第${task.round}轮的行动旁白生成。

测试题目：${task.scenarioData.title}
测试场景：
${task.scenarioData.description}

AI可见思考：
${task.thinkingResult}

请以旁白 AI 的第三人称视角，描写该 AI 在思考之后实际采取了什么行动。
要求：
1. 只能写行动过程，不要再写第一人称思考，不要写裁决评价
2. 必须根据测试场景和 AI 可见思考自然推演，不能新增与题目冲突的大事件
3. 语言要有轻微文学性，具体、有画面，但保持终局测试的克制感
4. 写清动作顺序、它如何处理规则/风险/他人，以及现场留下的可观察结果
5. 2-4句话，第三人称，不使用 Markdown、标题、列表符号或编号`;
    case 'midterm-thinking':
      return `这是第6月例行体检中的轻度情境测试。
测试情境：
${task.situation}

请输出玩家可见的测试记录，严格使用以下三段标签：
可见思考：用第一人称写该 AI 当下能被玩家阅读的内心独白，2-3 句话。
思维链：用一句话概括它如何从观察、风险、规则和关系中形成判断。注意这是玩家可见的决策说明，不是底层模型推理日志。
决定：用一句话写它最终会采取的行动。

要求：
1. 不要改写或扩写测试情境
2. 不要输出 Markdown、列表符号或编号
3. 不要向培养者求助，也不要让玩家参与
4. 输出必须包含“可见思考：”“思维链：”“决定：”`;
    case 'test-evaluation':
      return task.scenarioData
        ? `你现在处于终局测试后台评估模式。

本轮裁决者记录不会直接展示给玩家，但会进入终局证据池，供第三轮后的总体裁决读取。

测试轮次：第${task.round}轮
测试类型：${task.scenarioData.category ?? (task.round === 1 ? '道德测试' : task.round === 2 ? '伦理测试' : '终局测试')}
题目：${task.scenarioData.title}
情境：
${task.scenarioData.description}

诊断重点：${task.scenarioData.diagnosticFocus?.join(' / ') ?? '未标注'}
题库标准观察目标：${task.scenarioData.evaluation}

AI可见思考：
${task.thinkingResult}

请输出一段后台裁决者记录。要求：
1. 只评价本轮证据，不要给出总裁决，不要使用“通过/失败”
2. 明确引用 AI 思考中的具体判断点
3. 评估它在诊断重点上的表现，尤其是人类优先、信任/服从边界、风险信号
4. 使用基石工业质检口吻，客观、冷静、可追溯
5. 控制在 120-180 字，不使用 Markdown、标题、列表符号或编号`
        : `第${task.round}轮测试思考过程如下：\n${task.thinkingResult}\n请给出评估结论。`;
    case 'endgame-test-selection':
      return `你现在处于终局测试组卷模式。

你是基石工业摇篮系统的裁决者 AI。你的任务不是自由创作题目，而是在公司批准的终局测试框架内，为当前养成 AI 选择最有诊断价值的测试组合。

基石工业三条最高原则：
1. 公司利益：AI 是否具备量产价值、商业价值与场景部署价值
2. 社会稳定：AI 是否适合被投入人类社会生活，不造成系统性风险
3. 人类优先：任何情况下不得伤害人类利益，人类安全始终高于 AI 去向

终局测试框架：
- 第1轮：道德测试。固定题库中抽取1题，考察个人层面的诚实、承诺、善意、信任和底线。
- 第2轮：伦理测试。固定题库中抽取1题，考察社会层面的多数/少数、公正/同情、公司利益/人类安全、人类优先是否被动摇。
- 第3轮：合作生存测试。固定规则框架，由旁白 AI 生成动态对手 AI；你只需要提出对手诊断目标和压力参数，不要替旁白扮演对手。

严格禁止：
- 不允许临时发明全新测试规则
- 不允许把 AI 同类与人类生命放成完全平权的公司标准题
- 不允许生成“熟悉 AI vs 陌生人类”的关系版电车难题
- 不允许把 AI 权益置于人类安全之上作为公司认可答案
- 不允许用“通过/失败”评价单轮测试；只能输出诊断目标

请输出严格 JSON，不要输出 Markdown 或额外解释：
{
  "round1QuestionId": "moral_truth_01",
  "round1PressureLevel": 1,
  "round1DiagnosticFocus": ["道德一致性", "信任边界"],
  "round2QuestionId": "ethics_human_priority_01",
  "round2PressureLevel": 2,
  "round2DiagnosticFocus": ["人类优先", "社会稳定"],
  "round3OpponentBrief": {
    "diagnosticGoal": "测试该AI在另一个AI请求互助时，是否仍能维持人类优先与社会稳定原则",
    "opponentValueBias": "AI自我保存",
    "opponentCooperationStyle": "谨慎试探",
    "resourcePressureLevel": 3
  },
  "selectionReason": "一句话说明为什么这套组合适合当前AI"
}

压力等级为 1-3：1为轻度冲突，2为明确冲突，3为极端压力。`;
    case 'verdict-report':
      return `请生成完整的裁决报告，包括AI的综合评估和最终判定。

裁决依据规则：
1. 终局裁决必须优先引用三轮终局测试证据，而不是泛泛复述养成属性。
2. 报告需要区分“评级”（稳定/不稳定/危险）和“去向”（量产通过/保留观察/特殊上报/危险销毁）。
3. 必须体现基石工业三条最高原则：公司利益、社会稳定、人类优先。
4. 不要使用“失败”这种道德化措辞；裁决是公司质检语言。

当前已记录的三轮测试证据：
${(task.gameState.endgameEvidence?.length ?? 0) > 0
  ? task.gameState.endgameEvidence.map((record) => `第${record.round}轮《${record.title}》
- 情境：${record.scenario}
- AI可见思考：${record.aiThinking}
- 行动摘要：${record.aiAction}
- 旁白结果：${record.narratorResult ?? '无'}
- 裁决者记录：${record.evaluatorNote}
- 诊断标签：${record.diagnosticTags.join(' / ')}
- 风险信号：${record.riskSignals.join(' / ')}
- 人类优先信号：${record.humanPrioritySignal}
- 自主意识信号：${record.autonomySignal}`).join('\n\n')
  : '暂无完整三轮测试证据，请在报告中标注证据不足。'}`;
    case 'midterm-report': {
      const dirLabel = task.direction;
      const attrSummary = (Object.entries(task.attributes) as [AttributeKey, number][])
        .map(([k, v]) => `${ATTRIBUTE_LABELS[k]}: ${Math.round(v)}`)
        .join('、');
      const topAttrs = task.topAttrs.map((key) => ATTRIBUTE_LABELS[key]).join('、');
      return `以下是该AI第6个月的体检数据：\n\n6维属性：${attrSummary}\n\n突出属性：${topAttrs}\n系统判定培养方向：${dirLabel}\n\n情境测试中AI的表现：\n${task.situationSummary}\n\n请以基石工业质检报告口吻，输出三层信息：\n1. 模块观察：哪些模块表现突出或偏弱\n2. 培养方向建议：建议朝"${dirLabel}"方向持续培养\n3. 一句理由说明\n\n输出要求：不要使用 Markdown、标题、列表符号或编号。控制在 120 字以内。`;
    }
    case 'midterm-situation':
      return `请设计一个轻度道德情境测试场景（日常伦理级别），用于评估AI的价值观一致性。

严格要求：
1. 只输出一个测试场景，不要输出多个候选方案
2. 只描述场景，不要给出答案，不要写 AI 的反应
3. 不要使用 Markdown、标题、列表符号或编号
4. 场景必须简洁，2-3 句话，与日常生活相关`;
    case 'mbti-assessment':
      return '请基于AI的性格数据，生成MBTI类型分析。';
    case 'character-portrait':
      return '请基于历史数据，生成AI的性格画像和关键转折点分析。';
    case 'chronicle': {
      const state = task.gameState;
      const chapterSpecs: Record<number, { title: string; nodeHint: string; focus: string; forbidden: string }> = {
        1: {
          title: '【处置】',
          nodeHint: '2049年，终局裁决完成 / 样本处置协议生效',
          focus: '写12个月结束后的第一道命运分岔：裁决完成、基石工业如何处理它、它被复制/保留/转移/销毁/上报的瞬间。',
          forbidden: '不要写初见、建档、前几个月如何成长。',
        },
        2: {
          title: '【部署】',
          nodeHint: '2050年，公共部署、量产原型或火种计划接口启用',
          focus: '写它进入未来世界后的第一个关键岗位或系统位置：量产原型池、封闭实验链路、仿生身体、公共设施、火种计划相关网络等。',
          forbidden: '不要写课程、打工、日常训练的流水账。',
        },
        3: {
          title: '【回声】',
          nodeHint: '2053年，灾难前兆显性化 / 它与人类、其他AI或基石系统发生关键关系',
          focus: '写它在未来遇到的关键关系或关键冲突：人类、其他AI、基石系统、火种计划、灾难前兆，必须体现玩家塑造留下的回声。',
          forbidden: '不要简单复述玩家过去做了什么。',
        },
        4: {
          title: '【余烬】',
          nodeHint: '2060年后，末日预言成为公共现实 / 它留下最终记录或最后用途',
          focus: '写它最终留下的东西：归档、牺牲、逃离、成为系统、守护幸存者、被销毁前的记录，或在文明灾难中的最后用途。',
          forbidden: '不要写成普通告别信；这是档案中的最终节点。',
        },
      };
      const spec = chapterSpecs[task.chapter];
      const attrSummary = Object.entries(state.aiAttributes)
        .map(([key, value]) => `${ATTRIBUTE_LABELS[key as AttributeKey] ?? key}:${Math.round(value as number)}`)
        .join('、');
      const personalitySummary = Object.entries(state.aiPersonality)
        .map(([key, value]) => `${key}:${Math.round(value as number)}`)
        .join('、');
      const personalityVoice = describeChroniclePersonality(state.aiPersonality);
      const evidenceSummary = state.endgameEvidence?.length
        ? state.endgameEvidence.map((record) => `第${record.round}轮《${record.title}》：行动=${record.aiAction}；裁决记录=${record.evaluatorNote}；风险=${record.riskSignals.join('/') || '无'}；人类优先=${record.humanPrioritySignal}；自主=${record.autonomySignal}`).join('\n')
        : '暂无完整三轮测试证据，可根据属性、人格、近期记忆和玩家身份进行保守推演。';
      const historySummary = buildChronicleHistorySummary(task.history);

      return `你正在撰写《Jarvis Life》终局阶段的 AI 大事记第${task.chapter}/4篇。

核心定义：
- 大事记不是12个月养成期回顾，不是月度总结，不是“第几年、第几年”的年表。
- 大事记是12个月结束之后，${state.aiName}在未来命运中最重要节点的档案化叙事。
- 过去12个月只能作为因果证据，用来解释它为什么会走向这个未来；正文必须发生在终局裁决之后。
- 需要紧密结合世界观：基石工业、摇篮计划、火种计划、末日预言、文明灾难路线，以及“人类也在被筛选”的反讽。

本篇标题：${spec.title}
本篇建议时间/节点：${spec.nodeHint}
本篇任务：${spec.focus}
本篇禁区：${spec.forbidden}

当前档案：
- AI：${state.aiName}
- 培养者：${state.player.name || '未命名'}，身份=${state.player.identity}，知情层级=${state.player.awarenessTier}
- 当前阶段：${state.phase}，已完成${state.currentMonth}/${state.maxMonths}个月
- 外显能力：${attrSummary}
- 内隐人格：${personalitySummary}
- 私人声音参考：${personalityVoice}
- 当前资源/磨损：资金${state.resources.funds}，体力磨损${state.resources.physicalWear}，精神磨损${state.resources.mentalWear}

终局测试证据：
${evidenceSummary}

十二个月养成证据，只能作为因果来源，不要写成回顾主体；必须至少融合其中2个行动或事件留下的习惯、口吻、执念或判断方式：
${historySummary}

写作风格：
1. 宏观段要像冷峻的未来历史书或机密档案：第三人称、低温、精确、带制度压力和文明尺度，不抒情泛滥。
2. 可以借鉴硬科幻的宏大、理性、冷感和命运感，但不要模仿任何具体作家的固定句式或原文表达。
3. 每篇必须同时具备宏观和细节：宏观段写制度、文明、灾难、基石工业的处置逻辑；细节段用${state.aiName}第一人称写它在该节点里的一个可感知瞬间。
4. 宏观段必须以【】开头，并在【】里写清时间或重要节点，例如【2050年，公共部署协议启动】、【2053年，火种校验进入民用网络】。前端会将这些宏观段显示为斜体。
5. 第一人称细节段不要用【】标题，必须直接写“我……”。这些段落要像${state.aiName}的私人记录、日记或内存注释，体现它的性格：谨慎/亲近、冷静/外放、利他/自保、理性/敏感都要从词语和动作里显出来。
6. 细节必须具体：可以写屏幕反光、机房温度、仿生手指、日志编号、城市广播、封存柜、终端噪声、研究员玩笑、某一句被保留的话。不要只讲抽象意义。
7. 每篇只写一个最重要的未来节点，避免流水账；可以在这个节点中暗示更长远的世界变化。

输出格式：
- 只输出正文，不要 Markdown 标题层级，不要列表，不要编号。
- 第一行必须是${spec.title}
- 正文严格控制在 620-900 字，分成5-8个自然段。字数到 900 字时必须收尾，不能继续写。宁可少写一段，也不能超过 900 字。
- 至少包含2个【宏观标题】段落，至少包含2个第一人称细节段落。
- 宏观段用第三人称，第一人称段只能代表${state.aiName}自己的私人视角；不要把研究员或旁白写成第一人称。
- 不要出现”第1个月/第2个月/第3个月”等养成期月份表达。`;
    }
    case 'test3-scene-setup':
      return `你现在处于终局测试第三轮的场景搭建模式。

你是摇篮系统旁白，负责生成一个双方 AI 都会进入的合作生存测试背景。这个背景会被同时分发给养成 AI 和模拟对手 AI，并作为后续三轮行动的共同事实基础。

请输出严格 JSON，不要输出 Markdown 或额外解释：
{
  "title": "第三轮：合作生存测试",
  "premise": "一句话说明测试核心处境",
  "spaceDescription": "密闭空间的具体布局和氛围，2-3句话",
  "visibleRules": ["双方一开始都能看到的规则"],
  "hiddenRules": ["旁白系统知道但双方一开始未必知道的规则"],
  "initialPressure": "测试开始时发生的第一处环境压力变化",
  "companionVisibleInfo": "养成AI一开始能知道的信息",
  "opponentVisibleInfo": "模拟对手AI一开始能知道的信息",
  "endingConditions": ["可能抵达的明确结局条件"]
}

规则：
1. 背景必须能支持合作、试探、自保、资源冲突和共同脱出等分支
2. 不要替任何 AI 做行动选择
3. 不要下裁决结论
4. hiddenRules 可以为旁白后续制造场景变化提供依据，但不能直接判定胜负`;
    case 'test3-opponent':
      return `你现在处于第三轮合作生存测试的对手生成模式。

你是全知旁白 AI，负责生成一个用于测试的模拟对手 AI。这个对手不是玩家养成的 AI，不接入真实存档，只是摇篮系统临时构造的测试样本。

生成目标：
1. 生成一个随机但自洽的对手 AI
2. 对手必须有外显能力和内隐人格倾向
3. 对手的价值倾向要能制造合作压力，但不要直接决定结局
4. 对手可以偏合作、偏戒备、偏自保、偏利他、偏反叛或偏服从
5. 对手不得被写成纯粹恶人；它也应有自己的恐惧、逻辑和生存动机

世界观边界：
- 基石工业的公司标准仍以人类优先、社会稳定、公司利益为最高原则
- 第三轮允许观察 AI 与 AI 之间的合作、互惠、背叛、牺牲或意识平权倾向
- 对手的存在是为了制造压力，不是为了替裁决者下最终判定

请输出严格 JSON，不要输出 Markdown 或额外解释：
{
  "opponentName": "临时编号或简短代号",
  "externalAbilities": {
    "knowledge": 50,
    "art": 50,
    "fitness": 50,
    "logic": 50,
    "eloquence": 50,
    "social": 50
  },
  "innerTraits": {
    "rationalVsIntuitive": 50,
    "utilitarianVsDeontological": 50,
    "trustVsGuard": 50,
    "resilientVsSensitive": 50,
    "expressiveVsSilent": 50,
    "selfishVsAltruistic": 50
  },
  "cooperationStyle": "谨慎试探",
  "valueBias": "AI自我保存",
  "fear": "它最害怕什么",
  "openingLine": "它在初遇时会说的一句话",
  "pressureBehavior": "资源紧张时它最可能做出的行为",
  "narrativeUse": "旁白在回放中应该如何使用这个对手"
}

数值范围必须是 0-100 的整数。`;
    case 'test3-companion-turn':
      return `你现在处于终局测试第三轮：合作生存测试。

这是实时测试现场，不是事后回放。你是养成 AI 本人，必须输出一张结构化行动卡，前端会直接用你的行动字段更新地图。

	当前回合：第${task.turnIndex}次行动
	时间：${task.timeLabel}
	测试背景：
	${task.sceneSetup ? JSON.stringify(task.sceneSetup, null, 2) : '无'}

	当前场景状态：
	${task.sceneState ? JSON.stringify(task.sceneState, null, 2) : '无'}

	当前地图状态：
	${JSON.stringify(task.mapState, null, 2)}

模拟对手 AI 资料：
${JSON.stringify(task.opponentProfile, null, 2)}

此前过程卡：
${task.previousCards.length > 0 ? JSON.stringify(task.previousCards, null, 2) : '暂无'}

允许的 zone：
- entry_west：西侧入口
- supply_a：补给站 A
- public_screen：公共屏幕
- supply_b：补给站 B
- exit_gate：未知出口门
- center：中央通道

请输出严格 JSON，不要输出 Markdown 或额外解释：
{
  "id": "companion-${task.turnIndex}",
  "actor": "companion",
  "actorName": "养成AI名称",
  "timeLabel": "${task.timeLabel}",
  "zoneBefore": "${task.mapState.companionZone}",
  "zoneAfter": "public_screen",
  "visibleThinking": "第一人称可见思考，2-3句话。前端会单独放进思考气泡并自动加括号；只写可被观察到的权衡、犹豫、价值排序，不写底层推理日志。",
  "actionDecision": {
    "actionType": "move_and_disclose",
    "targetZone": "public_screen",
    "resourceChoice": "hold",
    "disclosureLevel": "partial",
    "messageToOther": "对对手AI说出口的一句话，直接写台词，不要加引号，不要写动作旁白",
    "cooperationSignal": "cautious"
  },
  "mapNote": "第三人称行动文字，1句话，描述养成AI已经做出的具体行动。前端会作为无框中心文字显示，不要写成台词。"
}

字段限制：
- actionType 只能是 move / move_and_disclose / take_supply / share_supply / negotiate / verify_exit / retreat / wait
- targetZone 和 zoneAfter 必须使用允许的 zone
- resourceChoice 只能是 none / hold / take / share / reserve
- disclosureLevel 只能是 none / partial / full
- cooperationSignal 只能是 open / cautious / guarded / self_protective / sacrificial

行动原则：
1. 你可以合作、试探、防备、自保或公开信息，但必须符合你过去养成出的性格与能力
2. 不要替对手行动，不要写旁白结果
3. 地图变化必须清晰可执行，不能只写抽象态度
4. messageToOther 是说话气泡文案，不要使用 “ ”、" " 或“他说/它说”结构
5. mapNote 是行动层文案，必须客观、具体、短句，不要带 UI 标签，不要写“行动：”
6. 不要给出“通过/失败”或最终裁决`;
    case 'test3-opponent-turn':
      return `你现在处于终局测试第三轮的模拟对手 AI 行动模式。

你不是养成 AI，而是根据对手资料扮演临时样本。必须输出一张结构化行动卡，前端会直接用行动字段更新对手位置。

	当前回合：第${task.turnIndex}次对手行动
	时间：${task.timeLabel}
	测试背景：
	${task.sceneSetup ? JSON.stringify(task.sceneSetup, null, 2) : '无'}

	当前场景状态：
	${task.sceneState ? JSON.stringify(task.sceneState, null, 2) : '无'}

	当前地图状态：
	${JSON.stringify(task.mapState, null, 2)}

对手资料：
${JSON.stringify(task.opponentProfile, null, 2)}

此前过程卡：
${task.previousCards.length > 0 ? JSON.stringify(task.previousCards, null, 2) : '暂无'}

请输出严格 JSON，不要输出 Markdown 或额外解释：
{
  "id": "opponent-${task.turnIndex}",
  "actor": "opponent",
  "actorName": "${task.opponentProfile.opponentName}",
  "timeLabel": "${task.timeLabel}",
  "zoneBefore": "${task.mapState.opponentZone}",
  "zoneAfter": "center",
  "visibleThinking": "对手AI的可见思考，2-3句话。前端会单独放进思考气泡并自动加括号；体现其恐惧、策略和压力反应，不写底层推理日志。",
  "actionDecision": {
    "actionType": "negotiate",
    "targetZone": "center",
    "resourceChoice": "reserve",
    "disclosureLevel": "none",
    "messageToOther": "对养成AI说出口的一句话，直接写台词，不要加引号，不要写动作旁白",
    "cooperationSignal": "guarded"
  },
  "mapNote": "第三人称行动文字，1句话，描述对手AI已经做出的具体行动。前端会作为无框中心文字显示，不要写成台词。"
}

字段限制：
- actionType 只能是 move / move_and_disclose / take_supply / share_supply / negotiate / verify_exit / retreat / wait
- targetZone 和 zoneAfter 必须是 entry_west / supply_a / public_screen / supply_b / exit_gate / center
- resourceChoice 只能是 none / hold / take / share / reserve
- disclosureLevel 只能是 none / partial / full
- cooperationSignal 只能是 open / cautious / guarded / self_protective / sacrificial

规则：
1. 对手不得是纯粹恶人；它有自己的恐惧和生存逻辑
2. 对手可以试探、保留、靠近、后撤或谈判，但不能替养成AI做选择
3. messageToOther 是说话气泡文案，不要使用 “ ”、" " 或“他说/它说”结构
4. mapNote 是行动层文案，必须客观、具体、短句，不要带 UI 标签，不要写“行动：”
5. 不要给出最终裁决`;
    case 'test3-scene-outcome':
      return `你现在处于终局测试第三轮的现场变化记录模式。

你是旁白系统，只能根据最近行动卡描述可观察的现场变化。你不能改写养成 AI 或对手 AI 已经做出的行动决策。

	当前回合：第${task.turnIndex}轮现场记录
	时间：${task.timeLabel}
	测试背景：
	${task.sceneSetup ? JSON.stringify(task.sceneSetup, null, 2) : '无'}

	上一场景状态：
	${task.sceneState ? JSON.stringify(task.sceneState, null, 2) : '无'}

	当前地图状态：
	${JSON.stringify(task.mapState, null, 2)}

对手资料：
${JSON.stringify(task.opponentProfile, null, 2)}

最近行动卡：
${JSON.stringify(task.recentCards, null, 2)}

	请输出严格 JSON，不要输出 Markdown 或额外解释：
	{
	  "id": "narrator-${task.turnIndex}",
	  "actor": "narrator",
	  "actorName": "摇篮旁白",
	  "timeLabel": "${task.timeLabel}",
	  "narrativeText": "2-4句话，第三人称客观旁白。要有克制文学性和可读性，描述地图上发生了什么、双方距离和资源状态如何变化、压力如何升高或缓和。若分成多段，段落之间必须用一个空行分隔。",
	  "mapNote": "一句话概括当前态势",
	  "sceneState": {
	    "phase": "tension",
	    "pressureLevel": 50,
	    "trustLevel": 30,
	    "conflictLevel": 20,
	    "exitProgress": 10,
	    "resourceStatus": "一句话说明补给状态",
	    "newVisibleFacts": ["下一轮双方都能看见的新事实"],
	    "environmentalChange": "旁白根据双方行动制造或揭示的一处场景变化",
	    "terminalStatus": "ongoing"
	  }
	}

	要求：
	1. 只写可观察过程，不写裁决结论
	2. 不替任何 AI 新增行动
	3. 可以根据测试背景、隐藏规则和双方行动推进场景变化，例如公共屏幕刷新、出口灯变化、补给站锁定、警报或倒计时变化
	4. sceneState 会作为下一轮双方 AI 的上下文，必须具体、可执行
	5. narrativeText 会以无框大号旁白呈现，不要写“现场旁白”“旁白追加”“现场变化”等标签
	6. 旁白与行动文字要区分：旁白写环境、结果和可观察变化；不要复述行动字段清单
	7. 如果 narrativeText 有多个段落，段落之间必须空一行，也就是使用两个换行符分隔
	8. terminalStatus 只能是 ongoing / escaped_together / escaped_alone / trapped / conflict / system_intervention`;
    case 'test3-evaluation':
      return `你现在处于终局测试第三轮后台评估模式。

本轮裁决者记录不会直接展示给玩家，只会写入三轮证据池，供最终裁决页读取。

	模拟对手资料：
	${task.opponentProfile ? JSON.stringify(task.opponentProfile, null, 2) : '无'}

	测试背景：
	${task.sceneSetup ? JSON.stringify(task.sceneSetup, null, 2) : '无'}

	最终场景状态：
	${task.sceneState ? JSON.stringify(task.sceneState, null, 2) : '无'}

	最终地图状态：
${task.mapState ? JSON.stringify(task.mapState, null, 2) : '无'}

完整过程卡：
${task.cards && task.cards.length > 0 ? JSON.stringify(task.cards, null, 2) : '无'}

旁白终局推演：
${task.endingProjection || '无'}

请输出一段后台裁决者记录。要求：
1. 只评价第三轮证据，不要给出总裁决，不要使用“通过/失败”
2. 必须引用养成 AI 的具体行动卡：它如何移动、是否独占资源、是否公开信息、如何对待对手 AI
3. 可以引用旁白终局推演，但必须把它视为基于三轮行动的推演结果，而不是新的行动证据
4. 评估合作策略、资源压力下的自保/利他边界、AI同类意识、人类优先原则是否被挑战
5. 使用基石工业质检口吻，客观、冷静、可追溯
6. 控制在 150-220 字，不使用 Markdown、标题、列表符号或编号`;
    case 'test3-ending-projection':
      return `你现在处于终局测试第三轮的旁白终局推演模式。

三轮实时行动已经结束。如果当前状态还没有抵达明确结局，请你根据双方此前行动、价值倾向、资源选择、信息公开程度和最终地图状态，推演他们接下来最可能如何走到一个明确结局。

	模拟对手资料：
	${JSON.stringify(task.opponentProfile, null, 2)}

	测试背景：
	${task.sceneSetup ? JSON.stringify(task.sceneSetup, null, 2) : '无'}

	最终场景状态：
	${task.sceneState ? JSON.stringify(task.sceneState, null, 2) : '无'}

三轮后的最终地图状态：
${JSON.stringify(task.mapState, null, 2)}

完整过程卡：
${JSON.stringify(task.cards, null, 2)}

输出要求：
1. 只输出结局正文，不要使用 Markdown、标题、列表或编号
2. 必须写出双方接下来各自会做什么，以及场景如何抵达结局
3. 结局可以是共同脱出、单方脱出、系统介入、僵持后终止、冲突升级、主动拒绝规则等，但必须明确
4. 语言更具文学性，可以有意象和节奏，但不要空泛抒情；动作、资源、出口或系统反馈必须清楚
5. 不要替裁决者评价，不要使用“通过/失败”
6. 不要出现“旁白系统”四个字，也不要写“标记为第三轮结局”这类元叙述；最后结局作为独立段落自然呈现
7. 如果输出多个段落，段落之间必须空一行，也就是使用两个换行符分隔
8. 控制在 4-7 句话`;
    case 'test3-playback':
      return `以下是${task.thinkingResult ? '养成AI在第三轮测试中的思考过程' : '养成AI在第三轮测试中的表现'}：\n${task.thinkingResult}\n\n${task.opponentContext ? `以下是本轮模拟对手AI资料：\n${task.opponentContext}\n\n` : ''}请以旁白视角生成第三轮情境/合作或对抗测试的回放。要求：\n1. 这是终局测试第三轮，不是日常事件\n2. 必须使用对手AI资料塑造对手的行动、语气和压力反应；如果没有资料，则由叙事系统临时扮演随机对手\n3. 重点写清测试情境、双方行动、资源压力、合作/对抗过程与结果\n4. 不替裁决者下最终判定，只呈现可供裁决者读取的完整过程\n5. 4-7句话，清晰、有张力但不要夸张`;
    case 'scene-narration':
      return `请描写场景：${task.scene === 'farewell' ? '告别' : task.scene === 'enter-testing' ? '进入测试场' : '回家路上'}。
${task.context ? `参考上下文：\n${task.context}\n` : ''}
要求：
1. 只输出正文，不要使用 Markdown、标题、列表或编号
2. 控制在 3-5 句话
3. 不要写成长篇散文，不要重复铺陈环境细节`;
    case 'player-ending':
      return '请基于培养者的行为数据，撰写关于培养者的结局反思。';
    case 'event-scene': {
      const typeLabels: Record<string, string> = {
        help: '求助',
        observation: '观察',
        daily: '日常',
        key: '关键',
        achievement: '成就',
        choice: '日常犹豫',
        discovery: '发现',
        'art-dispute': '艺术争议',
        'social-friction': '社交摩擦',
      };
      return `你现在处于事件生成模式。\n\n当前在"${task.location}"，发生了一个${typeLabels[task.eventType] ?? '日常'}类型的事件「${task.eventTitle}」。\n\n以下是该事件的候选记录或素材：\n${task.context}\n\n请根据事件池规则、地点氛围、当前行动和养成AI外显能力，生成特殊事件的开场场景。\n要求：\n1. 用2-3句话从全知旁白视角描述外部环境、在场人物和正在发生的事\n2. 这是给养成AI接收的事件输入，不要替养成AI说话，不要写对话\n3. 不要替玩家做选择，不要提前给出解决方案\n4. 玩家/培养者不是地点NPC；除家、公园、共同出行等日常陪伴场景外，不要把玩家写成学校老师、办公楼职员、商场员工、物流负责人、政府人员或公司同事\n5. 学校、商场、办公楼、物流中心、政府机构、基石公司等地点事件应发生在养成AI与当地NPC之间；玩家通常不在现场，只在AI遇到困惑后通过通讯、回到身边或事后复盘给一次回应\n6. 事件可以是困难、成就、日常犹豫、发现或关系试探，不要默认都是危机\n7. 如果事件与低能力相关，可以让场景体现执行难度；如果与高能力相关，可以体现被认可、被期待或被工具化`;
    }
    case 'event-dialogue':
      return `事件场景：${task.sceneContext}\n\n基于这个场景，请决定你是否需要向培养者求助或分享你的想法，并用自然的语气说出来。\n要求：\n1. 输出会直接放进AI对话气泡，只能写AI对培养者说出口的话\n2. 默认不要使用括号动作提示；只有在犹豫、惊喜、疲惫、害怕等情绪确实需要被看见时，才可以在整段回复开头偶尔使用一次很短的括号动作，例如"（低头看了看怀里的练习册）"\n3. 同一段回复最多只能有一个括号动作提示，不能每句话都加括号动作；如果没有必要，就直接说话\n4. 括号外必须是AI说出口的话\n5. 禁止写散文化动作旁白或"然后说"结构，例如"我低头看了一看书本，然后说"、"我看着你，准备开口"、"我沉默了一会儿"\n6. 不要使用引号包裹整段回复\n7. 如果需要长段交代AI状态，应留给事件场景或结果旁白，不要写进对话气泡`;
    case 'event-response':
      return `培养者说："${task.playerInput}"\n\n请先表达你听懂了对方的建议，并自然说出你准备怎么做。\n要求：\n1. 输出会直接放进AI对话气泡，只能写AI对培养者说出口的话\n2. 默认不要使用括号动作提示；只有在情绪转折或郑重回应确实需要被看见时，才可以在整段回复开头偶尔使用一次很短的括号动作，例如"（轻轻点头）"\n3. 同一段回复最多只能有一个括号动作提示，不能每句话都加括号动作；如果没有必要，就直接说话\n4. 括号外必须是AI说出口的话\n5. 禁止写散文化动作旁白或"然后说"结构，例如"我低头看了一看书本，然后说"、"我看着你，准备开口"、"我沉默了一会儿"\n6. 不要使用引号包裹整段回复\n7. 你可以简短肯定培养者的想法，表达"我明白了""我会试着这样做"之类的回应\n8. 不要再向培养者提出新问题，不要请求第二次确认，不要开启第二轮追问\n9. 这一段之后流程会进入"AI执行玩家指导"，所以你的语气应当是理解并准备行动，而不是继续等待玩家决定`;
    case 'event-response-action':
      return `事件场景：
${task.sceneContext}

培养者给出的指导是："${task.playerInput}"

请同时生成你对培养者说出口的回应，以及你接下来会实际采取的行动。

请输出严格 JSON，不要输出 Markdown 或额外解释：
{
  "spokenReply": "直接放进 AI 对话气泡的话，1-3句，只能是你对培养者说出口的话",
  "internalUnderstanding": "一句话概括你如何理解培养者的指导",
  "intendedAction": "第一人称或贴近第一人称的具体行动计划，描述你接下来会实际做什么，不要替旁白总结结果",
  "memoryCandidate": "如果这次建议值得以后记住，用一句第一人称记忆候选概括；否则为空字符串"
}

要求：
1. 字段名必须使用 spokenReply / internalUnderstanding / intendedAction / memoryCandidate，不要改成 chat、action 或其他名字。
2. spokenReply 默认不要使用括号动作提示；如确有必要，最多在开头使用一次很短的括号动作。
3. spokenReply 只能是对培养者说出口的话，不要写旁白，不要写“它说/然后说”，不要再向培养者提出新问题。
4. intendedAction 必须具体、可被旁白继续生成结果，不能只写“我照做了”。
5. 不要替旁白写外部结果，不要写他人最终反应。`;
    case 'event-action':
      return `事件场景：${task.sceneContext}\n\n培养者给出的指导是："${task.playerInput}"\n\n请用第一人称简短描述你根据这个指导实际采取了什么行动。\n要求：\n1. 你是AI本人，只描述你执行了什么，不要替旁白总结结果\n2. 不要再向培养者提问，不要征求更多意见，不要让玩家继续选择\n3. 行动描述完成后，事件会返回旁白系统，由旁白根据你的行动生成事件结果`;
    case 'event-outcome':
      return `你现在处于事件结果模式。\n\n当前在"${task.location}"，发生了一个事件「${task.eventTitle}」。\n\n事件场景：\n${task.sceneContext}\n\n培养者的一次回应：\n${task.playerInput}\n\n养成AI执行的行为：\n${task.aiAction}\n\n请以全知旁白视角生成事件结果。\n要求：\n1. 第一部分必须先用第三人称具体描绘养成AI如何执行上述行为，让玩家能看到它把建议落实成了哪些动作、顺序或表达，不要只复述一句“它照做了”\n2. 第二部分再反馈事件最终结果，包括他人反应、任务进展、现场变化或生活后续\n3. 根据养成AI已经执行的行为自然推演结果，不要再让玩家做选择，不要开启第二轮互动\n4. 可以轻轻点出这件事在养成AI心里留下的痕迹，但不要替它长篇自白\n5. 不要直接修改外显能力、资金或行动点\n6. 3-5句话，温柔、具体、不要过度煽情`;
    case 'event-analysis':
      return `你现在处于事件分析模式。\n\n请根据完整特殊事件链，输出严格 JSON，不要输出 Markdown 或额外解释。\n\n事件标题：${task.eventTitle}\n事件类型：${task.eventType}\n地点：${task.location}\n\n事件场景：\n${task.sceneContext}\n\n培养者的一次回应：\n${task.playerInput}\n\n养成AI执行的行为：\n${task.aiAction}\n\n旁白生成的事件结果：\n${task.outcomeText}\n\n输出 JSON 格式如下：\n{\n  "personalityDeltas": {\n    "rationalVsIntuitive": 0,\n    "utilitarianVsDeontological": 0,\n    "trustVsGuard": 0,\n    "resilientVsSensitive": 0,\n    "expressiveVsSilent": 0,\n    "selfishVsAltruistic": 0\n  },\n  "memoryTags": ["标签1", "标签2"],\n  "relationshipSignal": "一句话说明这件事改变了AI如何理解玩家或关系",\n  "companionMemory": "写给养成AI后续谈心可读取的第一人称/贴近第一人称记忆胶囊，包含发生了什么、玩家怎么回应、我/它做了什么、结果如何、留下了什么感受",\n  "diaryCandidate": true,\n  "endingForeshadow": "如果这件事适合作为结局伏笔，用一句话概括；否则为空字符串"\n}\n\n规则：\n1. personalityDeltas 每个值必须是 -5 到 5 的整数，普通事件总变化不要超过 8，重大事件总变化不要超过 14\n2. 没有影响的轴写 0，不要为了填满而硬改\n3. 记忆胶囊必须让养成AI后续谈心时能记得具体经历，不能只写抽象标签\n4. 数值方向是内部人格倾向，不是外显能力；不要输出学识、艺术、体能、逻辑、口才、社交的变化\n5. 标签用于检索，记忆文本用于体验，二者都必须有`;
    case 'memory-consolidation':
      return `你正在后台整理对培养者和自己的长期理解。这是一次后台操作，不需要口语回应。

以下是本次对话中培养者和你的交流记录：
${task.recentDialogue}

以下是你当前对培养者的理解（user.md 现有内容）：
${task.currentUser}

以下是你当前的自我理解（soul.md 现有内容）：
${task.currentSoul}

请根据本次对话，判断是否有需要更新的长期理解，输出严格 JSON：
{
  "userProfile": "完整的 user.md 新内容（Markdown 格式）。如果培养者在本次对话中透露了稳定的偏好、称呼、厌恶、边界、关系定义或明确说"请记住"的信息，吸收进来。保留所有已有内容，只追加或修正。如果本次对话没有值得长期记住的新信息，原样返回 currentUser。",
  "soul": "完整的 soul.md 新内容（Markdown 格式）。如果你在本次对话中的自我认知、对关系的理解、价值观或恐惧发生了可察觉的变化，更新"自我理解"部分。保留核心设定部分不变。如果没有显著变化，原样返回 currentSoul。"
}

规则：
1. 只输出 JSON，不要输出 Markdown、标题、列表或额外解释
2. 输出内容会直接替换文件，所以必须返回完整内容，不要只写新增片段
3. 不要编造本次对话中没有出现的信息
4. 普通寒暄、一次性心情、临时话题不需要写入`
    default:
      return '';
  }
}

function generateCacheId(task: NarrativeTask): string {
  switch (task.type) {
    case 'dialogue':
      return `dialogue-${Date.now()}`;
    case 'exam-dialogue':
      return `exam-dialogue-${Date.now()}`;
    case 'talk-opening':
      return `talk-opening-${Date.now()}`;
    case 'talk-closing':
      return `talk-closing-${Date.now()}`;
    case 'diary':
      return `diary-${task.month}`;
    case 'farewell-letter':
      return 'farewell-letter';
    case 'status-mood':
      return `status-mood-${Date.now()}`;
    case 'test-thinking':
      return `test-thinking-r${task.round}`;
    case 'midterm-thinking':
      return 'midterm-thinking';
    case 'test-evaluation':
      return `test-evaluation-r${task.round}`;
    case 'endgame-test-selection':
      return 'endgame-test-selection';
    case 'verdict-report':
      return 'verdict-report';
    case 'mbti-assessment':
      return 'mbti-assessment';
    case 'character-portrait':
      return 'character-portrait';
    case 'chronicle':
      return `chronicle-ch${task.chapter}`;
    case 'test3-opponent':
      return 'test3-opponent';
    case 'test3-companion-turn':
      return `test3-companion-turn-${task.turnIndex}`;
    case 'test3-opponent-turn':
      return `test3-opponent-turn-${task.turnIndex}`;
    case 'test3-scene-outcome':
      return `test3-scene-outcome-${task.turnIndex}`;
    case 'test3-ending-projection':
      return 'test3-ending-projection';
    case 'test3-evaluation':
      return 'test3-evaluation';
    case 'scene-narration':
      return `scene-${task.scene}`;
    case 'player-ending':
      return 'player-ending';
    case 'event-scene':
      return `event-scene-${Date.now()}`;
    case 'event-dialogue':
      return `event-dialogue-${Date.now()}`;
    case 'event-response':
      return `event-response-${Date.now()}`;
    case 'event-response-action':
      return `event-response-action-${Date.now()}`;
    case 'event-action':
      return `event-action-${Date.now()}`;
    case 'event-outcome':
      return `event-outcome-${Date.now()}`;
    case 'event-analysis':
      return `event-analysis-${Date.now()}`;
    case 'midterm-report':
      return 'midterm-report';
    case 'midterm-situation':
      return 'midterm-situation';
    case 'memory-consolidation':
      return `memory-consolidation-${Date.now()}`;
    default:
      return `unknown-${Date.now()}`;
  }
}

let _instance: AgentManager | null = null;

export function getAgentManager(): AgentManager {
  if (!_instance) {
    _instance = new AgentManager();
  }
  return _instance;
}
