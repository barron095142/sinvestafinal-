import type { Metadata } from "next";
import { IntegrationsForm } from "@/components/integrations-form";
import { getSection } from "@/lib/cms";

export const metadata: Metadata = { title: "Integrations & Scripts" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const [{ data, updatedAt }, settings] = await Promise.all([getSection("integrations"), getSection("settings")]);
  return <IntegrationsForm initial={data} updatedAt={updatedAt} address={settings.data.address} />;
}
