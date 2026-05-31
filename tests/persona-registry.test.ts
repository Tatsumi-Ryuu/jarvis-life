import { describe, it, expect } from 'vitest';
import { getPersona, getRoleForTask, PERSONAS } from '../src/engine/narrative/core/persona-registry';
import { AgentRole } from '../src/types';

describe('PERSONAS', () => {
  it('should define all roles', () => {
    expect(PERSONAS[AgentRole.COMPANION]).toBeDefined();
    expect(PERSONAS[AgentRole.EVALUATOR]).toBeDefined();
    expect(PERSONAS[AgentRole.NARRATOR]).toBeDefined();
    expect(PERSONAS[AgentRole.OPPONENT]).toBeDefined();
  });

  it('should have correct response formats', () => {
    expect(PERSONAS[AgentRole.COMPANION].responseFormat).toBe('chat');
    expect(PERSONAS[AgentRole.EVALUATOR].responseFormat).toBe('report');
    expect(PERSONAS[AgentRole.NARRATOR].responseFormat).toBe('narrative');
    expect(PERSONAS[AgentRole.OPPONENT].responseFormat).toBe('chat');
  });

  it('should have temperature settings', () => {
    expect(PERSONAS[AgentRole.COMPANION].temperature).toBe(0.85);
    expect(PERSONAS[AgentRole.EVALUATOR].temperature).toBe(0.6);
    expect(PERSONAS[AgentRole.NARRATOR].temperature).toBe(0.7);
    expect(PERSONAS[AgentRole.OPPONENT].temperature).toBe(0.75);
  });
});

describe('getPersona', () => {
  it('should return the correct persona for each role', () => {
    const companion = getPersona(AgentRole.COMPANION);
    expect(companion.role).toBe(AgentRole.COMPANION);

    const evaluator = getPersona(AgentRole.EVALUATOR);
    expect(evaluator.role).toBe(AgentRole.EVALUATOR);

    const narrator = getPersona(AgentRole.NARRATOR);
    expect(narrator.role).toBe(AgentRole.NARRATOR);

    const opponent = getPersona(AgentRole.OPPONENT);
    expect(opponent.role).toBe(AgentRole.OPPONENT);
  });
});

describe('getRoleForTask', () => {
  it('should map companion tasks correctly', () => {
    expect(getRoleForTask('dialogue')).toBe(AgentRole.COMPANION);
    expect(getRoleForTask('diary')).toBe(AgentRole.COMPANION);
    expect(getRoleForTask('farewell-letter')).toBe(AgentRole.COMPANION);
    expect(getRoleForTask('status-mood')).toBe(AgentRole.COMPANION);
    expect(getRoleForTask('test-thinking')).toBe(AgentRole.COMPANION);
    expect(getRoleForTask('test3-companion-turn')).toBe(AgentRole.COMPANION);
  });

  it('should map evaluator tasks correctly', () => {
    expect(getRoleForTask('test-evaluation')).toBe(AgentRole.EVALUATOR);
    expect(getRoleForTask('endgame-test-selection')).toBe(AgentRole.EVALUATOR);
    expect(getRoleForTask('verdict-report')).toBe(AgentRole.EVALUATOR);
    expect(getRoleForTask('mbti-assessment')).toBe(AgentRole.EVALUATOR);
    expect(getRoleForTask('character-portrait')).toBe(AgentRole.EVALUATOR);
  });

  it('should map narrator tasks correctly', () => {
    expect(getRoleForTask('chronicle')).toBe(AgentRole.NARRATOR);
    expect(getRoleForTask('scene-narration')).toBe(AgentRole.NARRATOR);
    expect(getRoleForTask('player-ending')).toBe(AgentRole.NARRATOR);
    expect(getRoleForTask('test3-scene-setup')).toBe(AgentRole.NARRATOR);
    expect(getRoleForTask('test3-opponent')).toBe(AgentRole.NARRATOR);
    expect(getRoleForTask('test3-scene-outcome')).toBe(AgentRole.NARRATOR);
  });

  it('should map opponent tasks correctly', () => {
    expect(getRoleForTask('test3-opponent-turn')).toBe(AgentRole.OPPONENT);
  });

  it('should default to companion for unknown tasks', () => {
    expect(getRoleForTask('unknown')).toBe(AgentRole.COMPANION);
  });
});
