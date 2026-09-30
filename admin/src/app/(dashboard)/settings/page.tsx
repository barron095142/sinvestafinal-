import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsScreen } from "@/components/screens";

export const metadata: Metadata = { title: "Global Settings" };

export default function Page() {
  return (
    <Suspense>
      <SettingsScreen />
    </Suspense>
  );
}
