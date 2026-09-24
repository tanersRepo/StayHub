/** Upload limits and MIME allow-lists. Client-safe (no Node imports). */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;
export const MAX_IMAGES_PER_PROPERTY = 20;
export const MAX_VIDEOS_PER_PROPERTY = 3;
/** Photos attached to a single room type (photos only; videos stay property-level). */
export const MAX_IMAGES_PER_ROOM_TYPE = 10;

export const IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const VIDEO_MIME_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
