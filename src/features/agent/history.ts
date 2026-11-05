import type { ShotList } from "./schemas";

export type StoredMessage = {
  role: "user" | "assistant";
  text: string;
  shotList: ShotList | null;
  error: string | null;
};

export type Content = { role: "user" | "model"; parts: { text: string }[] };

/** Only this many recent messages go to the model. Keeps long chats cheap and inside the context window. */
export const MAX_HISTORY_MESSAGES = 40;

/** A shot list as the plain text the model sees on later turns (never a function call). */
function describeShotList(list: ShotList): string {
  const lines = list.shots.map((s, i) => {
    const label = s.label ? `[${s.label}] ` : "";
    const notes = s.notes ? ` Notes: ${s.notes}` : "";
    return `${i + 1}. ${label}${s.prompt} (${s.aspectRatio})${notes}`;
  });
  return `Shot list "${list.title}":\n${lines.join("\n")}`;
}

function textOf(m: StoredMessage): string {
  const parts = [m.text.trim()];
  if (m.shotList) parts.push(describeShotList(m.shotList));
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Turns saved messages into the turns we send to Gemini. Failed replies are
 * skipped, only the latest messages are kept, the first turn is always the
 * user's, and neighbours with the same role are merged (the API wants
 * alternating turns).
 */
export function buildContents(messages: StoredMessage[]): Content[] {
  const usable = messages
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("model" as const), text: textOf(m) }))
    .filter((m) => m.text.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);

  while (usable.length > 0 && usable[0].role !== "user") usable.shift();

  const merged: Content[] = [];
  for (const m of usable) {
    const last = merged.at(-1);
    if (last && last.role === m.role) last.parts[0].text += `\n\n${m.text}`;
    else merged.push({ role: m.role, parts: [{ text: m.text }] });
  }
  return merged;
}
