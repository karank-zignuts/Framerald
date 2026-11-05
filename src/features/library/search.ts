const MAX_SEARCH = 100;

/** The search text as typed, tidied. Null means there is no search. */
export function normalizeSearch(raw: string | null | undefined): string | null {
  const text = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH);
  return text.length > 0 ? text : null;
}

/**
 * An ILIKE pattern that matches the text anywhere. `%`, `_` and `\` are escaped
 * so they match themselves. It is passed to supabase-js's `.ilike()` as a value,
 * never built into a filter string, so commas and brackets can't change the query.
 */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}
