import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See admin/.env.example.`);
  return v;
}

export const env = {
  get adminEmail() {
    return required("ADMIN_EMAIL").trim().toLowerCase();
  },
  get adminPasswordHash() {
    const h = required("ADMIN_PASSWORD_HASH");
    // Next.js expands $VAR inside .env files, which silently corrupts a bcrypt hash.
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(h)) {
      throw new Error("ADMIN_PASSWORD_HASH is not a valid bcrypt hash. In .env files escape every $ as \\$ (npm run hash-password prints both forms).");
    }
    return h;
  },
  get authSecret() {
    const s = required("AUTH_SECRET");
    if (s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
    return new TextEncoder().encode(s);
  },
  get storage(): "netlify" | "file" {
    const v = process.env.CMS_STORAGE;
    if (v === "netlify" || v === "file") return v;
    return process.env.NODE_ENV === "production" ? "netlify" : "file";
  },
  resendApiKey: process.env.RESEND_API_KEY || "",
  resendFrom: process.env.RESEND_FROM || "Sinvesta Website <onboarding@resend.dev>",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
};
