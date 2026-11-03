import { describe, expect, it } from 'vitest';
import { isValidDateString, parseDuration, validateName, validateProjectInput, validateTaskInput } from './validation';

describe('validateName', () => {
  it('trims and enforces 1..50 chars', () => {
    expect(validateName('')).toBe('name_required');
    expect(validateName('   ')).toBe('name_required');
    expect(validateName('a')).toBeNull();
    expect(validateName('가'.repeat(50))).toBeNull();
    expect(validateName(`  ${'가'.repeat(50)}  `)).toBeNull();
    expect(validateName('가'.repeat(51))).toBe('name_too_long');
  });
});

describe('parseDuration', () => {
  it('accepts integers 1..999', () => {
    expect(parseDuration(1)).toBe(1);
    expect(parseDuration(999)).toBe(999);
    expect(parseDuration('3')).toBe(3);
    expect(parseDuration(' 12 ')).toBe(12);
  });
  it('rejects 0, negative, decimal, empty, out of range, non-numeric', () => {
    for (const v of [0, -1, 1.5, 1000, Number.NaN, '', '  ', '0', '-2', '2.5', 'abc', '1e2', '1000']) {
      expect(parseDuration(v)).toBeNull();
    }
  });
});

describe('isValidDateString', () => {
  it('accepts real dates including leap day', () => {
    expect(isValidDateString('2026-12-01')).toBe(true);
    expect(isValidDateString('2028-02-29')).toBe(true);
  });
  it('rejects non-existent or malformed dates', () => {
    for (const v of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-00-10', '2026-1-1', '', '2026/12/01']) {
      expect(isValidDateString(v)).toBe(false);
    }
  });
});

describe('validateProjectInput', () => {
  it('normalizes valid input', () => {
    const r = validateProjectInput({ name: ' 이사 준비 ', description: '  ', startDate: '2026-12-01' });
    expect(r).toEqual({ ok: true, value: { name: '이사 준비', description: undefined, startDate: '2026-12-01' } });
  });
  it('reports each invalid field', () => {
    const r = validateProjectInput({ name: '   ', startDate: '2026-02-30' });
    expect(r).toEqual({ ok: false, errors: { name: 'name_required', startDate: 'start_date_invalid' } });
  });
});

describe('validateTaskInput', () => {
  it('requires only name and duration', () => {
    const r = validateTaskInput({ name: '기획', durationDays: '3' });
    expect(r).toEqual({ ok: true, value: { name: '기획', description: undefined, durationDays: 3, predecessorIds: [] } });
  });
  it('dedupes predecessor ids', () => {
    const r = validateTaskInput({ name: 'x', durationDays: 1, predecessorIds: ['a', 'a', 'b'] });
    expect(r.ok && r.value.predecessorIds).toEqual(['a', 'b']);
  });
  it('reports invalid name and duration', () => {
    expect(validateTaskInput({ name: ' ', durationDays: '' })).toEqual({
      ok: false,
      errors: { name: 'name_required', durationDays: 'duration_invalid' },
    });
  });
});
