import { adminRoute, json } from "@/lib/http";
import { listInquiries } from "@/lib/inquiries";

export const GET = adminRoute(async () => json({ items: await listInquiries() }));
