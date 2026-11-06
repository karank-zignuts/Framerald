import { describe, expect, it } from "vitest";
import { defaultProjectName } from "./name";

describe("defaultProjectName", () => {
  it("is the month, day and time", () => {
    expect(defaultProjectName(new Date(2026, 10, 5, 16, 38))).toBe("Nov 05 - 16:38");
    expect(defaultProjectName(new Date(2026, 0, 9, 7, 4))).toBe("Jan 09 - 07:04");
  });
});
