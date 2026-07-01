import { Redis } from "@upstash/redis";
import { B2B_TEAM, B2C_TEAM, FARMER_SQUADS, type TeamMember } from "./teams";

const CONFIG_KEY = "psa:team_config";

function getRedis(): Redis | null {
  // Suporta Vercel KV (KV_REST_API_URL/TOKEN) e Upstash direto (UPSTASH_REDIS_REST_URL/TOKEN)
  const url   = process.env.KV_REST_API_URL   ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export interface ConfigSquad {
  id: string;
  label: string;
  members: TeamMember[];
}

export interface TeamConfig {
  b2b: TeamMember[];
  b2c: TeamMember[];
  farmerSquads: ConfigSquad[];
}

function emailToMember(email: string) {
  const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, email };
}

function defaultConfig(): TeamConfig {
  return {
    b2b: B2B_TEAM,
    b2c: B2C_TEAM,
    farmerSquads: FARMER_SQUADS.map((s) => ({
      id: s.id,
      label: s.label,
      members: s.members.map((email) => emailToMember(email)),
    })),
  };
}

export async function getTeamConfig(): Promise<TeamConfig> {
  try {
    const redis = getRedis();
    if (!redis) return defaultConfig();
    const data = await redis.get<TeamConfig>(CONFIG_KEY);
    if (!data) return defaultConfig();
    return {
      b2b: data.b2b ?? B2B_TEAM,
      b2c: data.b2c ?? B2C_TEAM,
      farmerSquads: data.farmerSquads ?? defaultConfig().farmerSquads,
    };
  } catch {
    return defaultConfig();
  }
}

export async function saveTeamConfig(config: TeamConfig): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis não configurado. Adicione UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN nas variáveis de ambiente.");
  await redis.set(CONFIG_KEY, config);
}
