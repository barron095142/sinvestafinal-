import type { Metadata } from "next";
import { InquiriesInbox } from "@/components/inquiries-inbox";
import { getSection } from "@/lib/cms";
import { env } from "@/lib/env";
import { listInquiries } from "@/lib/inquiries";

export const metadata: Metadata = { title: "Quote Enquiries" };
export const dynamic = "force-dynamic";

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ id?: string; status?: string }> }) {
  const [items, settings, sp] = await Promise.all([listInquiries(), getSection("settings"), searchParams]);
  return (
    <InquiriesInbox
      initial={items}
      notificationEmail={settings.data.notificationEmail}
      emailConfigured={!!env.resendApiKey}
      initialId={sp.id}
      initialStatus={sp.status}
    />
  );
}
