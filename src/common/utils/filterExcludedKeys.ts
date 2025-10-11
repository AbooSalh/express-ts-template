// Ultra-simple key filter utility
export function filterExcludedKeys<T extends Record<string, unknown>>(
  data: object,
  excludeKeys: (keyof T)[]
): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !excludeKeys.includes(key as keyof T))
  ) as Partial<T>;
}
export default filterExcludedKeys;