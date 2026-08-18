/** JS port of Android AdtsUtil — used by H6 recovery tests. */
export function findLastCompleteAdtsFrame(data: Uint8Array): number {
  let lastFrameStart = -1;
  let offset = 0;
  while (offset < data.length - 6) {
    if (data[offset] === 0xff && (data[offset + 1]! & 0xf0) === 0xf0) {
      const frameLength =
        ((data[offset + 3]! & 0x03) << 11) |
        ((data[offset + 4]! & 0xff) << 3) |
        ((data[offset + 5]! & 0xe0) >> 5);
      if (frameLength < 7 || offset + frameLength > data.length) break;
      lastFrameStart = offset;
      offset += frameLength;
    } else {
      offset += 1;
    }
  }
  return lastFrameStart >= 0 ? lastFrameStart : 0;
}

export function endOfLastCompleteFrame(data: Uint8Array): number {
  const start = findLastCompleteAdtsFrame(data);
  if (start < 0 || start + 6 >= data.length) return 0;
  const frameLength =
    ((data[start + 3]! & 0x03) << 11) |
    ((data[start + 4]! & 0xff) << 3) |
    ((data[start + 5]! & 0xe0) >> 5);
  const end = start + frameLength;
  return end >= 7 && end <= data.length ? end : 0;
}

export function makeAdtsFrame(payload: Uint8Array): Uint8Array {
  const fullLen = payload.length + 7;
  const h = new Uint8Array(7 + payload.length);
  h[0] = 0xff;
  h[1] = 0xf9;
  h[2] = ((2 - 1) << 6) + (7 << 2) + (1 >> 2);
  h[3] = ((1 & 3) << 6) + (fullLen >> 11);
  h[4] = (fullLen & 0x7ff) >> 3;
  h[5] = ((fullLen & 7) << 5) + 0x1f;
  h[6] = 0xfc;
  h.set(payload, 7);
  return h;
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
