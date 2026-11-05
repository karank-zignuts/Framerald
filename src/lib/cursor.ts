// Opaque cursor for "newest first" lists ordered by (created_at desc, id desc).

export type CursorPosition = { createdAt: string; id: string };

// Strict shapes: the decoded values go into a PostgREST filter string, so
// anything that isn't a plain timestamp and uuid is refused.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(pos: CursorPosition): string {
  return Buffer.from(JSON.stringify(pos)).toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): CursorPosition | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof v?.createdAt !== "string" || typeof v?.id !== "string") return null;
    if (!TIMESTAMP.test(v.createdAt) || !UUID.test(v.id)) return null;
    return { createdAt: v.createdAt, id: v.id };
  } catch {
    return null;
  }
}
