import { describe, expect, it } from "vitest";
import { titleFromPrompt } from "./title";

describe("titleFromPrompt", () => {
  it("uses the first clause and drops a leading article", () => {
    expect(titleFromPrompt("A realistic alien in a dark forest, 35mm film")).toBe("Realistic alien in a dark forest");
  });
  it("keeps it to six words", () => {
    expect(titleFromPrompt("Glass beakers and test tubes on a brushed steel lab bench")).toBe("Glass beakers and test tubes on");
  });
  it("starts with a capital letter", () => {
    expect(titleFromPrompt("red door in a white wall")).toBe("Red door in a white wall");
  });
  it("cuts a very long run of long words", () => {
    const t = titleFromPrompt("extraordinarily-long-hyphenated-compound another extraordinarily-long-hyphenated-compound");
    expect(t.length).toBeLessThanOrEqual(40);
    expect(t.endsWith("…")).toBe(true);
  });
  it("copes with an empty prompt", () => {
    expect(titleFromPrompt("")).toBe("Untitled");
    expect(titleFromPrompt(null)).toBe("Untitled");
  });
});
