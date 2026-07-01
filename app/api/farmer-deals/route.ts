import { NextRequest, NextResponse } from "next/server";
import { lerSessao, COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { getFarmerDealsList, getOrigins, type FarmerOrigin } from "@/lib/hubspot/farmer";
import { getPortalId } from "@/lib/hubspot/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const sp      = req.nextUrl.searchParams;
  const ownerId = sp.get("ownerId") ?? "";
  const type    = (sp.get("type") ?? "raised") as "raised" | "converted";
  const mes     = sp.get("mes") ?? "";
  const origin  = (sp.get("origin") ?? "ambas") as FarmerOrigin;

  if (!ownerId) return NextResponse.json({ error: "ownerId required" }, { status: 400 });

  const [origins, portalId] = await Promise.all([
    getOrigins(origin).catch(() => null),
    getPortalId().catch(() => ""),
  ]);

  const deals = await getFarmerDealsList(ownerId, type, mes, origins).catch(() => []);

  return NextResponse.json({ deals, portalId });
}
