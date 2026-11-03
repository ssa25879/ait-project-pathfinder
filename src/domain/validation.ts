import { DURATION_MAX, DURATION_MIN, NAME_MAX_LENGTH, NAME_MIN_LENGTH } from './model';

export type FieldError = 'name_required' | 'name_too_long' | 'duration_invalid' | 'start_date_invalid';

export type ValidationResult<T, K extends string> =
  | { ok: true; value: T }
  | { ok: false; errors: Partial<Record<K, FieldError>> };

export type ProjectInput = { name: string; description?: string; startDate: string };
export type TaskInput = {
  name: string;
  description?: string;
  /** 폼 입력을 그대로 받을 수 있도록 문자열도 허용한다. */
  durationDays: number | string;
  predecessorIds?: string[];
};

export type NormalizedProjectInput = { name: string; description?: string; startDate: string };
export type NormalizedTaskInput = {
  name: string;
  description?: string;
  durationDays: number;
  predecessorIds: string[];
};

/** 앞뒤 공백 제거 후 1~50자(코드 포인트 기준)인지 확인한다. */
export function validateName(raw: string): FieldError | null {
  const name = (raw ?? '').trim();
  const length = [...name].length;
  if (length < NAME_MIN_LENGTH) return 'name_required';
  if (length > NAME_MAX_LENGTH) return 'name_too_long';
  return null;
}

/** 1~999 정수만 허용한다. 빈 값·소수·음수·숫자 아님은 null. */
export function parseDuration(raw: number | string): number | null {
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else {
    const s = (raw ?? '').trim();
    if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
    n = Number(s);
  }
  if (!Number.isInteger(n) || n < DURATION_MIN || n > DURATION_MAX) return null;
  return n;
}

/** 실제로 존재하는 YYYY-MM-DD 날짜인지 확인한다. */
export function isValidDateString(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function normalizeDescription(raw?: string): string | undefined {
  const d = (raw ?? '').trim();
  return d.length > 0 ? d : undefined;
}

export function validateProjectInput(
  input: ProjectInput,
): ValidationResult<NormalizedProjectInput, 'name' | 'startDate'> {
  const errors: Partial<Record<'name' | 'startDate', FieldError>> = {};
  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  if (!isValidDateString(input.startDate)) errors.startDate = 'start_date_invalid';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: input.name.trim(),
      description: normalizeDescription(input.description),
      startDate: input.startDate,
    },
  };
}

export function validateTaskInput(
  input: TaskInput,
): ValidationResult<NormalizedTaskInput, 'name' | 'durationDays'> {
  const errors: Partial<Record<'name' | 'durationDays', FieldError>> = {};
  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  const duration = parseDuration(input.durationDays);
  if (duration === null) errors.durationDays = 'duration_invalid';
  if (Object.keys(errors).length > 0 || duration === null) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: input.name.trim(),
      description: normalizeDescription(input.description),
      durationDays: duration,
      predecessorIds: [...new Set(input.predecessorIds ?? [])],
    },
  };
}
