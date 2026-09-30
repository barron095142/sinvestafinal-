import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getSession } from "@/lib/auth";
import { listInquiries } from "@/lib/inquiries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    const path = (await headers()).get("x-admin-path") ?? "/";
    redirect(path && path !== "/" ? `/login?next=${encodeURIComponent(path)}` : "/login");
  }
  const newCount = (await listInquiries()).filter((i) => i.status === "new").length;
  return (
    <Shell email={session.email} newInquiries={newCount}>
      {children}
    </Shell>
  );
}
