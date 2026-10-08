import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("API key sealing", () => {
  it("round-trips and never stores plaintext", async () => {
    const { seal, unseal, keyHint } = await import("@/lib/ai/crypto");
    const key = "sk-ant-api03-SECRET-VALUE-1234";
    const sealed = seal(key);
    expect(JSON.stringify(sealed)).not.toContain("SECRET");
    expect(unseal(sealed)).toBe(key);
    expect(keyHint(key)).toBe("sk-a…1234");
  });
  it("detects tampering", async () => {
    const { seal, unseal } = await import("@/lib/ai/crypto");
    const sealed = seal("abc-123-xyz");
    const bad = { ...sealed, encryptedKey: Buffer.from("zzzzzzzzzzz").toString("base64") };
    expect(() => unseal(bad)).toThrow();
  });
});
