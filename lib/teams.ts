export interface TeamMember {
  name: string;
  email: string;
}

export const B2C_TEAM: TeamMember[] = [
  { name: "Gabrielly Milani da Silva", email: "gabrielly.milani@profissionaissa.com" },
  { name: "Franciele Oliveira",        email: "franciele.pereira@profissionaissa.com" },
  { name: "Amanda de Oliveira",        email: "amanda.oliveira@profissionaissa.com" },
  { name: "João Paulo da Silveira Araújo", email: "joao.paulo@profissionaissa.com" },
  { name: "Mayda Quadros",             email: "mayda.quadros@profissionaissa.com" },
  { name: "Willker Santos Belous",     email: "willker.belous@profissionaissa.com" },
];

export const B2C_LEADER: TeamMember = {
  name: "Nicollas Lenuzza",
  email: "nicollas.lenuzza@profissionaissa.com",
};

// B2B — adicionar membros quando informados
export const B2B_TEAM: TeamMember[] = [
  // Membros serão adicionados quando fornecidos
];

// ── Farmers ──────────────────────────────────────────────────────────────────

export type SquadId = "dani" | "katyeli" | "leticia";

export interface FarmerSquad {
  id: SquadId;
  label: string;
  members: string[]; // emails lowercase
}

export const FARMER_SQUADS: FarmerSquad[] = [
  {
    id: "dani",
    label: "Squad Dani",
    members: [
      "thaina.malta@profissionaissa.com",
      "kennedy.soares@profissionaissa.com",
      "maria.guimaraes@profissionaissa.com",
      "willker.belous@profissionaissa.com",
      "francielle.lenz@profissionaissa.com",
      "maryna.rodrigues@profissionaissa.com",
    ],
  },
  {
    id: "katyeli",
    label: "Squad Katyeli",
    members: [
      "vitoria.schaeffer@profissionaissa.com",
      "thiago.souza@profissionaissa.com",
      "daniela.silva@profissionaissa.com",
      "rafael.alves@profissionaissa.com",
      "leticia.santos@profissionaissa.com",
      "joao.marins@profissionaissa.com",
      "bruna.machado@profissionaissa.com",
    ],
  },
  {
    id: "leticia",
    label: "Squad Leticia",
    members: [
      "amanda.duarte@profissionaissa.com",
      "joao.backmann@profissionaissa.com",
      "ana.machado@profissionaissa.com",
      "luiza.rodriguez@profissionaissa.com",
      "gustavo.pacheco@profissionaissa.com",
    ],
  },
];

export const ALL_FARMER_EMAILS: Set<string> = new Set(
  FARMER_SQUADS.flatMap((s) => s.members)
);
