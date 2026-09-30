import { SessionGate } from "@/components/session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SessionGate>{children}</SessionGate>;
}
