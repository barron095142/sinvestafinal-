import defaults from "./content-defaults.json";

/**
 * What the Page Content Manager can edit. Every `key` matches a data-cms hook
 * in the public HTML (see scripts/sync-content-defaults.mjs):
 *   text   → element text, HTML-escaped
 *   rich   → element HTML; only <em>, <strong>, <br> and entities survive
 *   price  → whole dollars; the "Save $X" badge and screen-reader label follow
 *   image  → the <img> src
 */
export type FieldType = "text" | "rich" | "price" | "image";

export interface ContentField {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  multiline?: boolean;
}
export interface ContentSection {
  id: string;
  title: string;
  description?: string;
  fields: ContentField[];
}
export interface ContentGroup {
  id: string;
  label: string;
  pageUrl: string;
  sections: ContentSection[];
}

const hero = (page: string, opts: { lead?: boolean } = {}): ContentSection => ({
  id: `${page}-hero`,
  title: "Page hero",
  description: "The headline block at the top of the page.",
  fields: [
    {
      key: `${page}.hero.title`,
      label: "Headline",
      type: "rich",
      help: 'Wrap words in <em class="hl">…</em> for the blue highlight. <br> forces a line break.',
    },
    ...(opts.lead
      ? [{ key: `${page}.hero.lead`, label: "Intro paragraph", type: "text" as const, multiline: true }]
      : []),
    { key: `${page}.hero.image`, label: "Hero image", type: "image" },
  ],
});

const residential = (id: string, name: string): ContentSection => ({
  id: `pkg-${id}`,
  title: name,
  description: "Changes apply to this package on both the Home page and the Solar Packages page.",
  fields: [
    { key: `pkg.${id}.now`, label: "Price (incl. GST)", type: "price" },
    {
      key: `pkg.${id}.was`,
      label: "Was price",
      type: "price",
      help: "Leave at 0 to hide the struck-through price. Under Australian Consumer Law, only show a price the system genuinely sold at.",
    },
    { key: `pkg.${id}.for`, label: "Who it's for", type: "text" },
    { key: `pkg.${id}.summary`, label: "Short description (Home page card)", type: "text", multiline: true },
    { key: `pkg.${id}.desc`, label: "Full description (Packages page)", type: "text", multiline: true },
    { key: `pkg.${id}.note`, label: "Price note", type: "rich", multiline: true },
    { key: `pkg.${id}.cardImage`, label: "3D product render (Home card)", type: "image" },
    { key: `pkg.${id}.productImage`, label: "3D product render (Packages page)", type: "image" },
    { key: `pkg.${id}.roofImage`, label: "Roof photo", type: "image" },
    { key: `pkg.${id}.installImage`, label: "Battery / install photo", type: "image" },
  ],
});

const commercial = (id: string, name: string): ContentSection => ({
  id: `pkg-${id}`,
  title: name,
  fields: [
    { key: `pkg.${id}.for`, label: "Who it's for", type: "text" },
    { key: `pkg.${id}.summary`, label: "Short description (Home page card)", type: "text", multiline: true },
    { key: `pkg.${id}.desc`, label: "Full description (Packages page)", type: "text", multiline: true },
  ],
});

const GALLERY_LABELS = [
  "Hillside home at sunset", "Commercial warehouse roof", "Residential array at dusk", "Tiled roof",
  "Tiled residential roof", "Low-pitch roof", "Industrial rows", "Metal deck behind parapet",
  "Tilt frames", "Bird-proofed metal roof", "SigenStor with signage", "Modular battery stack",
  "Tesla Wall Connector", "Powerwall pair", "Sungrow on brick", "Twin SigenStor stacks",
  "SigenStor with bollards", "SigenStor on side path", "SigenStor on side wall",
];

export const CONTENT_GROUPS: ContentGroup[] = [
  { id: "home", label: "Home", pageUrl: "/", sections: [hero("home", { lead: true })] },
  {
    id: "residential",
    label: "Residential Packages",
    pageUrl: "/packages.html",
    sections: [
      hero("packages", { lead: true }),
      residential("r66", "6.6kW + 13.5kWh Tesla Powerwall 3"),
      residential("r10", "10kW + 27kWh SigEnergy"),
      residential("r13", "13kW + 36kWh SigEnergy"),
    ],
  },
  {
    id: "commercial",
    label: "Commercial Packages",
    pageUrl: "/packages.html",
    sections: [commercial("c50", "50kW"), commercial("c100", "100kW"), commercial("c200", "Over 200kW")],
  },
  { id: "rebates", label: "Rebate & Finance", pageUrl: "/rebates.html", sections: [hero("rebates")] },
  {
    id: "projects",
    label: "Projects",
    pageUrl: "/projects.html",
    sections: [
      hero("projects", { lead: true }),
      {
        id: "gallery",
        title: "Project gallery",
        description: "Replace any photo with a newer install. Landscape photos around 1600px wide work best.",
        fields: GALLERY_LABELS.map((label, i) => ({
          key: `projects.gallery.${i + 1}`,
          label,
          type: "image" as const,
        })),
      },
    ],
  },
  { id: "about", label: "About Us", pageUrl: "/about.html", sections: [hero("about", { lead: true })] },
  { id: "contact", label: "Contact", pageUrl: "/contact.html", sections: [hero("contact")] },
];

export const CONTENT_FIELDS = new Map(
  CONTENT_GROUPS.flatMap((g) => g.sections.flatMap((s) => s.fields)).map((f) => [f.key, f]),
);

/** Current live values, limited to the fields above. */
export const CONTENT_DEFAULTS: Record<string, string | number> = Object.fromEntries(
  Object.entries(defaults as Record<string, string | number>).filter(([k]) => CONTENT_FIELDS.has(k)),
);
