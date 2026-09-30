export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney",
  });
}

/** Where to preview an image path in the admin. assets/img/* lives on the public site. */
export function previewSrc(src: string) {
  if (!src) return "";
  if (src.startsWith("assets/")) return `${process.env.NEXT_PUBLIC_SITE_ORIGIN ?? ""}/${src}`;
  return src;
}
