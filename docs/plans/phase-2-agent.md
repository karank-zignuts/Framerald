# Plan: Phase 2, the Agent

Date: 2026-11-05. Done when: idea, to planned shots, to generated frames works in one flow (type an idea, get a shot list, send a shot to Image, generate it).

## What was confirmed with real calls

- `generateContentStream` works on Vertex with a function tool. For `gemini-3.8-flash` the stream is: text parts first, then a `functionCall` part, then the final chunk with `usageMetadata`. Thinking tokens are reported separately (`thoughtsTokenCount`) and billed as output.
- `gemini-3.5-flash` also works but is not on Google's price page and is not in the Gemini skill's current list. The agent default becomes `gemini-3.8-flash`.
- Price (Google's published Gemini API list, 2026-11-05): `gemini-3.8-flash` input $0.75 and output $3.75 per 1M tokens through 2026-12-31, then $1.50 and $7.50 from 2027-01-01. `gemini-3.1-pro-preview` $2 / $12 (prompts up to 200k).

## Design decisions (made without asking)

1. **Shot list arrives as a function call**, `propose_shot_list`, not as JSON mixed into prose. Prose streams to the browser as text; the shot list is validated with Zod and sent as its own event. No fragile parsing.
2. **History is flattened to text.** When replaying a thread to the model, a past shot list becomes a plain text summary, so we never replay function-call parts (thought signatures stay out of our storage).
3. **Transport is NDJSON over a streamed POST** (`{type:"text"|"shots"|"done"|"error"}` per line). Pure encode/parse functions, unit tested.
4. **Persistence:** user message saved before the model call; assistant message saved after the stream ends (text, shot list, token counts, model). If the stream fails, an assistant row with the partial text and an error note is saved so the thread stays consistent; errored rows are skipped when building history.
5. **Thread title** is the first 60 characters of the first message. No extra model call. Rename and soft delete are plain endpoints.
6. **Refine with agent** (Image Studio) is one non-streaming call that returns a better prompt. It is saved in a single thread called "Prompt refinements" (created on first use), so its tokens are logged like any other agent message.
7. **Send to Image** opens `/image?prompt=...&ratio=...`. Video studio does not exist, so shots are image frames, and the UI says so. **Refine this shot** puts the shot into the chat input (not auto-sent) so you can add an instruction.
8. **Cost:** tokens are priced per message from the model's price (with the 2027-01-01 change built in), written to `agent_messages.cost_usd` and as two `usage_events` rows (input_token, output_token). Unknown price means no row and a loud server log, never a guess.
9. **Migration:** widen `usage_events.cost_usd` and `agent_messages.cost_usd` to 6 decimals. Agent calls cost fractions of a cent and 4 decimals would distort them. Non-destructive (a wider numeric keeps every value).
10. Plain text replies, no markdown rendering (the system prompt asks for plain paragraphs and short lists), so no new dependency.

## Slices

| # | Slice | Verified by |
|---|---|---|
| A | Model and price schedule, token cost, shot schema and tool schema, history builder, NDJSON codec, prefill parser, migration | Vitest (tests first) |
| B | Agent AI wrapper (real and mock), system prompt file, agent service (threads, messages, stream, refine) | Vitest for pure parts, API e2e |
| C | Routes | API e2e with the mock |
| D | `/agent` page: thread list, conversation, streaming, shot cards | Playwright, screenshot, design loop |
| E | Image Studio: prefill, Refine with agent | Playwright |
| F | Full flow e2e, harden, build, review, docs, push | whole suite, build, review agent |

## Risks

| Risk | Handling |
|---|---|
| Stream drops midway | Partial text saved with an error note; UI shows it and a Try again |
| Model skips the tool or sends a bad shot list | Zod rejects it; the prose still shows and the UI says the plan couldn't be read |
| Double send | Send is disabled while a reply streams |
| Runaway history | Only the last 40 messages go to the model |
| Costs | Real calls limited to the confirmation calls above and one final smoke call |
