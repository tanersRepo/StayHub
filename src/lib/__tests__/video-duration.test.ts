import { describe, expect, it } from "vitest";
import { mp4DurationSeconds } from "../video-duration";

/** Build a minimal ISO-BMFF buffer: ftyp + moov(mvhd) with the given duration. */
function fakeMp4(durationSec: number, version: 0 | 1 = 0) {
  const timescale = 1000;
  const box = (type: string, payload: Buffer) => {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(8 + payload.length, 0);
    header.write(type, 4, "latin1");
    return Buffer.concat([header, payload]);
  };
  let mvhdPayload: Buffer;
  if (version === 0) {
    mvhdPayload = Buffer.alloc(4 + 16);
    mvhdPayload.writeUInt32BE(timescale, 12);
    mvhdPayload.writeUInt32BE(durationSec * timescale, 16);
  } else {
    mvhdPayload = Buffer.alloc(4 + 28);
    mvhdPayload.writeUInt8(1, 0);
    mvhdPayload.writeUInt32BE(timescale, 20);
    mvhdPayload.writeBigUInt64BE(BigInt(durationSec * timescale), 24);
  }
  return Buffer.concat([box("ftyp", Buffer.from("isom")), box("moov", box("mvhd", mvhdPayload))]);
}

describe("mp4DurationSeconds", () => {
  it("reads a version-0 mvhd", () => {
    expect(mp4DurationSeconds(fakeMp4(12))).toBe(12);
  });
  it("reads a version-1 mvhd", () => {
    expect(mp4DurationSeconds(fakeMp4(45, 1))).toBe(45);
  });
  it("returns null for non-MP4 data", () => {
    expect(mp4DurationSeconds(Buffer.from("\x1aE\xdf\xa3 webm stuff", "latin1"))).toBeNull();
  });
});
