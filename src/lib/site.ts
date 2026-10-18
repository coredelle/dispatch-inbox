// Who built this and how to reach them, shared by every page
export const SITE_URL = "https://dispatch.coredelle.com";
export const REPO_URL = "https://github.com/coredelle/dispatch-inbox";
export const STUDIO_NAME = "Coredelle Digital";
export const CONTACT_EMAIL = "hello@coredelle.com";

export function contactHref(subject = "Project inquiry"): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
