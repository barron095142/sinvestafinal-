import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";
import { getSection } from "@/lib/cms";

export const metadata: Metadata = { title: "Global Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { data, updatedAt, updatedBy } = await getSection("settings");
  return <SettingsForm initial={data} updatedAt={updatedAt} updatedBy={updatedBy} />;
}
