export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const withProtocol = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "");
    if (!host || !host.includes(".")) return null;
    return host;
  } catch {
    const host = trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (!host || !host.includes(".")) return null;
    return host;
  }
}

export function siteOrigin(domain: string): string {
  return `https://${domain}`;
}
