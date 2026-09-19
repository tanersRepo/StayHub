import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * File storage abstraction. Dev writes to public/uploads (served statically by Next).
 * For production swap the two functions for Vercel Blob / UploadThing / S3 — nothing else changes.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveFile(
  data: Buffer,
  opts: { propertyId: string; ext: string },
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, opts.propertyId);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${opts.ext}`;
  await writeFile(path.join(dir, name), data);
  return `/uploads/${opts.propertyId}/${name}`;
}

export async function deleteFile(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // remote/seed URLs are not ours to delete
  const rel = url.slice("/uploads/".length);
  if (rel.includes("..")) return;
  try {
    await unlink(path.join(UPLOAD_ROOT, rel));
  } catch {
    // already gone
  }
}
