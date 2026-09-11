import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getEntityId } from "../lib/entity.js";
import { verifyChain } from "../lib/ledger.js";
import { captureConsent, withdrawConsent, getCustomerConsents, NotFoundError } from "../services/consentService.js";
import { checkConsent } from "../services/validationService.js";
import { replayDeadLetter } from "../services/orchestrationService.js";

export const api = Router();

function handle(fn: (req: any, res: any) => Promise<void>) {
  return (req: any, res: any) => {
    fn(req, res).catch((err) => {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof z.ZodError) return res.status(400).json({ error: "validation_error", details: err.issues });
      console.error(err);
      res.status(500).json({ error: "internal_error" });
    });
  };
}

// ---------------------------------------------------------------- Validation Engine
const checkSchema = z.object({
  customer_ref: z.string(),
  purpose: z.string(),
  system: z.string(),
  context: z.unknown().optional(),
});
api.post(
  "/v1/consent/check",
  handle(async (req, res) => {
    const input = checkSchema.parse(req.body);
    const entityId = await getEntityId();
    const result = await checkConsent({ customerRef: input.customer_ref, purpose: input.purpose, system: input.system, context: input.context, entityId });
    res.status(result.decision === "ALLOW" ? 200 : 403).json({
      decision: result.decision,
      reason: result.reason,
      policy_version: result.policyVersion,
      decision_id: result.decisionId,
      latency_ms: result.latencyMs,
    });
  }),
);

// ---------------------------------------------------------------- Consent capture / withdraw
const captureSchema = z.object({
  customer_ref: z.string(),
  purpose: z.string(),
  channel: z.enum(["MOBILE_APP", "WEB", "WHATSAPP", "BRANCH", "CALL_CENTRE", "EMAIL_LINK", "QR", "PARTNER_API", "PREFERENCE_CENTER"]),
  notice_version: z.string(),
  language: z.string(),
  verification_method: z.string(),
  drive_id: z.string().optional(),
});
api.post(
  "/v1/consents",
  handle(async (req, res) => {
    const input = captureSchema.parse(req.body);
    const entityId = await getEntityId();
    const result = await captureConsent({
      customerExternalRef: input.customer_ref,
      purposeCode: input.purpose,
      channel: input.channel,
      noticeVersion: input.notice_version,
      language: input.language,
      verificationMethod: input.verification_method,
      driveId: input.drive_id,
      entityId,
    });
    res.status(201).json({ event_id: result.event.id, receipt_id: result.receiptId, state: result.state });
  }),
);

const withdrawSchema = z.object({ customer_ref: z.string(), purpose: z.string(), actor: z.string().optional() });
api.post(
  "/v1/consents/withdraw",
  handle(async (req, res) => {
    const input = withdrawSchema.parse(req.body);
    const entityId = await getEntityId();
    const result = await withdrawConsent({ customerExternalRef: input.customer_ref, purposeCode: input.purpose, entityId, actor: input.actor });
    res.status(200).json({ event_id: result.event.id, receipt_id: result.receiptId, fan_out: result.fanOut });
  }),
);

api.get(
  "/v1/customers/:ref/consents",
  handle(async (req, res) => {
    const customer = await getCustomerConsents(req.params.ref);
    res.json(customer);
  }),
);

api.get(
  "/v1/customers",
  handle(async (req, res) => {
    const entityId = await getEntityId();
    const customers = await prisma.customer.findMany({ where: { entityId }, orderBy: { createdAt: "asc" } });
    res.json(customers);
  }),
);

api.get(
  "/v1/purposes",
  handle(async (_req, res) => {
    const entityId = await getEntityId();
    const purposes = await prisma.purpose.findMany({ where: { entityId }, orderBy: { category: "asc" } });
    res.json(purposes);
  }),
);

// ---------------------------------------------------------------- Consent Repository
api.get(
  "/v1/consent-events",
  handle(async (req, res) => {
    const entityId = await getEntityId();
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const events = await prisma.consentEvent.findMany({
      where: { customer: { entityId } },
      include: { customer: true, purpose: true },
      orderBy: { createdAt: "desc" },
      take,
    });
    res.json(events);
  }),
);

