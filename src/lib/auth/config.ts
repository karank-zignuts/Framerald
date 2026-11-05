import { deriveSessionKey } from "./session";

// Read straight from process.env, not from the validated env(): the proxy runs on
// every request and must not fail just because Supabase or Google aren't configured.

export type AuthConfig = { enabled: boolean; key: Buffer; password: string; cronSecret: string };

let cached: { signature: string; config: AuthConfig } | undefined;

/** The gate is on when APP_PASSWORD is set; empty means open, as for local use. */
export function authConfig(): AuthConfig {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  const signature = `${password}\0${secret}\0${cronSecret}`;
  if (cached?.signature !== signature) {
    cached = { signature, config: { enabled: password.length > 0, key: deriveSessionKey(password, secret), password, cronSecret } };
  }
  return cached.config;
}
