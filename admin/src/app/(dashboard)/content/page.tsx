import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentScreen } from "@/components/screens";

export const metadata: Metadata = { title: "Page Content" };

export default function Page() {
  return (
    <Suspense>
      <ContentScreen />
    </Suspense>
  );
}
