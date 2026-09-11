import { prisma } from "../lib/prisma.js";
import { appendAuditEvent } from "../lib/ledger.js";
import { fanOutConsentEvent } from "./orchestrationService.js";
import type { Channel, ConsentStatus } from "@prisma/client";

export const MINOR_BLOCKED_CATEGORIES = ["Marketing", "Profiling", "Tracking", "Targeted Advertising"];

export class NotFoundError extends Error {}

export async function recomputeState(tx: typeof prisma, customerId: string, purposeId: string) {
  const [customer, purpose, lastEvent] = await Promise.all([
    tx.customer.findUniqueOrThrow({ where: { id: customerId } }),
    tx.purpose.findUniqueOrThrow({ where: { id: purposeId } }),
    tx.consentEvent.findFirst({
      where: { customerId, purposeId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!lastEvent) return null;

  let status: ConsentStatus;
  let grantedAt: Date | null = null;
  let expiresAt: Date | null = null;
  let withdrawnAt: Date | null = null;

  if (
    customer.isMinor &&
    !customer.guardianVerified &&
    MINOR_BLOCKED_CATEGORIES.includes(purpose.category)
  ) {
    status = "MINOR_BLOCKED";
  } else if (lastEvent.action === "WITHDRAW") {
    status = "WITHDRAWN";
    withdrawnAt = lastEvent.createdAt;
  } else {
    // GRANT (or EXPIRE, which we treat the same as an implicit re-check of validity)
    expiresAt = new Date(lastEvent.createdAt.getTime() + purpose.defaultValidityDays * 86_400_000);
    grantedAt = lastEvent.createdAt;
    status = expiresAt.getTime() < Date.now() ? "EXPIRED" : "VALID";
  }

  return tx.consentState.upsert({
    where: { customerId_purposeId: { customerId, purposeId } },
    create: { customerId, purposeId, status, lastEventId: lastEvent.id, grantedAt, expiresAt, withdrawnAt },
    update: { status, lastEventId: lastEvent.id, grantedAt, expiresAt, withdrawnAt },
  });
}

export async function captureConsent(input: {
  customerExternalRef: string;
  purposeCode: string;
  channel: Channel;
  noticeVersion: string;
  language: string;
  verificationMethod: string;
  driveId?: string;
  entityId: string;
}) {
  const customer = await prisma.customer.findUnique({ where: { externalRef: input.customerExternalRef } });
  if (!customer) throw new NotFoundError(`Unknown customer ${input.customerExternalRef}`);
  const purpose = await prisma.purpose.findUnique({
    where: { entityId_code: { entityId: input.entityId, code: input.purposeCode } },
  });
  if (!purpose) throw new NotFoundError(`Unknown purpose ${input.purposeCode}`);

  const { event, state } = await prisma.$transaction(async (tx) => {
    const event = await tx.consentEvent.create({
      data: {
        customerId: customer.id,
        purposeId: purpose.id,
        action: "GRANT",
        channel: input.channel,
        noticeVersion: input.noticeVersion,
        language: input.language,
        verificationMethod: input.verificationMethod,
        driveId: input.driveId,
      },
    });
    const state = await recomputeState(tx as unknown as typeof prisma, customer.id, purpose.id);
    await appendAuditEvent(tx, {
      entryType: "CONSENT_EVENT",
      actor: `channel:${input.channel}`,
      summary: `Consent granted — ${customer.displayName} — ${purpose.name}`,
      payload: { customerRef: customer.externalRef, purpose: purpose.code, channel: input.channel, receiptId: event.receiptId },
      consentEventId: event.id,
    });
    return { event, state };
  });

  return { event, state, receiptId: event.receiptId };
}

export async function withdrawConsent(input: { customerExternalRef: string; purposeCode: string; entityId: string; actor?: string }) {
  const customer = await prisma.customer.findUnique({ where: { externalRef: input.customerExternalRef } });
  if (!customer) throw new NotFoundError(`Unknown customer ${input.customerExternalRef}`);
  const purpose = await prisma.purpose.findUnique({
    where: { entityId_code: { entityId: input.entityId, code: input.purposeCode } },
  });
  if (!purpose) throw new NotFoundError(`Unknown purpose ${input.purposeCode}`);

  const { event } = await prisma.$transaction(async (tx) => {
    const event = await tx.consentEvent.create({
      data: {
        customerId: customer.id,
        purposeId: purpose.id,
        action: "WITHDRAW",
        channel: "PREFERENCE_CENTER",
        noticeVersion: "n/a",
        language: customer.preferredLanguage,
        verificationMethod: "session",
      },
    });
    // INV-05: state + any cache must be invalidated before the write is acknowledged.
    await recomputeState(tx as unknown as typeof prisma, customer.id, purpose.id);
    await appendAuditEvent(tx, {
      entryType: "CONSENT_EVENT",
      actor: input.actor ?? "customer",
      summary: `Consent withdrawn — ${customer.displayName} — ${purpose.name}`,
      payload: { customerRef: customer.externalRef, purpose: purpose.code, receiptId: event.receiptId },
      consentEventId: event.id,
    });
    return { event };
  });

  // Fan-out happens synchronously with (immediately after) the event write, per REP-05 / Architecture §3B.
  const fanOut = await fanOutConsentEvent(event.id);

  return { event, receiptId: event.receiptId, fanOut };
}

export async function getCustomerConsents(externalRef: string) {
  const customer = await prisma.customer.findUnique({
    where: { externalRef },
    include: {
      consentStates: { include: { purpose: true } },
      consentEvents: { include: { purpose: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) throw new NotFoundError(`Unknown customer ${externalRef}`);
  return customer;
}
