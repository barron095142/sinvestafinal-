import type { Metadata } from "next";
import { Suspense } from "react";
import { SeoScreen } from "@/components/screens";

export const metadata: Metadata = { title: "SEO Manager" };

export default function Page() {
  return (
    <Suspense>
      <SeoScreen />
    </Suspense>
  );
}
