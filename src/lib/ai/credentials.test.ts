import { describe, expect, it } from "vitest";
import { parseServiceAccountKey } from "./credentials";

const key = { type: "service_account", project_id: "p", client_email: "svc@p.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n" };
const b64 = (v: unknown) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64");

describe("parseServiceAccountKey", () => {
  it("reads a base64 service account key", () => {
    const parsed = parseServiceAccountKey(b64(key));
    expect(parsed.client_email).toBe(key.client_email);
    expect(parsed.private_key).toContain("BEGIN PRIVATE KEY");
  });

  it("tolerates the line breaks and spaces people paste around it", () => {
    const wrapped = b64(key).replace(/(.{40})/g, "$1\n") + "\n  ";
    expect(parseServiceAccountKey(wrapped).client_email).toBe(key.client_email);
  });

  it("explains how to make it when it isn't base64 JSON", () => {
    expect(() => parseServiceAccountKey("not base64 json!!")).toThrow(/base64 -i key\.json/);
    expect(() => parseServiceAccountKey(b64("just text"))).toThrow(/base64 -i key\.json/);
  });

  it("says which part is missing when the JSON isn't a service account key", () => {
    expect(() => parseServiceAccountKey(b64({ client_email: "x" }))).toThrow(/private_key/);
    expect(() => parseServiceAccountKey(b64({ private_key: "x" }))).toThrow(/client_email/);
  });

  it("never puts the key itself in an error message", () => {
    try {
      parseServiceAccountKey(b64({ client_email: "x", private_key: "SUPER-SECRET-VALUE", extra: 1 }).slice(0, -6));
    } catch (error) {
      expect(String(error)).not.toContain("SUPER-SECRET-VALUE");
    }
  });
});
