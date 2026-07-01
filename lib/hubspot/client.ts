const BASE = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_TOKEN ?? "";

export async function hs<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HubSpot ${res.status} — ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function hsPost<T>(path: string, body: unknown): Promise<T> {
  return hs<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Pagina automaticamente pelos resultados de search (POST) do HubSpot
export async function hsPostAll(
  path: string,
  body: Record<string, unknown>
): Promise<{ id: string; properties: Record<string, string> }[]> {
  const all: { id: string; properties: Record<string, string> }[] = [];
  let after: string | undefined;
  do {
    const req = after ? { ...body, after } : body;
    const page = await hsPost<{
      results: { id: string; properties: Record<string, string> }[];
      paging?: { next?: { after: string } };
    }>(path, req);
    if (!page.results?.length) break;
    all.push(...page.results);
    after = page.paging?.next?.after;
  } while (after && all.length < 5000);
  return all;
}

let _portalId: string | null = null;
export async function getPortalId(): Promise<string> {
  if (_portalId) return _portalId;
  const data = await hs<{ portalId: number }>("/account-info/v3/details");
  _portalId = String(data.portalId);
  return _portalId;
}
