/**
 * QR payload carried on every site code. The guard scanner accepts this
 * format and a bare 24-char site ObjectId (in case a site prints its own code).
 */
export const siteQrPayload = (siteId: string) => `VITALPAYROLL-SITE:${siteId}`;

export function parseSiteQrPayload(raw: string): string | null {
  const text = (raw || '').trim();
  if (!text) return null;
  const match = text.match(/([0-9a-fA-F]{24})/);
  return match ? match[1] : null;
}
