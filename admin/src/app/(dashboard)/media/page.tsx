import type { Metadata } from "next";
import { MediaPage } from "@/components/media-page";

export const metadata: Metadata = { title: "Media Library" };

export default function Page() {
  return <MediaPage />;
}
