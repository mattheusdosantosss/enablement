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

const SEED_ENTRIES = [
  {
    id: "seed-001",
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    team: "B2B",
    memberName: "Mattheus Faleiro dos Santos",
    memberEmail: "crm.psa@profissionaissa.com",
    carga: "1h",
    gestao: "Cesar Luiz dos Santos Filho",
    objetivo: "Tecnica de abertura e qualificacao de leads",
    text: "Excelente aderencia ao script de abordagem. O Mattheus demonstrou evolucao clara na fase de descoberta, fazendo perguntas mais abertas e ouvindo com atencao antes de apresentar a solucao. Ponto de melhoria: acelerar o movimento de fechamento quando o lead ja demonstrou interesse — ficou preso na fase de apresentacao por tempo desnecessario. Proximo passo: simular 3 fechamentos diferentes ate a proxima sessao.",
    sentBy: "crm.psa@profissionaissa.com",
  },
  {
    id: "seed-002",
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    team: "B2C",
    memberName: "Gabrielly Milani da Silva",
    memberEmail: "gabrielly.milani@profissionaissa.com",
    carga: "45 min",
    gestao: "Nicollas Blanco Lenuzza",
    objetivo: "Gestao de objecoes no ciclo B2C",
    text: "Sessao muito produtiva. A Gabrielly ja internalizou o modelo de reversao de objecao de preco, respondendo de forma natural e sem soar ensaiada. Destaque positivo para o uso de prova social — trouxe um case de cliente real que encaixou perfeitamente. Foco da proxima sessao: objecao de tempo ('preciso pensar mais').",
    sentBy: "crm.psa@profissionaissa.com",
  },
  {
    id: "seed-003",
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    team: "Farmers",
    memberName: "Thiago Souza",
    memberEmail: "thiago.souza@profissionaissa.com",
    carga: "1h30",
    gestao: "Leandro Lara Bengochea",
    objetivo: "Aumento de demandas levantadas por carteira",
    text: "Revisamos juntos a carteira ativa do Thiago e identificamos 8 contas com potencial de upsell nao explorado. Desenvolvemos um roteiro de reativacao para essas contas com abordagem consultiva. O Thiago se comprometeu a contatar ao menos 3 delas na semana. Feedback geral: muito proativo e receptivo, demonstra senso de dono pela carteira.",
    sentBy: "crm.psa@profissionaissa.com",
  },
];

export async function POST() {
  const user = lerSessao(cookies().get("ena_session")?.value);
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Redis nao configurado." }, { status: 503 });

  for (const entry of SEED_ENTRIES) {
    await redis.lpush(HISTORY_KEY, JSON.stringify(entry));
  }
  await redis.ltrim(HISTORY_KEY, 0, 99);

  return NextResponse.json({ ok: true, added: SEED_ENTRIES.length });
}
