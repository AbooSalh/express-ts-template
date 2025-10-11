// Simple object flattener for MongoDB dot notation
export function flattenToDotNotation(
  obj: Record<string, any>,
  prefix = "",
  res: Record<string, any> = {}
): Record<string, any> {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenToDotNotation(value, path, res);
    } else {
      res[path] = value;
    }
  }
  return res;
}
