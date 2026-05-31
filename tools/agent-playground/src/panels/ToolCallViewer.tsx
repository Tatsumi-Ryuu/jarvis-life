import { usePlaygroundStore } from '../store/playground-store';

export function ToolCallViewer() {
  const runLogs = usePlaygroundStore((s) => s.runLogs);

  if (!runLogs.length) {
    return (
      <div style={{ color: '#8b92a5', fontSize: 13 }}>
        还没有运行过任务。先在 Task Runner 中运行一个任务，然后这里会展示工具调用记录。
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Tool Call Viewer</h3>

      {runLogs.map((log) => (
        <div key={log.id} style={{
          background: '#14161e',
          border: '1px solid #2a2e3a',
          borderRadius: 8,
          padding: 14,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {log.taskType} → {log.role}
            </span>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: log.status === 'success' ? 'rgba(61,214,140,0.15)' : log.status === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(74,158,255,0.15)',
              color: log.status === 'success' ? '#3dd68c' : log.status === 'error' ? '#f87171' : '#4a9eff',
            }}>
              {log.status}
            </span>
          </div>

          {log.toolCalls.length === 0 ? (
            <>
              <div style={{ fontSize: 12, color: '#5c6378', fontStyle: 'italic' }}>
                无工具调用
              </div>
              <div style={{ fontSize: 11, color: '#5c6378', marginTop: 6 }}>
                Available tools: {log.toolsAvailable?.join(', ') || 'none'}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {log.toolCalls.map((call, i) => (
                <div key={i} style={{
                  background: '#0f1117',
                  borderRadius: 6,
                  padding: 10,
                  borderLeft: `3px solid ${call.ok ? '#3dd68c' : '#f87171'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#3dd68c', fontFamily: 'monospace' }}>
                      {call.toolName}
                    </span>
                    <span style={{ fontSize: 11, color: call.ok ? '#3dd68c' : '#f87171' }}>
                      {call.ok ? 'success' : 'error'}
                    </span>
                  </div>

                  {call.args && (
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#5c6378' }}>Args:</span>
                      <pre style={{
                        fontSize: 11,
                        color: '#8b92a5',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {typeof call.args === 'string' ? call.args : JSON.stringify(call.args, null, 2)}
                      </pre>
                    </div>
                  )}

                  {call.result !== undefined && (
                    <div>
                      <span style={{ fontSize: 11, color: '#5c6378' }}>Result:</span>
                      <pre style={{
                        fontSize: 11,
                        color: '#8b92a5',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}>
                        {typeof call.result === 'string' ? call.result : JSON.stringify(call.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
