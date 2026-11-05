import { describe, expect, it } from "vitest";
import { createEventParser, encodeEvent, type AgentEvent } from "./stream";

describe("agent event stream", () => {
  const events: AgentEvent[] = [
    { type: "text", delta: "Hello" },
    { type: "text", delta: " there\nsecond line" }, // newline inside the text must not break framing
    { type: "error", message: "boom" },
  ];

  it("encodes one event per line", () => {
    const wire = events.map(encodeEvent).join("");
    expect(wire.split("\n").filter(Boolean)).toHaveLength(3);
    expect(wire.endsWith("\n")).toBe(true);
  });

  it("parses events that arrive in one chunk", () => {
    const p = createEventParser();
    expect(p.push(events.map(encodeEvent).join(""))).toEqual(events);
  });

  it("parses an event split across chunks", () => {
    const wire = encodeEvent(events[1]);
    const p = createEventParser();
    expect(p.push(wire.slice(0, 10))).toEqual([]);
    expect(p.push(wire.slice(10))).toEqual([events[1]]);
  });

  it("holds back an unfinished last line until it completes", () => {
    const p = createEventParser();
    const a = encodeEvent(events[0]);
    const b = encodeEvent(events[2]);
    expect(p.push(a + b.slice(0, 5))).toEqual([events[0]]);
    expect(p.push(b.slice(5))).toEqual([events[2]]);
  });

  it("turns a line that isn't a valid event into an error event instead of throwing", () => {
    const p = createEventParser();
    expect(p.push("not json\n")).toEqual([{ type: "error", message: "The reply came through garbled. Try again." }]);
    expect(p.push('{"type":"mystery"}\n')).toEqual([{ type: "error", message: "The reply came through garbled. Try again." }]);
  });
});
