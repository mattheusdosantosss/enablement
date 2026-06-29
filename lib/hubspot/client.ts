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
