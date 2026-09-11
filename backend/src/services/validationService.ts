import { prisma } from "../lib/prisma.js";
import { appendAuditEvent } from "../lib/ledger.js";
import { MINOR_BLOCKED_CATEGORIES } from "./consentService.js";

const POLICY_VERSION = "policy-2026.07";

export type CheckInput = { customerRef: string; purpose: string; system: string; context?: unknown; entityId: string };
export type CheckResult = { decision: "ALLOW" | "BLOCK"; reason: string; policyVersion: string; decisionId: string; latencyMs: number };

/**
 * The Validation Engine (FSD VAL-01..05, INV-02). Fail-closed: any error, missing
 * data or uncertainty resolves to BLOCK, and the decision is written to the
 * hash-chained log before the response returns (VAL-04 / SYS-04).
 */
export async function checkConsent(input: CheckInput): Promise<CheckResult> {
  const start = Date.now();
  let decision: "ALLOW" | "BLOCK" = "BLOCK";
  let reason = "fail-closed: unresolved";

  try {
    const [customer, purpose] = await Promise.all([
      prisma.customer.findUnique({ where: { externalRef: input.customerRef } }),
      prisma.purpose.findUnique({ where: { entityId_code: { entityId: input.entityId, code: input.purpose } } }),
    ]);

    if (!customer) {
      reason = "unknown customer";
    } else if (!purpose) {
      reason = "unknown purpose";
    } else if (purpose.legalBasis !== "CONSENT") {
      decision = "ALLOW";
      reason = purpose.legalBasis === "LEGAL_OBLIGATION" ? "legal obligation" : "contractual necessity";
    } else if (customer.isMinor && !customer.guardianVerified && MINOR_BLOCKED_CATEGORIES.includes(purpose.category)) {
      reason = "minor — no verified guardian";
    } else {
      const state = await prisma.consentState.findUnique({
        where: { customerId_purposeId: { customerId: customer.id, purposeId: purpose.id } },
      });
      if (!state) reason = "no consent on record";
      else if (state.status === "WITHDRAWN") reason = "withdrawn";
      else if (state.status === "EXPIRED") reason = "expired";
      else if (state.status === "MINOR_BLOCKED") reason = "minor — no verified guardian";
      else if (state.status === "VALID") {
        decision = "ALLOW";
        reason = "consent granted";
      } else reason = "pending";
    }

    const latencyMs = Date.now() - start;
    const log = await prisma.$transaction(async (tx) => {
      const log = await tx.decisionLog.create({
        data: {
          customerId: customer?.id ?? (await ensureShadowCustomer(tx as unknown as typeof prisma, input.customerRef, input.entityId)),
          purposeId: purpose?.id ?? (await ensureShadowPurpose(tx as unknown as typeof prisma, input.purpose, input.entityId)),
          system: input.system,
          decision,
          reason,
          policyVersion: POLICY_VERSION,
          contextJson: (input.context ?? {}) as object,
          latencyMs,
        },
      });
      await appendAuditEvent(tx, {
        entryType: "DECISION",
        actor: `system:${input.system}`,
        summary: `${decision} — ${input.customerRef} / ${input.purpose} — ${reason}`,
        payload: { customerRef: input.customerRef, purpose: input.purpose, system: input.system, decision, reason },
        decisionLogId: log.id,
      });
      return log;
    });

    return { decision, reason, policyVersion: POLICY_VERSION, decisionId: log.id, latencyMs };
  } catch (err) {
    // Any unexpected failure still resolves to BLOCK and is still logged, never silently swallowed.
    const latencyMs = Date.now() - start;
    reason = `fail-closed: ${err instanceof Error ? err.message : "internal error"}`;
    const log = await prisma.decisionLog.create({
      data: {
        customerId: (await prisma.customer.findFirst({ where: { entityId: input.entityId } }))!.id,
        purposeId: (await prisma.purpose.findFirst({ where: { entityId: input.entityId } }))!.id,
        system: input.system,
        decision: "BLOCK",
        reason,
        policyVersion: POLICY_VERSION,
        contextJson: (input.context ?? {}) as object,
        latencyMs,
      },
    });
    return { decision: "BLOCK", reason, policyVersion: POLICY_VERSION, decisionId: log.id, latencyMs };
  }
}

// Decision logs must exist even for unknown customer/purpose refs (fail-closed audit trail),
// so we attach them to a shared per-entity "unknown" placeholder rather than losing the entry.
async function ensureShadowCustomer(tx: typeof prisma, ref: string, entityId: string) {
  const existing = await tx.customer.findFirst({ where: { entityId, externalRef: "UNKNOWN" } });
  if (existing) return existing.id;
  const created = await tx.customer.create({
    data: { entityId, externalRef: "UNKNOWN", displayName: `Unresolved (${ref})` },
  });
  return created.id;
}
async function ensureShadowPurpose(tx: typeof prisma, code: string, entityId: string) {
  const existing = await tx.purpose.findFirst({ where: { entityId, code: "unknown" } });
  if (existing) return existing.id;
  const created = await tx.purpose.create({
    data: { entityId, code: "unknown", name: `Unresolved (${code})`, description: "Placeholder for BLOCK decisions against an unresolvable purpose.", category: "Unresolved" },
  });
  return created.id;
}
