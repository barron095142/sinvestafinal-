import "server-only";
import { BASE_PATH } from "./constants";
import { store } from "./store";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface MediaItem {
  id: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

/** Trust the file's bytes, not its name or the browser's claimed type. SVG is refused: it can carry script. */
export function sniffImageType(buf: Uint8Array): string | null {
  const b = (i: number) => buf[i];
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return "image/gif";
  const ascii = (s: number, e: number) => String.fromCharCode(...buf.slice(s, e));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /avif|avis/.test(ascii(8, 12))) return "image/avif";
  return null;
}

export const mediaUrl = (id: string) => `${BASE_PATH}/api/media/${id}`;

interface MediaMeta {
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  [k: string]: string | number | boolean;
}

export async function saveMedia(data: ArrayBuffer, name: string, contentType: string): Promise<MediaItem> {
  const id = crypto.randomUUID();
  const meta: MediaMeta = { name: name.slice(0, 160), contentType, size: data.byteLength, uploadedAt: new Date().toISOString() };
  await store().setBinary(`media/${id}`, data, meta);
  // A small JSON twin makes listing the library cheap (no binary reads).
  await store().setJSON(`media-index/${id}`, meta);
  return { id, ...meta, url: mediaUrl(id) };
}

export async function listMedia(): Promise<MediaItem[]> {
  const keys = await store().list("media-index/");
  const rows = await Promise.all(
    keys.map(async (k) => {
      const meta = await store().getJSON<MediaMeta>(k);
      const id = k.slice("media-index/".length);
      return meta ? { id, ...meta, url: mediaUrl(id) } : null;
    }),
  );
  return rows.filter((r): r is MediaItem => !!r).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export async function getMedia(id: string) {
  if (!ID_RE.test(id)) return null;
  return store().getBinary(`media/${id}`);
}
export async function deleteMedia(id: string) {
  if (!ID_RE.test(id)) return;
  await Promise.all([store().delete(`media/${id}`), store().delete(`media-index/${id}`)]);
}
