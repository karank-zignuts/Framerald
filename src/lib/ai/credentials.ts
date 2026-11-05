export type ServiceAccountKey = { client_email: string; private_key: string; [field: string]: unknown };

const HOW_TO =
  "GOOGLE_SERVICE_ACCOUNT_KEY_B64 isn't base64 of a service account JSON key. Make it with: base64 -i key.json | tr -d '\\n'";

/**
 * Reads the service account key from its base64 form (how it is stored in an
 * environment variable). Line breaks and spaces from pasting are ignored. Error
 * messages say what is wrong but never include the key.
 */
export function parseServiceAccountKey(b64: string): ServiceAccountKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(b64.replace(/\s+/g, ""), "base64").toString("utf8"));
  } catch {
    throw new Error(HOW_TO);
  }
  if (!parsed || typeof parsed !== "object") throw new Error(HOW_TO);
  const key = parsed as Record<string, unknown>;
  for (const field of ["client_email", "private_key"]) {
    if (typeof key[field] !== "string" || !key[field]) {
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY_B64 is missing "${field}". Use a service account key (type service_account).`);
    }
  }
  return key as ServiceAccountKey;
}
