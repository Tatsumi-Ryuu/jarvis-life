import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('jarvis', {
  platform: process.platform,
  isElectron: true,
  builtin: {
    getConfig: () => ipcRenderer.invoke('builtin:getConfig'),
  },
  aiProxy: {
    getConfig: () => ipcRenderer.invoke('aiProxy:getConfig'),
  },
  aiConfig: {
    load: () => ipcRenderer.sendSync('aiConfig:load'),
    save: (config: unknown) => ipcRenderer.sendSync('aiConfig:save', config),
    clear: () => ipcRenderer.sendSync('aiConfig:clear'),
  },
  save: {
    list: () => ipcRenderer.invoke('save:list'),
    load: (saveId: string) => ipcRenderer.invoke('save:load', saveId),
    write: (saveId: string, bundle: unknown) => ipcRenderer.invoke('save:write', saveId, bundle),
    delete: (saveId: string) => ipcRenderer.invoke('save:delete', saveId),
  },
  memory: {
    read: (saveId: string, role: string, filename: string) =>
      ipcRenderer.invoke('memory:read', saveId, role, filename),
    write: (saveId: string, role: string, filename: string, content: string) =>
      ipcRenderer.invoke('memory:write', saveId, role, filename, content),
    list: (saveId: string, role: string) =>
      ipcRenderer.invoke('memory:list', saveId, role),
    search: (saveId: string, role: string, query: string) =>
      ipcRenderer.invoke('memory:search', saveId, role, query),
    clearSave: (saveId: string) =>
      ipcRenderer.invoke('memory:clearSave', saveId),
  },
  storage: {
    readText: (path: string) =>
      ipcRenderer.invoke('storage:readText', path),
    writeText: (path: string, content: string, options?: { backup?: boolean }) =>
      ipcRenderer.invoke('storage:writeText', path, content, options),
    list: (path: string) =>
      ipcRenderer.invoke('storage:list', path),
    exists: (path: string) =>
      ipcRenderer.invoke('storage:exists', path),
    delete: (path: string) =>
      ipcRenderer.invoke('storage:delete', path),
    searchText: (path: string, query: string) =>
      ipcRenderer.invoke('storage:searchText', path, query),
  },
});
