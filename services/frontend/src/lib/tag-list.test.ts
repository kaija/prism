import { describe, it, expect } from "vitest";
import { addTag, removeTag, enforceMinimum } from "./tag-list";

describe("addTag", () => {
  it("adds an item to an empty list", () => {
    expect(addTag([], "a")).toEqual(["a"]);
  });

  it("appends to the end of an existing list", () => {
    expect(addTag(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  it("does not add a duplicate item", () => {
    const list = ["a", "b"];
    expect(addTag(list, "a")).toBe(list);
  });

  it("does not mutate the original list", () => {
    const list = ["a"];
    const result = addTag(list, "b");
    expect(list).toEqual(["a"]);
    expect(result).toEqual(["a", "b"]);
  });
});

describe("removeTag", () => {
  it("removes an existing item", () => {
    expect(removeTag(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("returns a new array when item is not found", () => {
    const list = ["a", "b"];
    const result = removeTag(list, "z");
    expect(result).toEqual(["a", "b"]);
    expect(result).not.toBe(list);
  });

  it("removes from a single-item list", () => {
    expect(removeTag(["a"], "a")).toEqual([]);
  });

  it("does not mutate the original list", () => {
    const list = ["a", "b"];
    removeTag(list, "a");
    expect(list).toEqual(["a", "b"]);
  });
});

describe("enforceMinimum", () => {
  it("prevents removal when list length equals min", () => {
    const list = ["a"];
    expect(enforceMinimum(list, "a", 1)).toBe(list);
  });

  it("prevents removal when list length is below min", () => {
    const list: string[] = [];
    expect(enforceMinimum(list, "a", 1)).toBe(list);
  });

  it("allows removal when list length exceeds min", () => {
    expect(enforceMinimum(["a", "b", "c"], "b", 1)).toEqual(["a", "c"]);
  });

  it("allows removal down to exactly min", () => {
    expect(enforceMinimum(["a", "b"], "b", 1)).toEqual(["a"]);
  });
});
