import type { FilterChange } from '@lib/schemas/chat';
import type { SearchFilters } from '@lib/schemas/search';

/** Filter fields that hold lists of TMDb ids. */
const LIST_FIELDS = ['keywordIds', 'genreIds'] as const;

/** Filter fields that hold a single scalar value. */
const SCALAR_FIELDS = ['mediaType', 'minRating', 'minYear', 'maxYear', 'sortBy'] as const;

/** Optional scalar fields; only these support the remove operation. */
const OPTIONAL_SCALAR_FIELDS = ['minRating', 'minYear', 'maxYear'] as const;

type ListField = (typeof LIST_FIELDS)[number];
type ScalarField = (typeof SCALAR_FIELDS)[number];

/** All search filter fields an intent change may target. */
export type SearchFilterField = ListField | ScalarField;

/** Outcome of applying a single intent change to the candidate filters. */
export type ChangeApplication =
  | { ok: true }
  | { ok: false; reason: 'unknown-field' | 'invalid-operation' | 'invalid-value' };

/**
 * Checks whether a field is a list field (keyword or genre ids).
 * @param field The intent change field name.
 * @returns True when the field holds a list of ids.
 */
function isListField(field: string): field is ListField {
  return (LIST_FIELDS as readonly string[]).includes(field);
}

/**
 * Checks whether a field is a scalar filter field.
 * @param field The intent change field name.
 * @returns True when the field holds a single value.
 */
function isScalarField(field: string): field is ScalarField {
  return (SCALAR_FIELDS as readonly string[]).includes(field);
}

/**
 * Checks whether a field is an optional scalar field.
 * @param field The intent change field name.
 * @returns True when the field is optional and scalar.
 */
function isOptionalScalarField(field: string): field is (typeof OPTIONAL_SCALAR_FIELDS)[number] {
  return (OPTIONAL_SCALAR_FIELDS as readonly string[]).includes(field);
}

/**
 * Reads the id list from a change value and validates its shape. Allowed
 * value ranges and list sizes remain the responsibility of the schema
 * validation in applyIntent.
 * @param value The raw change value.
 * @returns The validated ids, or null when the value is not a list of positive integers.
 */
function readIdList(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const ids: number[] = [];
  for (const entry of value) {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry <= 0) return null;
    ids.push(entry);
  }
  return ids;
}

/**
 * Applies a list change (add merges without duplicates, remove deletes the
 * listed ids, set and replace the entire list).
 * @param candidate Mutable candidate filters; never the caller's original object.
 * @param field The list field to modify.
 * @param operation The filter operation.
 * @param ids Validated ids from the change value.
 */
function applyListChange(
  candidate: SearchFilters,
  field: ListField,
  operation: FilterChange['operation'],
  ids: number[],
): void {
  if (operation === 'set' || operation === 'replace') {
    candidate[field] = [...ids];
    return;
  }
  if (operation === 'add') {
    const existing = new Set(candidate[field]);
    const merged = [...candidate[field]];
    for (const id of ids) {
      if (!existing.has(id)) {
        merged.push(id);
        existing.add(id);
      }
    }
    candidate[field] = merged;
    return;
  }
  const removed = new Set(ids);
  candidate[field] = candidate[field].filter((id) => !removed.has(id));
}

/**
 * Applies a scalar set operation with a per-field type check. Enum values
 * and ranges remain the responsibility of the schema validation.
 * @param candidate Mutable candidate filters.
 * @param field The scalar field to set.
 * @param value The raw change value.
 * @returns True when the value type matches the field.
 */
function applyScalarSet(candidate: SearchFilters, field: ScalarField, value: unknown): boolean {
  switch (field) {
    case 'mediaType':
    case 'sortBy':
      if (typeof value !== 'string') return false;
      candidate[field] = value;
      return true;
    case 'minRating':
      if (typeof value !== 'number') return false;
      candidate.minRating = value;
      return true;
    case 'minYear':
    case 'maxYear':
      if (typeof value !== 'number' || !Number.isInteger(value)) return false;
      candidate[field] = value;
      return true;
  }
}

/**
 * Applies one intent change to a mutable candidate copy of the search
 * filters. The change is applied in place; range and enum validation of the
 * resulting filters happens in applyIntent through the Zod schema.
 * @param candidate Mutable candidate filters; never the caller's original object.
 * @param change The single change to apply.
 * @returns The application outcome; see {@link ChangeApplication}.
 */
export function applyChangeTo(candidate: SearchFilters, change: FilterChange): ChangeApplication {
  if (isListField(change.field)) {
    if (
      change.operation !== 'set' &&
      change.operation !== 'replace' &&
      change.operation !== 'add' &&
      change.operation !== 'remove'
    ) {
      return { ok: false, reason: 'invalid-operation' };
    }
    const ids = readIdList(change.value);
    if (ids === null) {
      return { ok: false, reason: 'invalid-value' };
    }
    applyListChange(candidate, change.field, change.operation, ids);
    return { ok: true };
  }

  if (isScalarField(change.field)) {
    if (change.operation === 'set' || change.operation === 'replace') {
      if (change.value === undefined) {
        return { ok: false, reason: 'invalid-value' };
      }
      if (!applyScalarSet(candidate, change.field, change.value)) {
        return { ok: false, reason: 'invalid-value' };
      }
      return { ok: true };
    }
    if (change.operation === 'remove') {
      if (!isOptionalScalarField(change.field)) {
        return { ok: false, reason: 'invalid-operation' };
      }
      switch (change.field) {
        case 'minRating':
          delete candidate.minRating;
          return { ok: true };
        case 'minYear':
          delete candidate.minYear;
          return { ok: true };
        case 'maxYear':
          delete candidate.maxYear;
          return { ok: true };
      }
    }
    return { ok: false, reason: 'invalid-operation' };
  }

  return { ok: false, reason: 'unknown-field' };
}
