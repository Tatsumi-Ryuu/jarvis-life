import { useState, useEffect, useCallback } from 'react';
import { getMemoryStoragePort } from '../adapter/playground-init';

interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
}

function buildFileTree(files: Map<string, string>): FileNode[] {
  const root: FileNode[] = [];

  for (const key of Array.from(files.keys()).sort()) {
    const parts = key.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const existing = current.find((n) => n.name === part);

      if (i === parts.length - 1) {
        if (!existing) {
          current.push({ name: part, path: key, kind: 'file' });
        }
      } else {
        if (!existing) {
          const dir: FileNode = { name: part, path: parts.slice(0, i + 1).join('/'), kind: 'directory', children: [] };
          current.push(dir);
          current = dir.children!;
        } else {
          if (!existing.children) existing.children = [];
          current = existing.children;
        }
      }
    }
  }

  return root;
}

export function MemoryExplorer() {
  const [files, setFiles] = useState<Map<string, string>>(new Map());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [dirty, setDirty] = useState(false);

  const refresh = useCallback(() => {
    try {
      const port = getMemoryStoragePort();
      setFiles(port.getAllFiles());
    } catch { /* not initialized */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const tree = buildFileTree(files);

  const handleSelect = (path: string) => {
    if (dirty && selectedPath) {
      const ok = confirm('有未保存的修改，确定切换文件？');
      if (!ok) return;
    }
    const content = files.get(path);
    setSelectedPath(path);
    setEditContent(content ?? '');
    setDirty(false);
  };

  const handleSave = () => {
    if (!selectedPath) return;
    try {
      const port = getMemoryStoragePort();
      port.writeFile(selectedPath, editContent);
      setDirty(false);
      refresh();
    } catch (err) {
      alert(`保存失败: ${err}`);
    }
  };

  const renderTree = (nodes: FileNode[], depth: number = 0): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    for (const node of nodes) {
      const indent = depth * 16;
      if (node.kind === 'directory') {
        result.push(
          <div key={node.path} style={{ paddingLeft: indent, color: '#5c6378', fontSize: 12, padding: '4px 8px', userSelect: 'none' }}>
            {node.name}/
          </div>
        );
        if (node.children) {
          result.push(...renderTree(node.children, depth + 1));
        }
      } else {
        result.push(
          <div
            key={node.path}
            onClick={() => handleSelect(node.path)}
            style={{
              paddingLeft: indent,
              fontSize: 12,
              padding: '4px 8px',
              cursor: 'pointer',
              color: selectedPath === node.path ? '#4a9eff' : '#8b92a5',
              background: selectedPath === node.path ? 'rgba(74,158,255,0.1)' : 'transparent',
              borderRadius: 3,
            }}
          >
            {node.name}
          </div>
        );
      }
    }
    return result;
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 80px)' }}>
      <div style={{
        width: 240,
        minWidth: 240,
        background: '#14161e',
        border: '1px solid #2a2e3a',
        borderRadius: 8,
        overflow: 'auto',
        padding: '8px 0',
      }}>
        <div style={{ padding: '4px 12px 8px', fontSize: 12, fontWeight: 600, color: '#8b92a5', borderBottom: '1px solid #2a2e3a', marginBottom: 4 }}>
          文件树
        </div>
        {renderTree(tree)}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#8b92a5' }}>
            {selectedPath || '选择左侧文件'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} style={{ background: '#2a2e3a', border: 'none', color: '#e4e7ed', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
              刷新
            </button>
            {selectedPath && (
              <button
                onClick={handleSave}
                disabled={!dirty}
                style={{
                  background: dirty ? '#4a9eff' : '#2a2e3a',
                  border: 'none',
                  color: dirty ? '#fff' : '#5c6378',
                  borderRadius: 4,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: dirty ? 'pointer' : 'default',
                }}
              >
                保存
              </button>
            )}
          </div>
        </div>

        {selectedPath ? (
          <textarea
            value={editContent}
            onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
            style={{
              flex: 1,
              background: '#0f1117',
              border: '1px solid #2a2e3a',
              borderRadius: 6,
              color: '#e4e7ed',
              padding: 12,
              fontSize: 12,
              fontFamily: 'monospace',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
            }}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5c6378', fontSize: 13 }}>
            点击左侧文件查看内容
          </div>
        )}
      </div>
    </div>
  );
}
