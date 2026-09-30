import type { Metadata } from "next";
import { Suspense } from "react";
import { InquiriesScreen } from "@/components/screens";

export const metadata: Metadata = { title: "Quote Enquiries" };

export default function Page() {
  return (
    <Suspense>
      <InquiriesScreen />
    </Suspense>
  );
}
