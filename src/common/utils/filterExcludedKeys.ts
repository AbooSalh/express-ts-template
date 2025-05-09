/**
 * Filters an object to exclude specific keys.
 * @param data - The object to filter.
 * @param excludeKeys - An array of keys to exclude from the object.
 * @returns A new object without the excluded keys.
 */
export function filterExcludedKeys<T extends Record<string, unknown>>(
  data: object,
  excludeKeys: (keyof T)[]
): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !excludeKeys.includes(key as keyof T)
    )
  ) as Partial<T>;
}
