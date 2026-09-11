-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('CONSENT', 'LEGAL_OBLIGATION', 'CONTRACT');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANT', 'WITHDRAW', 'EXPIRE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('VALID', 'WITHDRAWN', 'EXPIRED', 'PENDING', 'MINOR_BLOCKED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('ALLOW', 'BLOCK');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('MOBILE_APP', 'WEB', 'WHATSAPP', 'BRANCH', 'CALL_CENTRE', 'EMAIL_LINK', 'QR', 'PARTNER_API', 'PREFERENCE_CENTER');

-- CreateEnum
CREATE TYPE "DsrType" AS ENUM ('ACCESS', 'CORRECTION', 'ERASURE', 'GRIEVANCE', 'NOMINATION');

-- CreateEnum
CREATE TYPE "DsrStatus" AS ENUM ('RECEIVED', 'VERIFYING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriveStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConnectorHealth" AS ENUM ('UP', 'DEGRADED', 'DOWN');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ACKED', 'RETRYING', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "GuardianMethod" AS ENUM ('NONE', 'DIGILOCKER', 'VIDEO_KYC', 'IN_PERSON');

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "dob" TIMESTAMP(3),
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianVerified" BOOLEAN NOT NULL DEFAULT false,
    "guardianMethod" "GuardianMethod" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purpose" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "legalBasis" "LegalBasis" NOT NULL DEFAULT 'CONSENT',
    "category" TEXT NOT NULL,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "channel" "Channel" NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "driveId" TEXT,
    "receiptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentState" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "lastEventId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "decision" "Decision" NOT NULL,
    "reason" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "contextJson" JSONB,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "entryType" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentEventId" TEXT,
    "decisionLogId" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "health" "ConnectorHealth" NOT NULL DEFAULT 'UP',
    "latencyMs" INTEGER NOT NULL DEFAULT 40,
    "simulateFail" BOOLEAN NOT NULL DEFAULT false,
    "dpaExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL,
    "consentEventId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "owner" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "ackedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DSRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "DsrType" NOT NULL,
    "status" "DsrStatus" NOT NULL DEFAULT 'RECEIVED',
    "verifiedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "certificateHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DSRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drive" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "channels" "Channel"[],
    "scheduledAt" TIMESTAMP(3),
    "status" "DriveStatus" NOT NULL DEFAULT 'SCHEDULED',
    "targeted" INTEGER NOT NULL DEFAULT 0,
    "responses" INTEGER NOT NULL DEFAULT 0,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Drive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_externalRef_key" ON "Customer"("externalRef");

-- CreateIndex
CREATE INDEX "Customer_entityId_idx" ON "Customer"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Purpose_entityId_code_key" ON "Purpose"("entityId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Notice_version_language_key" ON "Notice"("version", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentEvent_receiptId_key" ON "ConsentEvent"("receiptId");

-- CreateIndex
CREATE INDEX "ConsentEvent_customerId_purposeId_idx" ON "ConsentEvent"("customerId", "purposeId");

-- CreateIndex
CREATE INDEX "ConsentEvent_createdAt_idx" ON "ConsentEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ConsentState_status_idx" ON "ConsentState"("status");

-- CreateIndex
CREATE INDEX "ConsentState_expiresAt_idx" ON "ConsentState"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentState_customerId_purposeId_key" ON "ConsentState"("customerId", "purposeId");

-- CreateIndex
CREATE INDEX "DecisionLog_customerId_purposeId_idx" ON "DecisionLog"("customerId", "purposeId");

-- CreateIndex
CREATE INDEX "DecisionLog_createdAt_idx" ON "DecisionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_seq_key" ON "AuditEvent"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_consentEventId_key" ON "AuditEvent"("consentEventId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_decisionLogId_key" ON "AuditEvent"("decisionLogId");

-- CreateIndex
CREATE INDEX "AuditEvent_entryType_idx" ON "AuditEvent"("entryType");

-- CreateIndex
CREATE UNIQUE INDEX "Connector_entityId_name_key" ON "Connector"("entityId", "name");

-- CreateIndex
CREATE INDEX "Command_consentEventId_idx" ON "Command"("consentEventId");

-- CreateIndex
CREATE INDEX "Command_status_idx" ON "Command"("status");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purpose" ADD CONSTRAINT "Purpose_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "Drive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentState" ADD CONSTRAINT "ConsentState_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentState" ADD CONSTRAINT "ConsentState_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_consentEventId_fkey" FOREIGN KEY ("consentEventId") REFERENCES "ConsentEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_decisionLogId_fkey" FOREIGN KEY ("decisionLogId") REFERENCES "DecisionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DSRequest" ADD CONSTRAINT "DSRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drive" ADD CONSTRAINT "Drive_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
