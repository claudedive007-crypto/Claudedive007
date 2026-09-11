import { PrismaClient } from "@prisma/client";
import { appendAuditEvent } from "../src/lib/ledger.js";
import { recomputeState, withdrawConsent } from "../src/services/consentService.js";
import { checkConsent } from "../src/services/validationService.js";

const prisma = new PrismaClient();
const DAY = 86_400_000;

const FIRST = ["Aarav", "Vivaan", "Aditya", "Arjun", "Rohan", "Karthik", "Vikram", "Rahul", "Sanjay", "Nikhil", "Diya", "Priya", "Kavya", "Sneha", "Divya", "Lakshmi", "Aishwarya", "Nandini", "Rajesh", "Suresh", "Ramesh", "Manoj", "Deepak", "Amit", "Pooja", "Neha", "Shruti", "Anjali", "Harish", "Ganesh"];
const LAST = ["Menon", "Nair", "Reddy", "Rao", "Iyer", "Kapoor", "Desai", "Sharma", "Gupta", "Verma", "Pillai", "Krishnan", "Bose", "Chatterjee", "Bhat", "Shetty", "Joshi", "Malhotra", "Bansal", "Mehta"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function ri(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Seeding Consentia demo data…");
  await prisma.command.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.decisionLog.deleteMany();
  await prisma.consentState.deleteMany();
  await prisma.consentEvent.deleteMany();
  await prisma.dSRequest.deleteMany();
  await prisma.drive.deleteMany();
  await prisma.connector.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.purpose.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.entity.deleteMany();

  const entity = await prisma.entity.create({ data: { name: "Meridian Bank Ltd." } });

  const purposeDefs = [
    { code: "account_servicing", name: "Account servicing", category: "Servicing", legalBasis: "LEGAL_OBLIGATION", description: "Operating the customer's account, statements and servicing communications.", defaultValidityDays: 3650 },
    { code: "kyc_aml", name: "KYC & AML checks", category: "Risk", legalBasis: "LEGAL_OBLIGATION", description: "Identity verification and anti-money-laundering screening.", defaultValidityDays: 3650 },
    { code: "loan_processing", name: "Loan processing", category: "Servicing", legalBasis: "CONTRACT", description: "Processing an active loan or credit application.", defaultValidityDays: 3650 },
    { code: "marketing", name: "Marketing communications", category: "Marketing", legalBasis: "CONSENT", description: "Offers, promotions and product updates by email, SMS or WhatsApp.", defaultValidityDays: 365 },
    { code: "profiling", name: "Profiling for offers", category: "Profiling", legalBasis: "CONSENT", description: "Building a profile to personalise offers and pricing.", defaultValidityDays: 365 },
    { code: "partner_sharing", name: "Partner data sharing", category: "Communications", legalBasis: "CONSENT", description: "Sharing data with select partner institutions for co-branded offers.", defaultValidityDays: 365 },
    { code: "analytics_tracking", name: "Analytics & tracking", category: "Tracking", legalBasis: "CONSENT", description: "App and web analytics used to improve the product.", defaultValidityDays: 180 },
    { code: "targeted_ads", name: "Targeted advertising", category: "Targeted Advertising", legalBasis: "CONSENT", description: "Using profile data to target ads on third-party platforms.", defaultValidityDays: 180 },
  ] as const;

  const purposes = new Map<string, Awaited<ReturnType<typeof prisma.purpose.create>>>();
  for (const p of purposeDefs) {
    const created = await prisma.purpose.create({ data: { ...p, entityId: entity.id } });
    purposes.set(p.code, created);
  }

  const languages = ["en", "ta", "hi", "kn", "te", "bn", "mr", "gu", "ml"];
  for (const lang of languages) {
    await prisma.notice.create({
      data: {
        version: "v4.2",
        language: lang,
        text: "Meridian Bank Ltd. is the Data Fiduciary for the personal data described below, under the Digital Personal Data Protection Act, 2023. You may withdraw any optional consent at any time from the Privacy Center.",
      },
    });
  }

  const connectorDefs = [
    { name: "Core banking (Finacle)", type: "core_banking", health: "UP", latencyMs: 34 },
    { name: "CRM (Salesforce)", type: "crm", health: "UP", latencyMs: 51 },
    { name: "Marketing (Adobe)", type: "marketing", health: "DEGRADED", latencyMs: 890 },
    { name: "SMS gateway", type: "sms", health: "UP", latencyMs: 120 },
    { name: "Loan origination system", type: "los", health: "UP", latencyMs: 68 },
    { name: "Data warehouse (Snowflake)", type: "warehouse", health: "DOWN", latencyMs: 0 },
    { name: "Vendor (CloudMailer)", type: "processor", health: "UP", latencyMs: 75, simulateFail: true, dpaExpiresAt: new Date(Date.now() - 62 * DAY) },
  ] as const;
  for (const c of connectorDefs) {
    await prisma.connector.create({ data: { ...c, entityId: entity.id } });
  }

  // ---- Named personas (continuity with the prototype) ----
  const meera = await prisma.customer.create({
    data: { entityId: entity.id, externalRef: "CUS-2048", displayName: "Meera Nair", preferredLanguage: "ta" },
  });
  const rohit = await prisma.customer.create({
    data: { entityId: entity.id, externalRef: "CUS-1147", displayName: "Rohit Kapoor", preferredLanguage: "en" },
  });
  await prisma.customer.create({
    data: { entityId: entity.id, externalRef: "CUS-3390", displayName: "Anika Bose", preferredLanguage: "en", dob: new Date("2009-03-11"), isMinor: true, guardianVerified: false },
  });
  await prisma.customer.create({
    data: { entityId: entity.id, externalRef: "CUS-4102", displayName: "Vihaan Kapoor", preferredLanguage: "en", dob: new Date("2009-01-05"), isMinor: true, guardianVerified: true, guardianMethod: "VIDEO_KYC" },
  });

  // Meera's narrative: grant Feb, re-affirm June, withdraw July (module guide's example).
  async function seedEvent(customerId: string, purposeId: string, action: "GRANT" | "WITHDRAW", createdAt: Date, channel: any = "BRANCH") {
    const event = await prisma.consentEvent.create({
      data: { customerId, purposeId, action, channel, noticeVersion: "v4.2", language: "ta", verificationMethod: "otp", createdAt },
    });
    await recomputeState(prisma, customerId, purposeId);
    await prisma.$transaction((tx) =>
      appendAuditEvent(tx, {
        entryType: "CONSENT_EVENT",
        actor: `channel:${channel}`,
        summary: `${action === "GRANT" ? "Consent granted" : "Consent withdrawn"} — seed data`,
        payload: { consentEventId: event.id },
        consentEventId: event.id,
      }),
    );
    return event;
  }

  const marketing = purposes.get("marketing")!;
  const profiling = purposes.get("profiling")!;
  const partnerSharing = purposes.get("partner_sharing")!;

  await seedEvent(meera.id, marketing.id, "GRANT", new Date("2026-02-14T09:12:00Z"));
  await seedEvent(meera.id, marketing.id, "GRANT", new Date("2026-06-02T10:00:00Z")); // notice v4.2 re-accept
  await seedEvent(meera.id, profiling.id, "GRANT", new Date("2026-02-14T09:14:00Z"));
  await seedEvent(meera.id, partnerSharing.id, "GRANT", new Date("2026-02-14T09:16:00Z"));

  // The "live" withdrawal — runs through the real service so orchestration fans out for real.
  await withdrawConsent({ customerExternalRef: "CUS-2048", purposeCode: "marketing", entityId: entity.id, actor: "Meera Nair (self-service)" });

  // ---- Synthetic customer pool for realistic dashboard/health numbers ----
  const consentPurposes = ["marketing", "profiling", "partner_sharing", "analytics_tracking", "targeted_ads"] as const;
  const pool: string[] = [];
  for (let i = 0; i < 90; i++) {
    const ref = `CUS-${ri(5000, 9999)}-${i}`;
    const name = `${rand(FIRST)} ${rand(LAST)}`;
    const customer = await prisma.customer.create({
      data: { entityId: entity.id, externalRef: ref, displayName: name, preferredLanguage: rand(languages) },
    });
    pool.push(customer.id);

    const purposeCount = ri(1, 3);
    const picked = [...consentPurposes].sort(() => Math.random() - 0.5).slice(0, purposeCount);
    for (const code of picked) {
      const purpose = purposes.get(code)!;
      const outcome = rand(["valid", "valid", "expiring", "expired", "withdrawn"]);
      let grantedAt: Date;
      if (outcome === "expired") grantedAt = new Date(Date.now() - ri(purpose.defaultValidityDays + 10, purpose.defaultValidityDays + 200) * DAY);
      else if (outcome === "expiring") grantedAt = new Date(Date.now() - ri(purpose.defaultValidityDays - 25, purpose.defaultValidityDays - 5) * DAY);
      else grantedAt = new Date(Date.now() - ri(1, 120) * DAY);

      await seedEvent(customer.id, purpose.id, "GRANT", grantedAt, rand(["MOBILE_APP", "WEB", "WHATSAPP", "BRANCH", "CALL_CENTRE", "EMAIL_LINK", "QR", "PARTNER_API"]));
      if (outcome === "withdrawn") {
        await seedEvent(customer.id, purpose.id, "WITHDRAW", new Date(grantedAt.getTime() + ri(5, 40) * DAY));
      }
    }
  }

  // ---- A few representative Validation Engine calls, so Audit Center / decision history isn't empty ----
  await checkConsent({ customerRef: "CUS-2048", purpose: "kyc_aml", system: "core_banking", entityId: entity.id });
  await checkConsent({ customerRef: "CUS-2048", purpose: "marketing", system: "crm", entityId: entity.id });
  await checkConsent({ customerRef: "CUS-2048", purpose: "analytics_tracking", system: "warehouse", entityId: entity.id });
  await checkConsent({ customerRef: "CUS-3390", purpose: "marketing", system: "crm", entityId: entity.id });
  await checkConsent({ customerRef: "CUS-1147", purpose: "account_servicing", system: "core_banking", entityId: entity.id });

  // ---- A couple of Drives and DSRs so those modules have data to show ----
  await prisma.drive.create({
    data: {
      name: "Marketing renewal — Q3",
      purposeId: marketing.id,
      audience: "Existing customers",
      channels: ["WHATSAPP", "EMAIL_LINK"],
      status: "ACTIVE",
      targeted: 48200,
      responses: Math.round(48200 * 0.61),
      approved: Math.round(48200 * 0.61 * 0.68),
      rejected: Math.round(48200 * 0.61 * 0.32),
    },
  });

  await prisma.dSRequest.create({
    data: { customerId: meera.id, type: "ACCESS", status: "IN_PROGRESS", dueAt: new Date(Date.now() + 25 * DAY) },
  });
  await prisma.dSRequest.create({
    data: { customerId: rohit.id, type: "ERASURE", status: "RECEIVED", dueAt: new Date(Date.now() + 2 * DAY) },
  });

  console.log(`Seeded 1 entity, ${purposeDefs.length} purposes, ${connectorDefs.length} connectors, ${pool.length + 4} customers.`);
  console.log("Waiting for in-flight orchestration retries to settle…");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Give any scheduled orchestration retries (setTimeout-based) a chance to land before exiting.
    await new Promise((r) => setTimeout(r, 7000));
    await prisma.$disconnect();
  });
