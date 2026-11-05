import { describe, expect, it } from "vitest";
import { BUILTIN_PRESETS, applyPresets, createPresetSchema, type PresetTemplate } from "./templates";

const dolly: PresetTemplate = { id: "a", name: "Slow dolly in", group: "camera", template: "slow dolly in toward the subject" };
const noir: PresetTemplate = { id: "b", name: "Film noir", group: "style", template: "{prompt}, shot as black and white film noir, hard shadows" };

describe("applyPresets", () => {
  it("returns the trimmed prompt when no preset is chosen", () => {
    expect(applyPresets("  a red door ", [])).toBe("a red door");
  });
  it("appends a plain template after a comma", () => {
    expect(applyPresets("a red door", [dolly])).toBe("a red door, slow dolly in toward the subject");
  });
  it("puts the prompt inside a template that uses {prompt}", () => {
    expect(applyPresets("a red door", [noir])).toBe("a red door, shot as black and white film noir, hard shadows");
  });
  it("applies several presets in order", () => {
    expect(applyPresets("a red door", [dolly, noir])).toBe(
      "a red door, slow dolly in toward the subject, shot as black and white film noir, hard shadows",
    );
  });
  it("keeps dollar signs in the prompt exactly as typed", () => {
    expect(applyPresets("costs $& and $1 and $' and $`", [noir])).toBe("costs $& and $1 and $' and $`, shot as black and white film noir, hard shadows");
  });
  it("doesn't leave doubled punctuation after a sentence end", () => {
    expect(applyPresets("A red door.", [dolly])).toBe("A red door, slow dolly in toward the subject");
    expect(applyPresets("A red door,", [dolly])).toBe("A red door, slow dolly in toward the subject");
  });
});

describe("built-in presets", () => {
  it("has unique ids and sane templates", () => {
    const ids = BUILTIN_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of BUILTIN_PRESETS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.template.length).toBeGreaterThan(5);
      expect(p.template.length).toBeLessThanOrEqual(300);
      expect(["camera", "style"]).toContain(p.group);
    }
  });
  it("has both camera moves and styles, and camera moves are for video only", () => {
    expect(BUILTIN_PRESETS.filter((p) => p.group === "camera").length).toBeGreaterThanOrEqual(6);
    expect(BUILTIN_PRESETS.filter((p) => p.group === "style").length).toBeGreaterThanOrEqual(6);
    for (const p of BUILTIN_PRESETS.filter((p) => p.group === "camera")) expect(p.kinds).toEqual(["video"]);
    for (const p of BUILTIN_PRESETS.filter((p) => p.group === "style")) expect(p.kinds).toEqual(["image", "video"]);
  });
});

describe("createPresetSchema", () => {
  it("accepts a name, group, kinds and a template", () => {
    const r = createPresetSchema.parse({ name: "  My look ", group: "style", kinds: ["image"], template: " grainy 16mm " });
    expect(r).toMatchObject({ name: "My look", template: "grainy 16mm" });
  });
  it("refuses empty or oversize fields", () => {
    expect(createPresetSchema.safeParse({ name: " ", group: "style", kinds: ["image"], template: "x" }).success).toBe(false);
    expect(createPresetSchema.safeParse({ name: "a", group: "style", kinds: ["image"], template: "x".repeat(301) }).success).toBe(false);
    expect(createPresetSchema.safeParse({ name: "a", group: "style", kinds: [], template: "x" }).success).toBe(false);
  });
});
