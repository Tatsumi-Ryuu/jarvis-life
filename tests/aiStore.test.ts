import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from '../src/store/aiStore';
import type { EventLogEntry } from '../src/types';
import { AgentRole } from '../src/types';
import { setCurrentSaveId } from '../src/services/save-service';

const mockEvent: EventLogEntry = {
  id: 'evt-001',
  timestamp: Date.now(),
  month: 1,
  type: 'action',
  summary: '小星去学校上课了。',
  tags: ['学习', 'knowledge'],
  emotionalImpact: 4,
  technical: { actionId: 'study', apCost: 2 },
};

const mockEvent2: EventLogEntry = {
  id: 'evt-002',
  timestamp: Date.now(),
  month: 1,
  type: 'action',
  summary: '小星去公园散步。',
  tags: ['休闲'],
  emotionalImpact: 2,
};

describe('aiStore', () => {
  beforeEach(() => {
    setCurrentSaveId(null);
    useAIStore.getState().clearAll();
  });

  describe('appendEvent', () => {
    it('should append an event to the log', () => {
      useAIStore.getState().appendEvent(mockEvent);
      expect(useAIStore.getState().eventLog).toHaveLength(1);
      expect(useAIStore.getState().eventLog[0].id).toBe('evt-001');
    });

    it('should stamp new events with the current save id', () => {
      setCurrentSaveId('save-current-session');

      useAIStore.getState().appendEvent(mockEvent);

      expect(useAIStore.getState().eventLog[0].saveId).toBe('save-current-session');
    });

    it('should append multiple events in order', () => {
      useAIStore.getState().appendEvent(mockEvent);
      useAIStore.getState().appendEvent(mockEvent2);
      const log = useAIStore.getState().eventLog;
      expect(log).toHaveLength(2);
      expect(log[0].id).toBe('evt-001');
      expect(log[1].id).toBe('evt-002');
    });
  });

  describe('appendEvents', () => {
    it('should append multiple events at once', () => {
      useAIStore.getState().appendEvents([mockEvent, mockEvent2]);
      expect(useAIStore.getState().eventLog).toHaveLength(2);
    });
  });

  describe('updateEventTechnical', () => {
    it('should merge technical details into an existing event', () => {
      useAIStore.getState().appendEvent(mockEvent);

      useAIStore.getState().updateEventTechnical('evt-001', {
        eventAnalysis: { relationshipSignal: '更信任玩家' },
        memoryTags: ['信任'],
      });

      expect(useAIStore.getState().eventLog).toHaveLength(1);
      expect(useAIStore.getState().eventLog[0].technical).toEqual({
        actionId: 'study',
        apCost: 2,
        eventAnalysis: { relationshipSignal: '更信任玩家' },
        memoryTags: ['信任'],
      });
    });
  });

  describe('updateCursor', () => {
    it('should update cursor for a role', () => {
      useAIStore.getState().appendEvent(mockEvent);
      useAIStore.getState().appendEvent(mockEvent2);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 1);

      const cursor = useAIStore.getState().roleCursors[AgentRole.COMPANION];
      expect(cursor.lastSeenEventIndex).toBe(1);
      expect(cursor.syncedAt).toBeGreaterThan(0);
    });

    it('should not affect other roles cursors', () => {
      useAIStore.getState().appendEvent(mockEvent);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 0);

      const evaluatorCursor = useAIStore.getState().roleCursors[AgentRole.EVALUATOR];
      expect(evaluatorCursor.lastSeenEventIndex).toBe(-1);
    });
  });

  describe('getUnreadEvents', () => {
    it('should return all events when cursor is at -1', () => {
      useAIStore.getState().appendEvents([mockEvent, mockEvent2]);
      const unread = useAIStore.getState().getUnreadEvents(AgentRole.COMPANION);
      expect(unread).toHaveLength(2);
    });

    it('should return only new events after cursor', () => {
      useAIStore.getState().appendEvents([mockEvent, mockEvent2]);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 0);

      const unread = useAIStore.getState().getUnreadEvents(AgentRole.COMPANION);
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe('evt-002');
    });

    it('should not return events from another save', () => {
      setCurrentSaveId('save-current-session');
      useAIStore.getState().appendEvents([
        { ...mockEvent, id: 'evt-current', saveId: 'save-current-session' },
        { ...mockEvent2, id: 'evt-other', saveId: 'save-other-session' },
      ]);

      const unread = useAIStore.getState().getUnreadEvents(AgentRole.COMPANION);

      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe('evt-current');
    });

    it('should return empty array when cursor is up to date', () => {
      useAIStore.getState().appendEvents([mockEvent]);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 0);

      const unread = useAIStore.getState().getUnreadEvents(AgentRole.COMPANION);
      expect(unread).toHaveLength(0);
    });

    it('should track different cursors per role independently', () => {
      useAIStore.getState().appendEvents([mockEvent, mockEvent2]);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 1);
      useAIStore.getState().updateCursor(AgentRole.EVALUATOR, 0);

      expect(useAIStore.getState().getUnreadEvents(AgentRole.COMPANION)).toHaveLength(0);
      expect(useAIStore.getState().getUnreadEvents(AgentRole.EVALUATOR)).toHaveLength(1);
    });
  });

  describe('narrativeCache', () => {
    it('should cache a narrative entry', () => {
      useAIStore.getState().cacheNarrative({
        id: 'diary-3',
        taskType: 'diary',
        role: AgentRole.COMPANION,
        content: '今天很开心。',
        timestamp: Date.now(),
      });

      expect(useAIStore.getState().narrativeCache).toHaveLength(1);
    });

    it('should retrieve cached narrative by type and id', () => {
      useAIStore.getState().cacheNarrative({
        id: 'diary-3',
        taskType: 'diary',
        role: AgentRole.COMPANION,
        content: '今天很开心。',
        timestamp: Date.now(),
      });

      const cached = useAIStore.getState().getCachedNarrative('diary', 'diary-3');
      expect(cached).toBeDefined();
      expect(cached!.content).toBe('今天很开心。');
    });

    it('should return undefined for non-existent cache entry', () => {
      const cached = useAIStore.getState().getCachedNarrative('diary', 'nonexistent');
      expect(cached).toBeUndefined();
    });
  });

  describe('error and loading state', () => {
    it('should track generating state', () => {
      expect(useAIStore.getState().isGenerating).toBe(false);
      useAIStore.getState().setGenerating(true);
      expect(useAIStore.getState().isGenerating).toBe(true);
    });

    it('should track error state', () => {
      expect(useAIStore.getState().lastError).toBeNull();
      useAIStore.getState().setError('API timeout');
      expect(useAIStore.getState().lastError).toBe('API timeout');
      useAIStore.getState().setError(null);
      expect(useAIStore.getState().lastError).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should reset all state to initial', () => {
      useAIStore.getState().appendEvent(mockEvent);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 0);
      useAIStore.getState().setGenerating(true);
      useAIStore.getState().setError('test');

      useAIStore.getState().clearAll();

      expect(useAIStore.getState().eventLog).toHaveLength(0);
      expect(useAIStore.getState().roleCursors[AgentRole.COMPANION].lastSeenEventIndex).toBe(-1);
      expect(useAIStore.getState().isGenerating).toBe(false);
      expect(useAIStore.getState().lastError).toBeNull();
      expect(useAIStore.getState().narrativeCache).toHaveLength(0);
    });
  });

  describe('replaceConversationLog', () => {
    it('should replace the entire conversation log', () => {
      useAIStore.getState().appendConversation({
        id: 'conv-1',
        saveId: 'save-test-1',
        month: 1,
        timestamp: Date.now(),
        role: 'player',
        content: '你好',
        source: 'talk-modal',
      });

      useAIStore.getState().replaceConversationLog([]);
      expect(useAIStore.getState().conversationLog).toHaveLength(0);
    });
  });
});
