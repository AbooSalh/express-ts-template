import { filterExcludedKeys } from "./filterExcludedKeys";

describe("Filter Excluded Keys", () => {
  it("should return an empty object if the input object is empty", () => {
    const data = {};
    const excludeKeys: string[] = ["a", "b"];
    expect(filterExcludedKeys(data, excludeKeys)).toEqual({});
  });

  it("should return the same object if excludeKeys is empty", () => {
    const data = { a: 1, b: "test", c: true };
    const excludeKeys: string[] = [];
    expect(filterExcludedKeys(data, excludeKeys)).toEqual(data);
  });

  it("should exclude the specified keys from the object", () => {
    const data = { a: 1, b: "test", c: true, d: { nested: "value" } };
    const excludeKeys = ["b", "d"];
    const expected = { a: 1, c: true };
    expect(filterExcludedKeys(data, excludeKeys)).toEqual(expected);
  });

  it("should return an empty object if all keys are excluded", () => {
    const data = { a: 1, b: "test" };
    const excludeKeys = ["a", "b"];
    expect(filterExcludedKeys(data, excludeKeys)).toEqual({});
  });

  it("should not modify the original object", () => {
    const data = { a: 1, b: "test", c: true };
    const originalData = { ...data };
    const excludeKeys = ["b"];
    filterExcludedKeys(data, excludeKeys);
    expect(data).toEqual(originalData);
  });

  it("should handle keys that are not present in the object gracefully", () => {
    const data = { a: 1, b: "test" };
    const excludeKeys = ["c", "d"];
    expect(filterExcludedKeys(data, excludeKeys)).toEqual(data);
  });

  it("should work with different data types in the object", () => {
    const data = {
      name: "John Doe",
      age: 30,
      isActive: false,
      metadata: { lastLogin: "2023-01-01" },
      hobbies: ["reading", "hiking"],
    };
    const excludeKeys = ["age", "hobbies"];
    const expected = {
      name: "John Doe",
      isActive: false,
      metadata: { lastLogin: "2023-01-01" },
    };
    expect(filterExcludedKeys(data, excludeKeys)).toEqual(expected);
  });
});
