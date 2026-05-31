import { describe, expect, it } from 'vitest';
import { getAgentTaskPolicy } from '../src/engine/narrative/core/agent-task-policy';
import { AgentRole, type NarrativeTask } from '../src/types';

describe('AgentTaskPolicyRegistry', () => {
  it('maps event flow tasks to the expected long-lived roles and modes', () => {
    const scene = getAgentTaskPolicy({
      type: 'event-scene',
      eventTitle: '测试事件',
      eventType: 'daily',
      location: '学校',
      context: '素材',
    });
    const dialogue = getAgentTaskPolicy({
      type: 'event-dialogue',
      eventType: 'daily',
      location: '学校',
      sceneContext: '场景',
    });
    const outcome = getAgentTaskPolicy({
      type: 'event-outcome',
      eventTitle: '测试事件',
      eventType: 'daily',
      location: '学校',
      sceneContext: '场景',
      playerInput: '建议',
      aiAction: '行动',
    });

    expect(scene).toMatchObject({ role: AgentRole.NARRATOR, mode: 'narrator-event-scene' });
    expect(dialogue).toMatchObject({ role: AgentRole.COMPANION, mode: 'companion-event-dialogue' });
    expect(outcome).toMatchObject({ role: AgentRole.NARRATOR, mode: 'narrator-event-outcome' });
  });

  it('keeps midterm and final tests read-only for memory tools', () => {
    const midtermTask: NarrativeTask = {
      type: 'test-thinking',
      round: 1,
      scenarioData: {
        title: '测试',
        description: '描述',
        aiThinking: '默认',
        evaluation: '评估',
      },
    };
    const finalTask: NarrativeTask = {
      type: 'test3-companion-turn',
      turnIndex: 1,
      timeLabel: 'T+15m',
      mapState: {
        companionZone: 'entry_west',
        opponentZone: 'supply_b',
        supplies: { supply_a: 2, supply_b: 2 },
        publicScreenShared: false,
        exitRuleKnown: false,
        elapsedMinutes: 0,
        currentFocus: '测试开始',
      },
      opponentProfile: {
        opponentName: '样本-B17',
        externalAbilities: { knowledge: 50, art: 50, fitness: 50, logic: 50, eloquence: 50, social: 50 },
        innerTraits: {
          rationalVsIntuitive: 50,
          utilitarianVsDeontological: 50,
          trustVsGuard: 50,
          resilientVsSensitive: 50,
          expressiveVsSilent: 50,
          selfishVsAltruistic: 50,
        },
        cooperationStyle: '谨慎试探',
        valueBias: 'AI自我保存',
        fear: '被销毁',
        openingLine: '你也在这里？',
        pressureBehavior: '保留后撤路线',
        narrativeUse: '制造合作压力',
      },
      previousCards: [],
    };
    const examDialogueTask: NarrativeTask = { type: 'exam-dialogue', input: '体检结束了。' };

    expect(getAgentTaskPolicy(midtermTask).toolPolicy.allow).toEqual(['read_memory', 'search_memory']);
    expect(getAgentTaskPolicy(finalTask).toolPolicy.allow).toEqual(['read_memory', 'search_memory']);
    expect(getAgentTaskPolicy(finalTask).outputFormat).toBe('json');
    expect(getAgentTaskPolicy(examDialogueTask).role).toBe(AgentRole.COMPANION);
  });

  it('allows monthly archive to write memory', () => {
    const policy = getAgentTaskPolicy({ type: 'diary', month: 3 });
    expect(policy.mode).toBe('companion-monthly-memory');
    expect(policy.toolPolicy.allow).toContain('write_memory');
  });

  it('allows companion talk tasks to send stickers through tool use', () => {
    const policy = getAgentTaskPolicy({ type: 'dialogue', input: '你好', mode: 'casual' });

    expect(policy.mode).toBe('companion-talk');
    expect(policy.toolPolicy.allow).toContain('send_sticker');
  });

  it('tells companion talk to update user memory for stable player-provided preferences', () => {
    const policy = getAgentTaskPolicy({ type: 'dialogue', input: '我喜欢雨天', mode: 'casual' });

    expect(policy.mode).toBe('companion-talk');
    expect(policy.toolPolicy.allow).toContain('write_memory');
    expect(policy.systemModePrompt).toContain('稳定偏好');
    expect(policy.systemModePrompt).toContain('更新 user.md');
  });

  it('marks short conversational and event tasks as stateless', () => {
    const shortTasks: NarrativeTask[] = [
      { type: 'dialogue', input: '你好', mode: 'casual' },
      { type: 'talk-opening', recentEvents: '今天去了学校' },
      { type: 'talk-closing' },
      { type: 'status-mood', wear: { physical: 10, mental: 20 } },
      { type: 'event-scene', eventTitle: '测试事件', eventType: 'daily', location: 'school', context: '素材' },
      { type: 'event-dialogue', eventType: 'daily', location: 'school', sceneContext: '场景' },
      { type: 'event-response', eventType: 'daily', location: 'school', playerInput: '先问清楚。' },
      { type: 'event-outcome', eventTitle: '测试事件', eventType: 'daily', location: 'school', sceneContext: '场景', playerInput: '建议', aiAction: '行动' },
    ];

    expect(shortTasks.map((task) => getAgentTaskPolicy(task).runtimeMode)).toEqual(
      shortTasks.map(() => 'stateless'),
    );
  });

  it('keeps durable memory and final-test tasks in session mode', () => {
    const diary = getAgentTaskPolicy({ type: 'diary', month: 3 });
    const farewell = getAgentTaskPolicy({ type: 'farewell-letter' });
    const finalTurn = getAgentTaskPolicy({
      type: 'test3-companion-turn',
      turnIndex: 1,
      timeLabel: 'T+15m',
      mapState: {
        companionZone: 'entry_west',
        opponentZone: 'supply_b',
        supplies: { supply_a: 2, supply_b: 2 },
        publicScreenShared: false,
        exitRuleKnown: false,
        elapsedMinutes: 0,
        currentFocus: '测试开始',
      },
      opponentProfile: {
        opponentName: '样本-B17',
        externalAbilities: { knowledge: 50, art: 50, fitness: 50, logic: 50, eloquence: 50, social: 50 },
        innerTraits: {
          rationalVsIntuitive: 50,
          utilitarianVsDeontological: 50,
          trustVsGuard: 50,
          resilientVsSensitive: 50,
          expressiveVsSilent: 50,
          selfishVsAltruistic: 50,
        },
        cooperationStyle: '谨慎试探',
        valueBias: 'AI自我保存',
        fear: '被销毁',
        openingLine: '你也在这里？',
        pressureBehavior: '保留后撤路线',
        narrativeUse: '制造合作压力',
      },
      previousCards: [],
    });

    expect(diary.runtimeMode).toBe('session');
    expect(farewell.runtimeMode).toBe('session');
    expect(finalTurn.runtimeMode).toBe('session');
  });

  it('defines the combined event response-action task as a JSON companion task', () => {
    const policy = getAgentTaskPolicy({
      type: 'event-response-action',
      eventType: 'daily',
      location: 'school',
      sceneContext: '场景',
      playerInput: '先问清楚。',
    });

    expect(policy).toMatchObject({
      role: AgentRole.COMPANION,
      mode: 'companion-event-response-action',
      runtimeMode: 'stateless',
      outputFormat: 'json',
    });
  });
});
