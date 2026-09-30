import { getSection } from "@/lib/cms";
import { buildRobots } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const [s, idx] = await Promise.all([getSection("settings"), getSection("indexing")]);
  return new Response(buildRobots(s.data, idx.data), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
