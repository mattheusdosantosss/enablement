import { NextResponse } from "next/server";
import { lerSessao, COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { hs } from "@/lib/hubspot/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!process.env.HUBSPOT_TOKEN) {
    return NextResponse.json({ owners: [] });
  }

  try {
    const data = await hs<{ results: { id: string; email: string; firstName: string; lastName: string }[] }>(
      "/crm/v3/owners?limit=200"
    );
    const owners = data.results
      .filter((o) => o.email)
      .map((o) => ({
        email: o.email.toLowerCase(),
        name:  `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return NextResponse.json({ owners });
  } catch {
    return NextResponse.json({ owners: [] });
  }
}
