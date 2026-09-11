import crypto from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

const GENESIS_HASH = "0".repeat(64);

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

/**
 * Appends one entry to the hash-chained evidence log (SYS-04, INV-01/04).
 * Must be called inside a `prisma.$transaction` so the prevHash read-then-write
 * is atomic and concurrent writers cannot interleave and fork the chain.
 */
// Fixed advisory-lock key for the single evidence chain (single-tenant deployment).
// Without this, two audit writes racing inside concurrent transactions (e.g. two
// orchestration connectors retrying at the same instant) can both read the same
// "latest" row before either commits, forking the chain. The lock serializes the
// read-prevHash -> write-new-row sequence across concurrent transactions.
const CHAIN_LOCK_KEY = 727272n;

export async function appendAuditEvent(
  tx: Tx,
  entry: {
    entryType: "CONSENT_EVENT" | "DECISION" | "DSR" | "DRIVE" | "COMMAND" | "BREACH";
    actor: string;
    summary: string;
    payload: unknown;
    consentEventId?: string;
    decisionLogId?: string;
  },
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`;
  const last = await tx.auditEvent.findFirst({ orderBy: { seq: "desc" } });
  const prevHash = last?.hash ?? GENESIS_HASH;
  const body = canonical({
    entryType: entry.entryType,
    actor: entry.actor,
    summary: entry.summary,
    payload: entry.payload,
  });
  const hash = crypto.createHash("sha256").update(prevHash + body).digest("hex");

  return tx.auditEvent.create({
    data: {
      entryType: entry.entryType,
      actor: entry.actor,
      summary: entry.summary,
      payloadJson: entry.payload as Prisma.InputJsonValue,
      prevHash,
      hash,
      consentEventId: entry.consentEventId,
      decisionLogId: entry.decisionLogId,
    },
  });
}

export async function verifyChain(prisma: PrismaClient) {
  const events = await prisma.auditEvent.findMany({ orderBy: { seq: "asc" } });
  let prevHash = GENESIS_HASH;
  for (const e of events) {
    const body = canonical({
      entryType: e.entryType,
      actor: e.actor,
      summary: e.summary,
      payload: e.payloadJson,
    });
    const expected = crypto.createHash("sha256").update(prevHash + body).digest("hex");
    if (e.prevHash !== prevHash || e.hash !== expected) {
      return { ok: false, brokenAtSeq: e.seq, entries: events.length };
    }
    prevHash = e.hash;
  }
  return { ok: true, brokenAtSeq: null as number | null, entries: events.length };
}
