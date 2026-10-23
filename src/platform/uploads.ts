import { fail } from "./core";
const join = (parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((n, a) => n + a.length, 0));
  let at = 0;
  for (const p of parts) {
    result.set(p, at);
    at += p.length;
  }
  return result;
};
const ascii = (bytes: Uint8Array) => String.fromCharCode(...bytes);
// Keep image payload, discard metadata (EXIF/GPS/XMP/comments); no SVG or arbitrary files.
export function cleanImage(b: Uint8Array): { data: Uint8Array; mime: string } {
  if (b.length < 16) fail("Image invalide.");
  if (b[0] === 0xff && b[1] === 0xd8) {
    const parts = [b.slice(0, 2)];
    let pos = 2,
      sawFrame = false;
    while (pos + 4 <= b.length) {
      if (b[pos] !== 0xff) fail("JPEG invalide.");
      const marker = b[pos + 1];
      if (marker === 0xda) {
        if (!sawFrame) fail("JPEG invalide.");
        parts.push(b.slice(pos));
        return { data: join(parts), mime: "image/jpeg" };
      }
      const length = (b[pos + 2] << 8) | b[pos + 3];
      if (length < 2 || pos + 2 + length > b.length) fail("JPEG invalide.");
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        sawFrame = true;
        const height = (b[pos + 5] << 8) | b[pos + 6],
          width = (b[pos + 7] << 8) | b[pos + 8];
        if (width * height > 25000000) fail("Image trop grande.");
      }
      if (!(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe)
        parts.push(b.slice(pos, pos + 2 + length));
      pos += 2 + length;
    }
    fail("JPEG incomplet.");
  }
  if (ascii(b.slice(1, 4)) === "PNG" && b[0] === 137) {
    const parts = [b.slice(0, 8)];
    let pos = 8,
      sawHeader = false;
    const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
    while (pos + 12 <= b.length) {
      const n = d.getUint32(pos),
        type = ascii(b.slice(pos + 4, pos + 8));
      if (n > 4 * 1024 * 1024 || pos + n + 12 > b.length) fail("PNG invalide.");
      if (type === "IHDR") {
        sawHeader = true;
        if (n !== 13 || d.getUint32(pos + 8) * d.getUint32(pos + 12) > 25000000)
          fail("Image trop grande.");
      }
      if (["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(type))
        parts.push(b.slice(pos, pos + n + 12));
      pos += n + 12;
      if (type === "IEND" && sawHeader)
        return { data: join(parts), mime: "image/png" };
    }
    fail("PNG incomplet.");
  }
  if (ascii(b.slice(0, 4)) === "RIFF" && ascii(b.slice(8, 12)) === "WEBP") {
    const parts: Uint8Array[] = [];
    let pos = 12,
      hasPayload = false;
    while (pos + 8 <= b.length) {
      const n = new DataView(b.buffer, b.byteOffset + pos + 4, 4).getUint32(
          0,
          true,
        ),
        type = ascii(b.slice(pos, pos + 4));
      if (pos + 8 + n > b.length) fail("WebP invalide.");
      if (["VP8 ", "VP8L", "ALPH", "VP8X"].includes(type)) {
        const chunk = b.slice(pos, pos + 8 + n + (n % 2));
        if (type === "VP8X") {
          chunk[8] &= ~(0x20 | 0x08 | 0x04);
          if (chunk[8] & 0x02) fail("Choisis une photo non animée.");
          const w = 1 + chunk[12] + (chunk[13] << 8) + (chunk[14] << 16),
            h = 1 + chunk[15] + (chunk[16] << 8) + (chunk[17] << 16);
          if (w * h > 25000000) fail("Image trop grande.");
        }
        parts.push(chunk);
        if (type === "VP8 " || type === "VP8L") hasPayload = true;
      }
      pos += 8 + n + (n % 2);
    }
    if (!hasPayload) fail("WebP invalide.");
    const body = join(parts),
      head = b.slice(0, 12);
    new DataView(head.buffer).setUint32(4, body.length + 4, true);
    return { data: join([head, body]), mime: "image/webp" };
  }
  fail("Choisis une image JPEG, PNG ou WebP.");
}
