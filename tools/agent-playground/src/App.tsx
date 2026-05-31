import { usePlaygroundStore, type PlaygroundPanel } from './store/playground-store';
import { ConfigPanel } from './panels/ConfigPanel';
import { TaskRunnerPanel } from './panels/TaskRunnerPanel';
import { PromptInspector } from './panels/PromptInspector';
import { ToolCallViewer } from './panels/ToolCallViewer';
import { MemoryExplorer } from './panels/MemoryExplorer';
import { GameStateEditor } from './panels/GameStateEditor';
import { PolicyInspector } from './panels/PolicyInspector';

const PANELS: { id: PlaygroundPanel; label: string }[] = [
  { id: 'task-runner', label: 'Task Runner' },
  { id: 'prompt-inspector', label: 'Prompt' },
  { id: 'tool-calls', label: 'Tool Calls' },
  { id: 'memory', label: 'Memory' },
  { id: 'game-state', label: 'Game State' },
  { id: 'policy', label: 'Policy' },
];

export default function App() {
  const initialized = usePlaygroundStore((s) => s.initialized);
  const activePanel = usePlaygroundStore((s) => s.activePanel);
  const setActivePanel = usePlaygroundStore((s) => s.setActivePanel);

  if (!initialized) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ConfigPanel />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <nav style={{
        width: 180,
        minWidth: 180,
        background: '#14161e',
        borderRight: '1px solid #2a2e3a',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 0',
        gap: 2,
      }}>
        <div style={{
          padding: '8px 16px 16px',
          fontSize: 14,
          fontWeight: 700,
          color: '#4a9eff',
          borderBottom: '1px solid #2a2e3a',
          marginBottom: 8,
        }}>
          Agent Playground
        </div>
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePanel(p.id)}
            style={{
              background: activePanel === p.id ? '#1e2230' : 'transparent',
              border: 'none',
              color: activePanel === p.id ? '#e4e7ed' : '#8b92a5',
              textAlign: 'left',
              padding: '10px 16px',
              fontSize: 13,
              cursor: 'pointer',
              borderLeft: activePanel === p.id ? '3px solid #4a9eff' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {activePanel === 'task-runner' && <TaskRunnerPanel />}
        {activePanel === 'prompt-inspector' && <PromptInspector />}
        {activePanel === 'tool-calls' && <ToolCallViewer />}
        {activePanel === 'memory' && <MemoryExplorer />}
        {activePanel === 'game-state' && <GameStateEditor />}
        {activePanel === 'policy' && <PolicyInspector />}
      </main>
    </div>
  );
}
