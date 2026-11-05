import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

// One Vertex AI client per region per server process. Every image, video and
// agent call goes through here, so credentials never reach the browser.
// Some models (Veo) are not served from "global", so callers pass the region.
const clients = new Map<string, GoogleGenAI>();

export function vertex(location?: string): GoogleGenAI {
  const e = env();
  const region = location ?? e.GOOGLE_CLOUD_LOCATION;
  let client = clients.get(region);
  if (!client) {
    const key = e.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
    client = new GoogleGenAI({
      vertexai: true,
      project: e.GOOGLE_CLOUD_PROJECT,
      location: region,
      // On Vercel there is no gcloud login, so the key comes from env.
      // Locally, without a key, the SDK falls back to Application Default Credentials.
      ...(key
        ? {
            googleAuthOptions: {
              credentials: JSON.parse(Buffer.from(key, "base64").toString("utf8")),
            },
          }
        : {}),
    });
    clients.set(region, client);
  }
  return client;
}
