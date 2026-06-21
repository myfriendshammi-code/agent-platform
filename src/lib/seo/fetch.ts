const USER_AGENT = "AgentPlatform-SEO-Bot/1.0 (+https://agentplatform.local)";

export async function fetchUrl(
  url: string,
  options?: { timeoutMs?: number; method?: string },
): Promise<{ ok: boolean; status: number; body: string; headers: Headers }> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options?.method ?? "GET",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml,*/*" },
      signal: controller.signal,
      redirect: "follow",
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body, headers: response.headers };
  } finally {
    clearTimeout(timer);
  }
}
