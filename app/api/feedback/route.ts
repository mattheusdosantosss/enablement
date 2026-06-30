import { NextResponse } from "next/server";
import { lerSessao, COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const MANAGERS: Record<string, string | undefined> = {
  b2b:     process.env.MANAGER_B2B,
  b2c:     process.env.MANAGER_B2C,
  farmers: process.env.MANAGER_FARMERS,
};

export async function POST(req: Request) {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Corpo inválido." }, { status: 400 }); }

  const { team, memberName, memberEmail, text } = body ?? {};
  if (!team || !memberName || !text?.trim()) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const managerEmail = MANAGERS[String(team).toLowerCase()];
  if (!managerEmail) {
    return NextResponse.json({ error: `Gestor do time ${team} não configurado.` }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const teamLabel: Record<string, string> = { b2b: "B2B", b2c: "B2C", farmers: "Farmers" };

  await transporter.sendMail({
    from: `"PSA Enablement" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: managerEmail,
    subject: `[Feedback] ${memberName} · Time ${teamLabel[team] ?? team}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#ff6a1a;padding:20px 24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">PSA · Enablement</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Novo feedback recebido</p>
        </div>
        <div style="background:#1a1a20;padding:24px;border:1px solid #26262c;border-top:0;border-radius:0 0 12px 12px">
          <table style="width:100%;font-size:13px;color:#c4c4cd;margin-bottom:20px">
            <tr><td style="padding:6px 0;color:#9a9aa4;width:120px">Membro</td><td style="color:#f4f4f6;font-weight:600">${memberName}</td></tr>
            <tr><td style="padding:6px 0;color:#9a9aa4">E-mail</td><td style="color:#f4f4f6">${memberEmail || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#9a9aa4">Time</td><td style="color:#f4f4f6">${teamLabel[team] ?? team}</td></tr>
            <tr><td style="padding:6px 0;color:#9a9aa4">Enviado por</td><td style="color:#f4f4f6">${user.email}</td></tr>
          </table>
          <div style="background:#101014;border:1px solid #26262c;border-radius:8px;padding:16px">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9a9aa4">Feedback</p>
            <p style="margin:0;font-size:14px;color:#f4f4f6;line-height:1.6;white-space:pre-wrap">${text}</p>
          </div>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
