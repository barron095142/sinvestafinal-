/** The public pages the CMS knows about. `path` is the URL on the live site. */
export const SITE_PAGES = [
  { id: "home", label: "Home", path: "/" },
  { id: "packages", label: "Solar Packages", path: "/packages.html" },
  { id: "rebates", label: "Rebates & Finance", path: "/rebates.html" },
  { id: "projects", label: "Projects", path: "/projects.html" },
  { id: "about", label: "About Us", path: "/about.html" },
  { id: "contact", label: "Contact", path: "/contact.html" },
] as const;

export type PageId = (typeof SITE_PAGES)[number]["id"];
export const PAGE_IDS = SITE_PAGES.map((p) => p.id) as [PageId, ...PageId[]];

export function pageLabel(id: string) {
  return SITE_PAGES.find((p) => p.id === id)?.label ?? id;
}
