/** Every route of the portal is served under this prefix. */
export const BASE_PATH = "/admin";

export const SESSION_COOKIE = "sv_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // one working day

/** Where quote enquiries go unless Global Settings says otherwise. */
export const DEFAULT_NOTIFICATION_EMAIL = "PVEnergy.au@gmail.com";

/** Prefix a portal path for use in fetch() — Link/redirect add it themselves. */
export const api = (path: string) => `${BASE_PATH}/api${path}`;
