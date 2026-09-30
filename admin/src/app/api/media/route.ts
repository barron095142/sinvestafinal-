import { logActivity } from "@/lib/cms";
import { adminRoute, HttpError, json } from "@/lib/http";
import { listMedia, MAX_UPLOAD_BYTES, saveMedia, sniffImageType } from "@/lib/media";

export const GET = adminRoute(async () => json({ items: await listMedia() }));

export const POST = adminRoute(async (req, { session }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file received.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Images must be 8 MB or smaller.");
  const data = await file.arrayBuffer();
  const type = sniffImageType(new Uint8Array(data.slice(0, 16)));
  if (!type) throw new HttpError(415, "Only PNG, JPG, WebP, AVIF or GIF images can be uploaded.");
  const item = await saveMedia(data, file.name, type);
  await logActivity(session.email, `Uploaded ${item.name}`);
  return json({ item }, { status: 201 });
});
