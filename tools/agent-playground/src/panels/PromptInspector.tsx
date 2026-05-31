import { useState, useCallback } from 'react';
import { usePlaygroundStore } from '../store/playground-store';

export function PromptInspector() {
  const runLogs = usePlaygroundStore((s) => s.runLogs);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    system: true,
    context: true,
    runtime: true,
    user: true,
  });

  const latestLog = runLogs[0];

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const copyFullPrompt = useCallback(() => {
    if (!latestLog) return;
    const parts = [latestLog.systemPrompt, latestLog.context, latestLog.runtimePrompt, latestLog.userMessage].filter(Boolean);
    navigator.clipboard.writeText(parts.join('\n\n---\n\n'));
  }, [latestLog]);

  if (!latestLog) {
    return (
      <div style={{ color: '#8b92a5', fontSize: 13 }}>
        还没有运行过任务。先在 Task Runner 中运行一个任务，然后这里会展示完整的 Prompt。
      </div>
    );
  }

  const sectionStyle = (key: string): React.CSSProperties => ({
    background: '#14161e',
    border: '1px solid #2a2e3a',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  });

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#1a1d28',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const contentStyle: React.CSSProperties = {
    padding: 12,
    fontSize: 12,
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    color: '#8b92a5',
    maxHeight: expanded ? 400 : 0,
    overflow: 'auto',
    transition: 'max-height 0.2s',
    padding: expanded ? 12 : '0 12px',
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Prompt Inspector</h3>
        <button onClick={copyFullPrompt} style={{
          background: '#2a2e3a',
          border: 'none',
          color: '#e4e7ed',
          borderRadius: 4,
          padding: '4px 12px',
          fontSize: 12,
          cursor: 'pointer',
        }}>
          Copy Full Prompt
        </button>
      </div>

      <div style={sectionStyle('system')}>
        <div style={headerStyle} onClick={() => toggle('system')}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4a9eff' }}>
            System Prompt ({latestLog.systemPrompt?.length ?? 0} chars)
          </span>
          <span style={{ color: '#8b92a5', fontSize: 11 }}>{expanded.system ? '▼' : '▶'}</span>
        </div>
        {expanded.system && (
          <div style={{ ...contentStyle, maxHeight: 400 }}>
            {latestLog.systemPrompt || '(未生成)'}
          </div>
        )}
      </div>

      <div style={sectionStyle('context')}>
        <div style={headerStyle} onClick={() => toggle('context')}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#3dd68c' }}>
            Context ({latestLog.context?.length ?? 0} chars)
          </span>
          <span style={{ color: '#8b92a5', fontSize: 11 }}>{expanded.context ? '▼' : '▶'}</span>
        </div>
        {expanded.context && (
          <div style={{ ...contentStyle, maxHeight: 400 }}>
            {latestLog.context || '(无上下文)'}
          </div>
        )}
      </div>

      <div style={sectionStyle('runtime')}>
        <div style={headerStyle} onClick={() => toggle('runtime')}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#c084fc' }}>
            Runtime User Prompt ({latestLog.runtimePrompt?.length ?? 0} chars)
          </span>
          <span style={{ color: '#8b92a5', fontSize: 11 }}>{expanded.runtime ? '▼' : '▶'}</span>
        </div>
        {expanded.runtime && (
          <div style={{ ...contentStyle, maxHeight: 500 }}>
            {latestLog.runtimePrompt || '(未生成)'}
          </div>
        )}
      </div>

      <div style={sectionStyle('user')}>
        <div style={headerStyle} onClick={() => toggle('user')}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ffaa4a' }}>
            User Message ({latestLog.userMessage?.length ?? 0} chars)
          </span>
          <span style={{ color: '#8b92a5', fontSize: 11 }}>{expanded.user ? '▼' : '▶'}</span>
        </div>
        {expanded.user && (
          <div style={{ ...contentStyle, maxHeight: 300 }}>
            {latestLog.userMessage || '(未生成)'}
          </div>
        )}
      </div>
    </div>
  );
}
