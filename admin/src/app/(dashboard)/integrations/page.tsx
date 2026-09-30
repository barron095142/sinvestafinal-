import type { Metadata } from "next";
import { Suspense } from "react";
import { IntegrationsScreen } from "@/components/screens";

export const metadata: Metadata = { title: "Integrations & Scripts" };

export default function Page() {
  return (
    <Suspense>
      <IntegrationsScreen />
    </Suspense>
  );
}
