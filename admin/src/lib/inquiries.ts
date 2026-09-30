import "server-only";
import type { Inquiry } from "./schemas";
import { store } from "./store";

// Key = time-sortable id, so listing newest-first needs no index file.
export function newInquiryId() {
  return `${Date.now().toString(36).padStart(9, "0")}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function saveInquiry(inq: Inquiry) {
  await store().setJSON(`inquiries/${inq.id}`, inq);
}

export async function getInquiry(id: string) {
  if (!/^[a-z0-9]{9}-[a-f0-9]{8}$/.test(id)) return null;
  return store().getJSON<Inquiry>(`inquiries/${id}`);
}

export async function listInquiries(limit = 200) {
  const keys = (await store().list("inquiries/")).sort().reverse().slice(0, limit);
  const rows = await Promise.all(keys.map((k) => store().getJSON<Inquiry>(k)));
  return rows.filter((r): r is Inquiry => !!r);
}
