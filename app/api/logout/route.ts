import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  cookies().set(COOKIE, "", { maxAge: 0, path: "/" });
  return NextResponse.json({ ok: true });
}
