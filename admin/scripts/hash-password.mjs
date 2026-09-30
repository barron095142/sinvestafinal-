// Usage: npm run hash-password -- 'my strong password'
// Prints a bcrypt hash for ADMIN_PASSWORD_HASH.
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Give a password of at least 12 characters:  npm run hash-password -- 'your-password'");
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log("\nNetlify → Site configuration → Environment variables (paste as-is):");
console.log("  ADMIN_PASSWORD_HASH=" + hash);
console.log("\nLocal .env.local file (Next.js expands $, so each one is escaped):");
console.log("  ADMIN_PASSWORD_HASH=" + hash.replace(/\$/g, "\\$") + "\n");
