import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerSessao, COOKIE } from "@/lib/auth";
import { getTeamConfig, saveTeamConfig, type TeamConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

function authed() {
  return lerSessao(cookies().get(COOKIE)?.value);
}

export async function GET() {
  if (!authed()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const config = await getTeamConfig();
  return NextResponse.json(config);
}

export async function PUT(req: Request) {
  if (!authed()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  let body: TeamConfig;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    await saveTeamConfig(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
