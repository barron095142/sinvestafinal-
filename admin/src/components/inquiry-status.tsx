import type { Inquiry } from "@/lib/schemas";
import { Badge } from "./ui/primitives";

const TONE = { new: "amber", contacted: "blue", quoted: "violet", won: "green", lost: "neutral" } as const;
export const STATUS_LABEL: Record<Inquiry["status"], string> = {
  new: "New", contacted: "Contacted", quoted: "Quoted", won: "Won", lost: "Lost",
};

export function InquiryStatusBadge({ status }: { status: Inquiry["status"] }) {
  return (
    <Badge tone={TONE[status]} dot>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
