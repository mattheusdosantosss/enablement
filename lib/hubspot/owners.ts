import { hs } from "./client";

export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

let cache: Owner[] | null = null;

export async function getOwners(): Promise<Owner[]> {
  if (cache) return cache;
  const data = await hs<{ results: Owner[] }>("/crm/v3/owners?limit=100");
  cache = data.results;
  return cache;
}

export async function ownerMap(): Promise<Map<string, Owner>> {
  const owners = await getOwners();
  return new Map(owners.map((o) => [o.id, o]));
}

export function ownerName(o: Owner): string {
  return `${o.firstName} ${o.lastName}`.trim();
}
