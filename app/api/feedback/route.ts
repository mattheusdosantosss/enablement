import { NextResponse } from "next/server";
import { lerSessao, COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const HISTORY_KEY = "psa:feedback_history";

function getRedis(): Redis | null {
  const url   = process.env.KV_REST_API_URL   ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export interface FeedbackEntry {
  id: string;
  sentAt: string;
  team: string;
  memberName: string;
  memberEmail: string;
  carga: string | null;
  gestao: string | null;
  coordenacao: string | null;
  coordenacaoEmail: string | null;
  objetivo: string | null;
  tipo: string | null;
  nota: number | null;
  text: string;
  sentBy: string;
}

export async function GET(req: Request) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const redis = getRedis();
  if (!redis) return NextResponse.json({ items: [] });

  try {
    const raw = await redis.lrange(HISTORY_KEY, 0, 49);
    const items = (raw as (string | FeedbackEntry)[]).map((r) =>
      typeof r === "string" ? JSON.parse(r) : r
    ) as FeedbackEntry[];
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

const TEAM_LABEL: Record<string, string> = {
  b2b: "B2B", b2c: "B2C", farmers: "Farmers",
};

export async function POST(req: Request) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { team, memberName, memberEmail, carga, gestao, coordenacao, coordenacaoEmail, objetivo, tipo, nota, text } = body ?? {};
  if (!team || !memberName || !text?.trim()) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const label = TEAM_LABEL[team] ?? team;

  // Persiste no histórico (e-mail via HubSpot — a ser implementado)
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Redis indisponível." }, { status: 503 });
  }

  try {
    const entry: FeedbackEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sentAt: new Date().toISOString(),
        team: label,
        memberName,
        memberEmail: memberEmail ?? "",
        carga: carga || null,
        gestao: gestao || null,
        coordenacao: coordenacao || null,
        coordenacaoEmail: coordenacaoEmail || null,
        objetivo: objetivo || null,
        tipo: tipo || null,
        nota: nota ? Number(nota) : null,
        text,
        sentBy: user.email,
      };
    await redis.lpush(HISTORY_KEY, JSON.stringify(entry));
    await redis.ltrim(HISTORY_KEY, 0, 99);
  } catch {
    return NextResponse.json({ error: "Falha ao salvar registro." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
async function rewriteHistory(
  redis: ReturnType<typeof getRedis>,
  transform: (items: FeedbackEntry[]) => FeedbackEntry[],
): Promise<{ ok: boolean; notFound?: boolean }> {
  if (!redis) return { ok: false };
  const raw = await redis.lrange(HISTORY_KEY, 0, 99);
  const items = (raw as (string | FeedbackEntry)[]).map((r) =>
    typeof r === "string" ? JSON.parse(r) : r,
  ) as FeedbackEntry[];

  const updated = transform(items);
  if (updated === items) return { notFound: true, ok: false };

  await redis.del(HISTORY_KEY);
  if (updated.length > 0) {
    await redis.rpush(HISTORY_KEY, ...updated.map((i) => JSON.stringify(i)));
  }
  return { ok: true };
}

export async function DELETE(req: Request) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: { id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const { id } = body ?? {};
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });

  const redis = getRedis();
  const { ok, notFound } = await rewriteHistory(redis, (items) => {
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return items; // sentinel: unchanged → notFound
    return filtered;
  });

  if (notFound) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (!ok)      return NextResponse.json({ error: "Redis indisponível." }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: { id?: string; text?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const { id, text } = body ?? {};
  if (!id || !text?.replace(/<[^>]*>/g, "").trim()) {
    return NextResponse.json({ error: "id e text obrigatórios." }, { status: 400 });
  }

  const redis = getRedis();
  const { ok, notFound } = await rewriteHistory(redis, (items) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return items;
    const updated = [...items];
    updated[idx] = { ...updated[idx], text: String(text) };
    return updated;
  });

  if (notFound) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (!ok)      return NextResponse.json({ error: "Redis indisponível." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
