import { describe, expect, it } from "vitest";
import { completeUploadSchema, extForContentType, MAX_UPLOAD_BYTES, signUploadSchema } from "./schemas";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("signUploadSchema", () => {
  it("accepts png, jpeg and webp up to 10 MB", () => {
    for (const contentType of ["image/png", "image/jpeg", "image/webp"]) {
      expect(signUploadSchema.safeParse({ contentType, size: 1000 }).success).toBe(true);
    }
    expect(signUploadSchema.safeParse({ contentType: "image/png", size: MAX_UPLOAD_BYTES }).success).toBe(true);
  });
  it("refuses other types, empty files and files over 10 MB with plain messages", () => {
    expect(signUploadSchema.safeParse({ contentType: "image/gif", size: 10 }).success).toBe(false);
    expect(signUploadSchema.safeParse({ contentType: "image/png", size: 0 }).success).toBe(false);
    const big = signUploadSchema.safeParse({ contentType: "image/png", size: MAX_UPLOAD_BYTES + 1 });
    expect(!big.success && big.error.issues[0].message).toBe("That image is over 10 MB. Use a smaller one.");
  });
});

describe("completeUploadSchema", () => {
  it("needs an id and a known extension", () => {
    const path = `owner/2026/11/${uuid}.jpg`;
    expect(completeUploadSchema.safeParse({ assetId: uuid, ext: "jpg", path }).success).toBe(true);
    expect(completeUploadSchema.safeParse({ assetId: "nope", ext: "png", path }).success).toBe(false);
    expect(completeUploadSchema.safeParse({ assetId: uuid, ext: "exe", path }).success).toBe(false);
    expect(completeUploadSchema.safeParse({ assetId: uuid, ext: "png" }).success).toBe(false);
  });
});

describe("extForContentType", () => {
  it("maps content types to the extension used in storage", () => {
    expect(extForContentType("image/jpeg")).toBe("jpg");
    expect(extForContentType("image/png")).toBe("png");
    expect(extForContentType("image/webp")).toBe("webp");
  });
});
