/** App release metadata — bump on each user-facing deploy. */
export const APP_VERSION = "0.3.2";

/** ISO date (UTC) of this release */
export const APP_UPDATED_AT = "2026-10-02";

export function formatUpdatedAt(isoDate = APP_UPDATED_AT): string {
  // Display as YYYY-MM-DD for zh-TW UI
  return isoDate;
}
