import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

// One Vertex AI client per server process. Every image, video and agent call
// goes through this client, so credentials never reach the browser.
let client: GoogleGenAI | undefined;

export function vertex(): GoogleGenAI {
  if (!client) {
    const e = env();
    const key = e.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
    client = new GoogleGenAI({
      vertexai: true,
      project: e.GOOGLE_CLOUD_PROJECT,
      location: e.GOOGLE_CLOUD_LOCATION,
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
  }
  return client;
}
