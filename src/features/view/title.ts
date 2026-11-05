const LEAD = /^(an?|the|some|a close[- ]up of|a photo of|an image of|a picture of|a shot of)\s+/i;

/**
 * A short name for an image or clip, taken from the prompt that made it:
 * the first clause, up to six words, with a capital letter.
 */
export function titleFromPrompt(prompt: string | null | undefined): string {
  const text = (prompt ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Untitled";
  const clause = text.split(/[,.;:!?\n]/)[0].trim() || text;
  const stripped = clause.replace(LEAD, "") || clause;
  const words = stripped.split(" ").slice(0, 6).join(" ");
  const cut = words.length > 40 ? `${words.slice(0, 39).trimEnd()}…` : words;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}
