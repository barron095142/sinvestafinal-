/** HTML-escape text for element content or attribute values. */
export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Rich headline text: escape everything, then re-allow a tiny set of inline
 * tags (no attributes except class="hl") and named/numeric entities.
 */
export function sanitizeRich(input: string) {
  let s = escapeHtml(input);
  s = s.replace(/&amp;(#\d+|#x[0-9a-f]+|[a-z]+);/gi, "&$1;");
  s = s.replace(/&lt;(\/?)(em|strong|br)\s*\/?&gt;/gi, (_, slash, tag) => `<${slash}${tag.toLowerCase()}>`);
  s = s.replace(/&lt;em class=(?:&quot;|&#39;)hl(?:&quot;|&#39;)&gt;/gi, '<em class="hl">');
  return s;
}

/** Only site-relative asset paths and our own media URLs may become an <img src>. */
export function isSafeImageSrc(src: string) {
  return /^assets\/img\/[\w./-]+\.(png|jpe?g|webp|avif|gif)$/i.test(src) || /^\/admin\/api\/media\/[a-z0-9-]+$/i.test(src);
}
