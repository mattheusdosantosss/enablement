import { NextResponse } from "next/server";
import { lerSessao, COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { Resend } from "resend";
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
  objetivo: string | null;
  tipo: string | null;
  nota: number | null;
  text: string;
  sentBy: string;
}

export async function GET(req: Request) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

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

const MANAGERS: Record<string, string> = {
  b2b:     "cesar.filho@profissionaissa.com",
  b2c:     "nicollas.lenuzza@profissionaissa.com",
  farmers: "leandro.bengochea@profissionaissa.com",
};

const TEAM_LABEL: Record<string, string> = {
  b2b: "B2B", b2c: "B2C", farmers: "Farmers",
};

export async function POST(req: Request) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corpo invalido." }, { status: 400 });
  }

  const { team, memberName, memberEmail, carga, gestao, objetivo, tipo, nota, text } = body ?? {};
  if (!team || !memberName || !text?.trim()) {
    return NextResponse.json({ error: "Campos obrigatorios faltando." }, { status: 400 });
  }

  const managerEmail = MANAGERS[String(team).toLowerCase()];
  if (!managerEmail) {
    return NextResponse.json({ error: `Time "${team}" nao reconhecido.` }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const label  = TEAM_LABEL[team] ?? team;

  const extraRows = [
    tipo     ? `<tr><td style="padding:6px 0;color:#a4a4b2;width:160px">Tipo de Sessao</td><td style="color:#f0f0f4">${tipo}</td></tr>` : "",
    carga    ? `<tr><td style="padding:6px 0;color:#a4a4b2;width:160px">Carga Horaria</td><td style="color:#f0f0f4">${carga}</td></tr>` : "",
    gestao   ? `<tr><td style="padding:6px 0;color:#a4a4b2">Gestao</td><td style="color:#f0f0f4">${gestao}</td></tr>` : "",
    objetivo ? `<tr><td style="padding:6px 0;color:#a4a4b2">Objetivo do Treinamento</td><td style="color:#f0f0f4">${objetivo}</td></tr>` : "",
    nota     ? `<tr><td style="padding:6px 0;color:#a4a4b2">Avaliacao</td><td style="color:#f0f0f4">${"★".repeat(Number(nota))}${"☆".repeat(5 - Number(nota))} (${nota}/5)</td></tr>` : "",
  ].join("");

  const { error } = await resend.emails.send({
    from: `PSA Enablement <${process.env.RESEND_FROM ?? "enablement@profissionaissa.com"}>`,
    to: managerEmail,
    subject: `[Feedback] ${memberName} - Time ${label}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#ff6a1a;padding:20px 24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">PSA Enablement</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Novo feedback recebido</p>
        </div>
        <div style="background:#18181f;padding:24px;border:1px solid #2e2e38;border-top:0;border-radius:0 0 12px 12px">
          <table style="width:100%;font-size:13px;color:#ccccd6;margin-bottom:20px">
            <tr><td style="padding:6px 0;color:#a4a4b2;width:160px">Membro</td><td style="color:#f0f0f4;font-weight:600">${memberName}</td></tr>
            <tr><td style="padding:6px 0;color:#a4a4b2">E-mail</td><td style="color:#f0f0f4">${memberEmail || "N/A"}</td></tr>
            <tr><td style="padding:6px 0;color:#a4a4b2">Time</td><td style="color:#f0f0f4">${label}</td></tr>
            ${extraRows}
            <tr><td style="padding:6px 0;color:#a4a4b2">Enviado por</td><td style="color:#f0f0f4;font-weight:600">${user.email}</td></tr>
          </table>
          <div style="background:#131318;border:1px solid #2e2e38;border-radius:8px;padding:16px">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a4a4b2">Feedback</p>
            <p style="margin:0;font-size:14px;color:#f0f0f4;line-height:1.6;white-space:pre-wrap">${text}</p>
          </div>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Falha ao enviar e-mail." }, { status: 500 });
  }

  // Persiste no histórico
  try {
    const redis = getRedis();
    if (redis) {
      const entry: FeedbackEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sentAt: new Date().toISOString(),
        team: label,
        memberName,
        memberEmail: memberEmail ?? "",
        carga: carga || null,
        gestao: gestao || null,
        objetivo: objetivo || null,
        tipo: tipo || null,
        nota: nota ? Number(nota) : null,
        text,
        sentBy: user.email,
      };
      await redis.lpush(HISTORY_KEY, JSON.stringify(entry));
      await redis.ltrim(HISTORY_KEY, 0, 99);
    }
  } catch { /* histórico não crítico */ }

  return NextResponse.json({ ok: true });
}
