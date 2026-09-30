import { NextResponse } from "next/server";
import { buildPublicConfig } from "@/lib/public-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await buildPublicConfig();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=300" },
  });
}
