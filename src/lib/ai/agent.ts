import "server-only";
import { ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { shotListToolSchema } from "@/features/agent/schemas";
import type { Content } from "@/features/agent/history";
import type { TextUsage } from "./cost";
import { MODELS } from "./models";
import {
  AGENT_SYSTEM_PROMPT,
  REFINE_SYSTEM_PROMPT,
  SHOT_TOOL_DESCRIPTION,
  SHOT_TOOL_NAME,
} from "./agent-prompt";
import { vertex } from "./vertex";
import { isTransientError, withRetry } from "@/lib/retry";

export const AGENT_MODEL = MODELS.agent.default;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_REFINED_CHARS = 4000; // the Image studio's prompt limit

export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentError";
  }
}

export type AgentStreamEvent =
  | { type: "text"; delta: string }
  | { type: "shots"; shotList: unknown } // validated by the caller with shotListSchema
  | { type: "usage"; usage: TextUsage };

/** A message that is safe and useful to show the user. */
export function agentErrorMessage(error: unknown): string {
  if ((error as { status?: unknown })?.status === 429) {
    return "Google says too many requests are in flight. Wait a moment and try again.";
  }
  const message = error instanceof Error ? error.message : "";
  if (/timeout|timed out|aborted/i.test(message)) return "The agent took too long to answer. Try again.";
  if (message && message.length <= 300) return message;
  return "The agent hit an error. Try again.";
}

const mocking = () => process.env.E2E_MOCK_AI === "1" && process.env.NODE_ENV !== "production";

/** Streams the agent's reply: text as it is written, then the shot list if it proposes one, then token usage. */
export async function* streamAgentReply(contents: Content[]): AsyncGenerator<AgentStreamEvent> {
  if (mocking()) {
    yield* mockReply(contents);
    return;
  }

  const spec = AGENT_MODEL;
  try {
    const stream = await withRetry(
      () =>
        vertex(spec.location).models.generateContentStream({
          model: spec.id,
          contents,
          config: {
            systemInstruction: AGENT_SYSTEM_PROMPT,
            tools: [
              {
                functionDeclarations: [
                  { name: SHOT_TOOL_NAME, description: SHOT_TOOL_DESCRIPTION, parametersJsonSchema: shotListToolSchema },
                ],
              },
            ],
            // Planning shots takes craft, not long reasoning. Low thinking answers sooner and costs less.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            httpOptions: { timeout: REQUEST_TIMEOUT_MS },
          },
        }),
      { retries: 2, delayMs: 1500, isRetryable: isTransientError },
    );

    for await (const chunk of stream) {
      for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
        if (part.thought) continue;
        if (part.functionCall?.name === SHOT_TOOL_NAME) yield { type: "shots", shotList: part.functionCall.args };
        else if (part.text) yield { type: "text", delta: part.text };
      }
      // Yielded as it arrives, so a stream that dies midway still reports the tokens seen so far.
      if (chunk.usageMetadata) yield { type: "usage", usage: chunk.usageMetadata };
    }
  } catch (error) {
    throw new AgentError(agentErrorMessage(error));
  }
}

const refineResultSchema = z.object({ prompt: z.string().trim().min(1) });

/** One non-streaming call that returns a better version of an image prompt. */
export async function refinePrompt(input: {
  prompt: string;
  aspectRatio?: string;
}): Promise<{ prompt: string; usage: TextUsage }> {
  if (mocking()) {
    return {
      prompt: `${input.prompt}, shot on 35mm, soft cinematic lighting, shallow depth of field`,
      usage: { promptTokenCount: 90, candidatesTokenCount: 60, thoughtsTokenCount: 0 },
    };
  }

  const spec = AGENT_MODEL;
  const text = input.aspectRatio ? `${input.prompt}\n\nAspect ratio: ${input.aspectRatio}` : input.prompt;
  try {
    const res = await withRetry(
      () =>
        vertex(spec.location).models.generateContent({
          model: spec.id,
          contents: [{ role: "user", parts: [{ text }] }],
          config: {
            systemInstruction: REFINE_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(refineResultSchema, { target: "draft-7" }),
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            httpOptions: { timeout: REQUEST_TIMEOUT_MS },
          },
        }),
      { retries: 2, delayMs: 1500, isRetryable: isTransientError },
    );
    const parsed = refineResultSchema.safeParse(JSON.parse(res.text ?? "null"));
    if (!parsed.success) throw new Error("The agent didn't return a prompt.");
    return { prompt: parsed.data.prompt.slice(0, MAX_REFINED_CHARS), usage: res.usageMetadata ?? {} };
  } catch (error) {
    throw new AgentError(agentErrorMessage(error));
  }
}

// ─── e2e mock ────────────────────────────────────────────────────────────────
// Deterministic, instant, free. Streams in pieces with a small pause so the UI
// can show a reply arriving. "[fail]" in the message fails; "[noshots]" skips the list.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function* mockReply(contents: Content[]): AsyncGenerator<AgentStreamEvent> {
  // Neighbouring user messages are merged with a blank line, so the newest one is the last paragraph.
  const last = ([...contents].reverse().find((c) => c.role === "user")?.parts[0]?.text ?? "").split("\n\n").at(-1) ?? "";
  if (last.includes("[fail]")) throw new AgentError("Mock failure: the message asked for it.");

  const pause = last.includes("[slow]") ? 700 : 40; // "[slow]" lets a test press Stop mid-reply
  const idea = last.replace(/\[noshots\]|\[slow\]/g, "").trim().slice(0, 80);
  const pieces = [`Here is a plan for "${idea}". `, "It opens wide to set the place, ", "then moves in to the detail that carries the mood."];
  for (const piece of pieces) {
    yield { type: "text", delta: piece };
    await sleep(pause);
  }

  if (!last.includes("[noshots]")) {
    yield {
      type: "shots",
      shotList: {
        title: `Plan: ${idea.slice(0, 40)}`,
        shots: [
          { label: "Establishing", prompt: `${idea}, wide establishing shot, 24mm, dusk light`, aspectRatio: "16:9", notes: "Opens the sequence" },
          { label: "Medium", prompt: `${idea}, medium shot, 50mm, soft side light`, aspectRatio: "16:9" },
          { label: "Detail", prompt: `${idea}, extreme close-up of a telling detail, 100mm macro`, aspectRatio: "16:9", notes: "The shot to hold on" },
        ],
      },
    };
  }
  yield { type: "usage", usage: { promptTokenCount: 120, candidatesTokenCount: 200, thoughtsTokenCount: 80 } };
}
