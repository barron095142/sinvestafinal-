import type { Metadata } from "next";
import { Suspense } from "react";
import { SitemapScreen } from "@/components/screens";

export const metadata: Metadata = { title: "Sitemap & Robots" };

export default function Page() {
  return (
    <Suspense>
      <SitemapScreen />
    </Suspense>
  );
}
