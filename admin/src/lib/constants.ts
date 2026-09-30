/** Every route of the portal is served under this prefix. */
export const BASE_PATH = "/admin";

/** Where quote enquiries go unless Global Settings says otherwise. */
export const DEFAULT_NOTIFICATION_EMAIL = "PVEnergy.au@gmail.com";

/** PHP API endpoint for a path, e.g. api("/cms/settings") → /admin/api/cms/settings */
export const api = (path: string) => `${BASE_PATH}/api${path}`;
