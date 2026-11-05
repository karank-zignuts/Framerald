import { describe, expect, it } from "vitest";
import { projectFieldSchema, projectNameSchema } from "./schemas";

describe("projectNameSchema", () => {
  it("trims, and needs 1 to 80 characters", () => {
    expect(projectNameSchema.parse({ name: "  Night chase " }).name).toBe("Night chase");
    expect(projectNameSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(projectNameSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
  });
});

describe("projectFieldSchema", () => {
  it("is optional, a uuid, or null for 'no project'", () => {
    expect(projectFieldSchema.parse(undefined)).toBeUndefined();
    expect(projectFieldSchema.parse(null)).toBeNull();
    expect(projectFieldSchema.parse("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111");
    expect(projectFieldSchema.safeParse("nope").success).toBe(false);
  });
});
