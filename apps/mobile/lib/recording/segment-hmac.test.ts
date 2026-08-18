import { describe, expect, it } from "vitest";
import { hmacSha256, verifyHmac } from "./segment-hmac";

describe("segment HMAC (H4/H6)", () => {
  it("accepts an unmodified nonce+cipher tag", () => {
    const key = new Uint8Array(32).fill(7);
    const nonce = new Uint8Array(16).fill(3);
    const cipher = new Uint8Array(64).fill(9);
    const tag = hmacSha256(key, nonce, cipher);
    expect(verifyHmac(key, nonce, cipher, tag)).toBe(true);
  });

  it("rejects a flipped ciphertext bit", () => {
    const key = new Uint8Array(32).fill(7);
    const nonce = new Uint8Array(16).fill(3);
    const cipher = new Uint8Array(64).fill(9);
    const tag = hmacSha256(key, nonce, cipher);
    const tampered = new Uint8Array(cipher);
    tampered[12] = tampered[12]! ^ 0x01;
    expect(verifyHmac(key, nonce, cipher, tag)).toBe(true);
    expect(verifyHmac(key, nonce, tampered, tag)).toBe(false);
  });
});
