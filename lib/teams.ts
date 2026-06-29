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

// B2B e Farmer — a preencher após coletar membros
export const B2B_TEAM: TeamMember[] = [];
export const FARMER_TEAM: TeamMember[] = [];
