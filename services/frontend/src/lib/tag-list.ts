/**
 * Pure utility functions for managing tag lists (string arrays).
 * Used by tag-based selectors: Segment, Event, CompareBy, MeasureBy.
 */

/**
 * Adds an item to the list if not already present (idempotent).
 * Returns a new array — never mutates the input.
 */
export function addTag(list: string[], item: string): string[] {
  if (list.includes(item)) {
    return list;
  }
  return [...list, item];
}

/**
 * Removes an item from the list.
 * Returns a new array — never mutates the input.
 */
export function removeTag(list: string[], item: string): string[] {
  return list.filter((t) => t !== item);
}

/**
 * Prevents removal if the resulting list would have fewer than `min` items.
 * Returns the list unchanged when removal would violate the minimum,
 * otherwise delegates to `removeTag`.
 */
export function enforceMinimum(list: string[], item: string, min: number): string[] {
  if (list.length <= min) {
    return list;
  }
  return removeTag(list, item);
}
