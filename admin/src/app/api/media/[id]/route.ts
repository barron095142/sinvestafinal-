import { logActivity } from "@/lib/cms";
import { adminRoute, json } from "@/lib/http";
import { deleteMedia, getMedia } from "@/lib/media";

type Ctx = { params: Promise<{ id: string }> };

// Public: the live site embeds these images.
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const media = await getMedia(id);
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(media.data, {
    headers: {
      "Content-Type": String(media.meta.contentType),
      "Cache-Control": "public, max-age=31536000, immutable", // ids are never reused
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

export const DELETE = adminRoute<Ctx>(async (_req, { params, session }) => {
  const { id } = await params;
  await deleteMedia(id);
  await logActivity(session.email, "Deleted an image from the media library");
  return json({ ok: true });
});
