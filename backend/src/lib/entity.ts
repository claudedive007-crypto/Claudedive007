import { prisma } from "./prisma.js";

let cachedEntityId: string | null = null;

/** Single-tenant deployment (SYS-11): there is exactly one Entity row. */
export async function getEntityId(): Promise<string> {
  if (cachedEntityId) return cachedEntityId;
  const entity = await prisma.entity.findFirstOrThrow();
  cachedEntityId = entity.id;
  return entity.id;
}
