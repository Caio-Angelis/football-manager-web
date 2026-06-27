import { describe, it, expect } from 'vitest';
import { actionSchemas } from '../validation/schemas.js';

describe('actionSchemas', () => {
  it('validates selectTeam args', () => {
    const schema = actionSchemas['selectTeam'];
    expect(schema.safeParse(['t001']).success).toBe(true);
    expect(schema.safeParse([]).success).toBe(false);
    expect(schema.safeParse([123]).success).toBe(false);
  });

  it('validates saveGame args (slot 1 or 2)', () => {
    const schema = actionSchemas['saveGame'];
    expect(schema.safeParse([1]).success).toBe(true);
    expect(schema.safeParse([2]).success).toBe(true);
    expect(schema.safeParse([3]).success).toBe(false);
  });

  it('validates advanceWeek (no args)', () => {
    const schema = actionSchemas['advanceWeek'];
    expect(schema.safeParse([]).success).toBe(true);
    expect(schema.safeParse(['extra']).success).toBe(false);
  });

  it('validates applyMatchIntervention', () => {
    const schema = actionSchemas['applyMatchIntervention'];
    expect(schema.safeParse([0, 'substitution']).success).toBe(true);
    expect(schema.safeParse([0, 'invalid']).success).toBe(false);
  });
});
