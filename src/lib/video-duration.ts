/**
 * Reads the duration of an MP4/MOV file by walking the ISO-BMFF box tree to `moov/mvhd`.
 * No ffmpeg needed. Returns null when the container is not MP4-like or the box is missing
 * (e.g. WebM), in which case callers fall back to the client-reported duration.
 */
export function mp4DurationSeconds(buf: Buffer): number | null {
  const moov = findBox(buf, 0, buf.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(buf, moov.start, moov.end, "mvhd");
  if (!mvhd) return null;

  const version = buf.readUInt8(mvhd.start);
  // mvhd payload: version(1) flags(3) then, for v0: ctime(4) mtime(4) timescale(4) duration(4)
  //                                        for v1: ctime(8) mtime(8) timescale(4) duration(8)
  if (version === 1) {
    const timescale = buf.readUInt32BE(mvhd.start + 20);
    const duration = Number(buf.readBigUInt64BE(mvhd.start + 24));
    return timescale ? duration / timescale : null;
  }
  const timescale = buf.readUInt32BE(mvhd.start + 12);
  const duration = buf.readUInt32BE(mvhd.start + 16);
  return timescale ? duration / timescale : null;
}

/** Locate a box by type among the siblings in [from, to). Returns its payload range. */
function findBox(buf: Buffer, from: number, to: number, type: string) {
  let pos = from;
  while (pos + 8 <= to) {
    let size = buf.readUInt32BE(pos);
    const boxType = buf.toString("latin1", pos + 4, pos + 8);
    let header = 8;
    if (size === 1) {
      if (pos + 16 > to) return null;
      size = Number(buf.readBigUInt64BE(pos + 8));
      header = 16;
    } else if (size === 0) {
      size = to - pos; // box extends to end of file
    }
    if (size < header) return null;
    if (boxType === type) return { start: pos + header, end: Math.min(pos + size, to) };
    pos += size;
  }
  return null;
}
