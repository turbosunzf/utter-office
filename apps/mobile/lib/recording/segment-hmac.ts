import { createHmac, timingSafeEqual } from "node:crypto";

const HMAC_BYTES = 32;

export function hmacSha256(key: Uint8Array, nonce: Uint8Array, cipher: Uint8Array): Uint8Array {
  const mac = createHmac("sha256", Buffer.from(key));
  mac.update(Buffer.from(nonce));
  mac.update(Buffer.from(cipher));
  return new Uint8Array(mac.digest());
}

export function verifyHmac(
  key: Uint8Array,
  nonce: Uint8Array,
  cipher: Uint8Array,
  tag: Uint8Array,
): boolean {
  const expected = hmacSha256(key, nonce, cipher);
  if (expected.length !== tag.length || expected.length !== HMAC_BYTES) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(tag));
}
