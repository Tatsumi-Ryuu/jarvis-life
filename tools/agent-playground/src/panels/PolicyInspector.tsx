import { useMemo } from 'react';
import type { NarrativeTask } from '@/types';
import { getAgentTaskPolicy } from '@/engine/narrative/core/agent-task-policy';
import { getPersona, getRoleForTask } from '@/engine/narrative/core/persona-registry';

const TASK_TYPE_LIST: NarrativeTask['type'][] = [
  'dialogue', 'exam-dialogue', 'talk-opening', 'talk-closing', 'diary',
  'farewell-letter', 'status-mood', 'test-thinking', 'test-action-narration',
  'midterm-thinking', 'test-evaluation', 'endgame-test-selection',
  'verdict-report', 'mbti-assessment', 'character-portrait', 'chronicle',
  'test3-thinking', 'test3-scene-setup', 'test3-opponent', 'test3-playback',
  'event-scene', 'event-dialogue', 'event-response', 'event-response-action',
  'event-action', 'event-outcome', 'event-analysis',
  'midterm-report', 'midterm-situation',
  'scene-narration', 'player-ending',
];

function makeMinimalTask(type: NarrativeTask['type']): NarrativeTask {
  switch (type) {
    case 'dialogue': return { type, input: 'test', mode: 'casual' };
    case 'talk-opening': return { type, recentEvents: '' };
    case 'talk-closing': return { type };
    case 'diary': return { type, month: 1 };
    case 'farewell-letter': return { type };
    case 'status-mood': return { type, wear: { physical: 25, mental: 15 } };
    case 'event-scene': return { type, eventTitle: 'test', eventType: 'random', location: 'lab', context: '' };
    case 'event-dialogue': return { type, eventType: 'random', location: 'lab', sceneContext: '' };
    case 'event-response': return { type, eventType: 'random', location: 'lab', playerInput: 'test' };
    case 'scene-narration': return { type, scene: 'farewell' };
    default: return { type: 'dialogue', input: 'test', mode: 'casual' };
  }
}

export function PolicyInspector() {
  const rows = useMemo(() => {
    return TASK_TYPE_LIST.map((type) => {
      let policy;
      try {
        const task = makeMinimalTask(type);
        policy = getAgentTaskPolicy(task);
      } catch {
        return null;
      }
      if (!policy) return null;

      const persona = getPersona(policy.role);
      return {
        taskType: type,
        role: policy.role,
        mode: policy.mode,
        modelLevel: policy.modelLevel,
        outputFormat: policy.outputFormat,
        contextFragments: policy.contextPolicy.fragments.join(', '),
        tools: policy.toolPolicy.allow.join(', ') || 'none',
        temperature: persona?.temperature ?? '-',
        maxTokens: persona?.maxTokens ?? '-',
      };
    }).filter(Boolean);
  }, []);

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Policy Inspector</h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #2a2e3a' }}>
              {['Task Type', 'Role', 'Mode', 'Model', 'Format', 'Context', 'Tools', 'Temp', 'MaxTokens'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#8b92a5', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => row && (
              <tr key={row.taskType} style={{ borderBottom: '1px solid #1e2230' }}>
                <td style={{ padding: '6px 10px', color: '#e4e7ed', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.taskType}</td>
                <td style={{ padding: '6px 10px', color: '#4a9eff' }}>{row.role}</td>
                <td style={{ padding: '6px 10px', color: '#8b92a5' }}>{row.mode}</td>
                <td style={{ padding: '6px 10px', color: '#8b92a5' }}>{row.modelLevel}</td>
                <td style={{ padding: '6px 10px', color: '#8b92a5' }}>{row.outputFormat}</td>
                <td style={{ padding: '6px 10px', color: '#3dd68c', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.contextFragments}</td>
                <td style={{ padding: '6px 10px', color: '#ffaa4a', fontSize: 11 }}>{row.tools}</td>
                <td style={{ padding: '6px 10px', color: '#8b92a5' }}>{row.temperature}</td>
                <td style={{ padding: '6px 10px', color: '#8b92a5' }}>{row.maxTokens}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
