import { getSection, isSection, saveSection, sectionSchema } from "@/lib/cms";
import { adminRoute, HttpError, json, zodDetails } from "@/lib/http";

type Ctx = { params: Promise<{ section: string }> };

async function sectionName(ctx: Ctx) {
  const { section } = await ctx.params;
  if (!isSection(section)) throw new HttpError(404, "Unknown section");
  return section;
}

export const GET = adminRoute<Ctx>(async (_req, ctx) => json(await getSection(await sectionName(ctx))));

export const PUT = adminRoute<Ctx>(async (req, ctx) => {
  const name = await sectionName(ctx);
  const parsed = sectionSchema(name).safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(422, "Some fields need fixing.", zodDetails(parsed.error));
  const rec = await saveSection(name, parsed.data as never, ctx.session.email);
  return json({ ok: true, updatedAt: rec.updatedAt });
});
