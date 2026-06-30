import crypto from "crypto";
import { cookies } from "next/headers";

export type SessionUser = { email: string; role: "admin" };
export const COOKIE = "ena_session";
const MAX_AGE = 7 * 24 * 60 * 60;

const USERS = [
  { email: "crm.psa@profissionaissa.com",          role: "admin" as const, hashEnv: "AUTH_HASH" },
  { email: "diego.conceicao@profissionaissa.com",   role: "admin" as const, hashEnv: "AUTH_DIEGO_HASH" },
];

function secret() { return process.env.AUTH_SECRET || ""; }

function scrypt(pw: string, salt: string): Buffer {
  return crypto.scryptSync(pw, salt, 64);
}

export function verificarCredenciais(email: string, senha: string): SessionUser | null {
  const u = USERS.find((x) => x.email.toLowerCase() === email.toLowerCase().trim());
  if (!u) return null;
  const stored = process.env[u.hashEnv] || "";
  const [salt, key] = stored.split(":");
  if (!salt || !key) return null;
  let calc: Buffer;
  try { calc = scrypt(senha, salt); } catch { return null; }
  const keyBuf = Buffer.from(key, "hex");
  if (calc.length !== keyBuf.length) return null;
  if (!crypto.timingSafeEqual(calc, keyBuf)) return null;
  return { email: u.email, role: u.role };
}

export function assinarSessao(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ email: user.email, role: user.role, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function lerSessao(token?: string): SessionUser | null {
  if (!token || !secret()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const esperado = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return { email: data.email, role: data.role };
  } catch { return null; }
}

export function sessaoAtual(): SessionUser | null {
  return lerSessao(cookies().get(COOKIE)?.value);
}
