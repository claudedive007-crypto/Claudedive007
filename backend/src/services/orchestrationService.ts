import { prisma } from "../lib/prisma.js";
import { appendAuditEvent } from "../lib/ledger.js";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1500, 4000]; // backoff between attempt 1→2 and 2→3
const DEFAULT_DLQ_OWNER = "Ananya Rao (DPO)";

/**
 * Fans a consent event out to every subscribed connector as an idempotent command
 * (ORC-01). Purposes whose legal basis isn't CONSENT are excluded (ORC-02) since
 * connectors never gated on consent for those in the first place.
 *
 * Attempt 1 runs synchronously so the API response reflects immediate results;
 * subsequent retries run on an in-process timer and keep updating the Command +
 * audit trail, which is enough to demo ORC-03..06 without a real job queue.
 */
export async function fanOutConsentEvent(consentEventId: string) {
  const event = await prisma.consentEvent.findUniqueOrThrow({
    where: { id: consentEventId },
    include: { purpose: true, customer: true },
  });
  if (event.purpose.legalBasis !== "CONSENT") {
    return { skipped: true, reason: "purpose is not consent-gated (ORC-02)", commands: [] as string[] };
  }

  const connectors = await prisma.connector.findMany({ where: { entityId: event.customer.entityId } });
  const commandIds: string[] = [];

  for (const connector of connectors) {
    const command = await prisma.command.create({
      data: { consentEventId: event.id, connectorId: connector.id, status: "PENDING" },
    });
    commandIds.push(command.id);
    await attemptDispatch(command.id, event.id, connector.id, event.action, event.customer.displayName, event.purpose.name, 1);
  }

  return { skipped: false, commands: commandIds };
}

async function attemptDispatch(
  commandId: string,
  consentEventId: string,
  connectorId: string,
  action: string,
  customerName: string,
  purposeName: string,
  attemptNumber: number,
) {
  const connector = await prisma.connector.findUniqueOrThrow({ where: { id: connectorId } });
  const willFail = connector.health === "DOWN" || connector.simulateFail || (connector.health === "DEGRADED" && attemptNumber === 1);
  const now = new Date();

  if (!willFail) {
    await prisma.command.update({
      where: { id: commandId },
      data: { status: "ACKED", attempts: attemptNumber, dispatchedAt: now, ackedAt: now, lastError: null },
    });
    await prisma.$transaction((tx) =>
      appendAuditEvent(tx, {
        entryType: "COMMAND",
        actor: `connector:${connector.name}`,
        summary: `${connector.name} acknowledged ${action.toLowerCase()} — ${customerName} — ${purposeName}`,
        payload: { connector: connector.name, action, attempt: attemptNumber },
      }),
    );
    return;
  }

  const error = connector.health === "DOWN" ? "connector unreachable" : connector.simulateFail ? "credentials rejected" : "timeout";

  if (attemptNumber >= MAX_ATTEMPTS) {
    await prisma.command.update({
      where: { id: commandId },
      data: { status: "DEAD_LETTER", attempts: attemptNumber, lastError: error, owner: DEFAULT_DLQ_OWNER },
    });
    await prisma.$transaction((tx) =>
      appendAuditEvent(tx, {
        entryType: "COMMAND",
        actor: `connector:${connector.name}`,
        summary: `${connector.name} exhausted retries → dead-letter queue (${error})`,
        payload: { connector: connector.name, action, attempts: attemptNumber, error, owner: DEFAULT_DLQ_OWNER },
      }),
    );
    return;
  }

  await prisma.command.update({
    where: { id: commandId },
    data: { status: "RETRYING", attempts: attemptNumber, lastError: error, dispatchedAt: now },
  });
  await prisma.$transaction((tx) =>
    appendAuditEvent(tx, {
      entryType: "COMMAND",
      actor: `connector:${connector.name}`,
      summary: `${connector.name} failed attempt ${attemptNumber} (${error}) — retrying`,
      payload: { connector: connector.name, action, attempt: attemptNumber, error },
    }),
  );

  const delay = RETRY_DELAYS_MS[attemptNumber - 1] ?? RETRY_DELAYS_MS.at(-1)!;
  setTimeout(() => {
    attemptDispatch(commandId, consentEventId, connectorId, action, customerName, purposeName, attemptNumber + 1).catch((err) =>
      console.error("orchestration retry failed", err),
    );
  }, delay);
}

export async function replayDeadLetter(commandId: string) {
  const command = await prisma.command.findUniqueOrThrow({ where: { id: commandId }, include: { connector: true } });
  const event = await prisma.consentEvent.findUniqueOrThrow({
    where: { id: command.consentEventId },
    include: { customer: true, purpose: true },
  });
  await prisma.command.update({ where: { id: commandId }, data: { status: "PENDING", attempts: 0, lastError: null, owner: null } });
  await attemptDispatch(commandId, event.id, command.connectorId, event.action, event.customer.displayName, event.purpose.name, 1);
  return { replayed: true };
}
