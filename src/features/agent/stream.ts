import { z } from "zod";
import { messageDtoSchema, shotListSchema } from "./schemas";

// One JSON object per line, flushed as it happens. Text can contain newlines
// because JSON escapes them, so a raw newline always means "end of event".

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("shots"), shotList: shotListSchema }),
  z.object({ type: z.literal("done"), message: messageDtoSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type AgentEvent = z.infer<typeof eventSchema>;

export const encodeEvent = (event: AgentEvent): string => `${JSON.stringify(event)}\n`;

const GARBLED: AgentEvent = { type: "error", message: "The reply came through garbled. Try again." };

/** Feed it chunks as they arrive; it returns the events completed so far. */
export function createEventParser() {
  let buffer = "";
  return {
    push(chunk: string): AgentEvent[] {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // the last piece may be unfinished
      const events: AgentEvent[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = eventSchema.safeParse(JSON.parse(line));
          events.push(parsed.success ? parsed.data : GARBLED);
        } catch {
          events.push(GARBLED);
        }
      }
      return events;
    },
  };
}