api.get(
  "/v1/consent-states",
  handle(async (req, res) => {
    const entityId = await getEntityId();
    const states = await prisma.consentState.findMany({
      where: { customer: { entityId } },
      include: { customer: true, purpose: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(states);
  }),
);

// ---------------------------------------------------------------- Permission grid (VAL-06)
api.get(
  "/v1/permissions",
  handle(async (_req, res) => {
    const entityId = await getEntityId();
    const [purposes, connectors, states] = await Promise.all([
      prisma.purpose.findMany({ where: { entityId } }),
      prisma.connector.findMany({ where: { entityId } }),
      prisma.consentState.findMany({ where: { customer: { entityId } } }),
    ]);

    const grid = purposes.map((purpose) => {
      const purposeStates = states.filter((s) => s.purposeId === purpose.id);
      const cells = connectors.map((connector) => {
        if (purpose.legalBasis !== "CONSENT") {
          return { connector: connector.name, status: "allowed", reason: purpose.legalBasis === "LEGAL_OBLIGATION" ? "legal obligation" : "contractual necessity" };
        }
        if (connector.health === "DOWN") {
          return { connector: connector.name, status: "blocked", reason: "system unreachable" };
        }
        const total = purposeStates.length;
        const valid = purposeStates.filter((s) => s.status === "VALID").length;
        if (total === 0) return { connector: connector.name, status: "not_applicable", reason: "no consent records yet" };
        if (connector.simulateFail || connector.health === "DEGRADED") {
          return { connector: connector.name, status: "allowed_at_risk", reason: `${connector.name} is degraded — enforcement may lag` };
        }
        if (valid === total) return { connector: connector.name, status: "allowed", reason: `${valid}/${total} customers have valid consent` };
        if (valid === 0) return { connector: connector.name, status: "blocked", reason: "no customers currently consented" };
        return { connector: connector.name, status: "allowed_at_risk", reason: `${valid}/${total} customers have valid consent` };
      });
      return { purpose: purpose.name, purposeCode: purpose.code, legalBasis: purpose.legalBasis, cells };
    });

    res.json({ connectors: connectors.map((c) => c.name), grid });
  }),
);

// ---------------------------------------------------------------- Orchestration / DLQ
api.get(
  "/v1/commands",
  handle(async (req, res) => {
    const entityId = await getEntityId();
    const status = req.query.status as string | undefined;
    const commands = await prisma.command.findMany({
      where: { connector: { entityId }, ...(status ? { status: status as any } : {}) },
      include: { connector: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(commands);
  }),
);

api.post(
  "/v1/commands/:id/replay",
  handle(async (req, res) => {
    const result = await replayDeadLetter(req.params.id);
    res.json(result);
  }),
);

api.get(
  "/v1/connectors",
  handle(async (_req, res) => {
    const entityId = await getEntityId();
    const connectors = await prisma.connector.findMany({ where: { entityId }, orderBy: { name: "asc" } });
    res.json(connectors);
  }),
);

// ---------------------------------------------------------------- Audit Center
api.get(
  "/v1/audit",
  handle(async (req, res) => {
    const take = Math.min(Number(req.query.limit) || 100, 500);
    const events = await prisma.auditEvent.findMany({ orderBy: { seq: "desc" }, take });
    res.json(events);
  }),
);

api.get(
  "/v1/audit/verify",
  handle(async (_req, res) => {
    const result = await verifyChain(prisma);
    res.json(result);
  }),
);

// ---------------------------------------------------------------- Dashboard aggregate
api.get(
  "/v1/dashboard",
  handle(async (_req, res) => {
    const entityId = await getEntityId();
    const [total, withdrawn, expiringSoon, dlqOpen, recentEvents] = await Promise.all([
      prisma.consentState.count({ where: { customer: { entityId } } }),
      prisma.consentState.count({ where: { customer: { entityId }, status: "WITHDRAWN" } }),
      prisma.consentState.count({
        where: { customer: { entityId }, status: "VALID", expiresAt: { lte: new Date(Date.now() + 30 * 86_400_000) } },
      }),
      prisma.command.count({ where: { connector: { entityId }, status: "DEAD_LETTER" } }),
      prisma.consentEvent.findMany({
        where: { customer: { entityId } },
        include: { customer: true, purpose: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);
    res.json({ held: total, withdrawn, expiringSoon, dlqOpen, recentEvents });
  }),
);

// ---------------------------------------------------------------- Consent Health (HLT)
api.get(
  "/v1/consent-health",
  handle(async (_req, res) => {
    const entityId = await getEntityId();
    const states = await prisma.consentState.findMany({ where: { customer: { entityId } }, include: { purpose: true } });
    const bucket = { VALID: 0, EXPIRING: 0, EXPIRED: 0, WITHDRAWN: 0, PENDING: 0 };
    const soon = Date.now() + 30 * 86_400_000;
    for (const s of states) {
      if (s.status === "VALID" && s.expiresAt && s.expiresAt.getTime() <= soon) bucket.EXPIRING++;
      else if (s.status === "VALID") bucket.VALID++;
      else if (s.status === "EXPIRED") bucket.EXPIRED++;
      else if (s.status === "WITHDRAWN") bucket.WITHDRAWN++;
      else bucket.PENDING++;
    }
    const total = states.length || 1;
    const score = Math.round(((bucket.VALID + bucket.EXPIRING) / total) * 100);

    const byPurpose = new Map<string, { total: number; valid: number }>();
    for (const s of states) {
      const key = s.purpose.name;
      const entry = byPurpose.get(key) ?? { total: 0, valid: 0 };
      entry.total++;
      if (s.status === "VALID") entry.valid++;
      byPurpose.set(key, entry);
    }

    res.json({
      score,
      total: states.length,
      buckets: bucket,
      byPurpose: Array.from(byPurpose.entries()).map(([purpose, v]) => ({ purpose, ...v, pct: Math.round((v.valid / v.total) * 100) })),
    });
  }),
);

// ---------------------------------------------------------------- Drives (DRV)
const driveSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  audience: z.string(),
  channels: z.array(z.enum(["MOBILE_APP", "WEB", "WHATSAPP", "BRANCH", "CALL_CENTRE", "EMAIL_LINK", "QR", "PARTNER_API", "PREFERENCE_CENTER"])).min(1),
  scheduled_at: z.string().datetime().optional(),
});
api.post(
  "/v1/drives",
  handle(async (req, res) => {
    const input = driveSchema.parse(req.body);
    const entityId = await getEntityId();
    const purpose = await prisma.purpose.findUniqueOrThrow({ where: { entityId_code: { entityId, code: input.purpose } } });
    const drive = await prisma.drive.create({
      data: {
        name: input.name,
        purposeId: purpose.id,
        audience: input.audience,
        channels: input.channels,
        scheduledAt: input.scheduled_at ? new Date(input.scheduled_at) : null,
        status: input.scheduled_at ? "SCHEDULED" : "ACTIVE",
      },
    });
    res.status(201).json(drive);
  }),
);

api.get(
  "/v1/drives",
  handle(async (_req, res) => {
    const entityId = await getEntityId();
    const drives = await prisma.drive.findMany({ where: { purpose: { entityId } }, include: { purpose: true }, orderBy: { createdAt: "desc" } });
    res.json(drives);
  }),
);

api.post(
  "/v1/drives/:id/:action(pause|resume|cancel)",
  handle(async (req, res) => {
    const { id, action } = req.params;
    const status = action === "pause" ? "SCHEDULED" : action === "cancel" ? "CANCELLED" : "ACTIVE";
    const drive = await prisma.drive.update({ where: { id }, data: { status } });
    res.json(drive);
  }),
);

// ---------------------------------------------------------------- DSR (Privacy Center)
const dsrSchema = z.object({ customer_ref: z.string(), type: z.enum(["ACCESS", "CORRECTION", "ERASURE", "GRIEVANCE", "NOMINATION"]), sla_days: z.number().default(30) });
api.post(
  "/v1/dsr",
  handle(async (req, res) => {
    const input = dsrSchema.parse(req.body);
    const customer = await prisma.customer.findUniqueOrThrow({ where: { externalRef: input.customer_ref } });
    const dsr = await prisma.dSRequest.create({
      data: { customerId: customer.id, type: input.type, dueAt: new Date(Date.now() + input.sla_days * 86_400_000) },
    });
    await prisma.$transaction((tx) =>
      (async () => {
        const { appendAuditEvent } = await import("../lib/ledger.js");
        return appendAuditEvent(tx, {
          entryType: "DSR",
          actor: "customer",
          summary: `${input.type} request opened — ${customer.displayName}`,
          payload: { customerRef: customer.externalRef, type: input.type, dsrId: dsr.id },
        });
      })(),
    );
    res.status(201).json(dsr);
  }),
);

api.get(
  "/v1/dsr",
  handle(async (_req, res) => {
    const entityId = await getEntityId();
    const dsrs = await prisma.dSRequest.findMany({ where: { customer: { entityId } }, include: { customer: true }, orderBy: { createdAt: "desc" } });
    res.json(dsrs);
  }),
);
