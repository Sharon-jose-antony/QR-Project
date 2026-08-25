-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QrSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "fileUploadId" TEXT,
    "payloadType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "analysisId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QrSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QrSubmission_fileUploadId_fkey" FOREIGN KEY ("fileUploadId") REFERENCES "FileUpload" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QrSubmission_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "UrlAnalysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UrlAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionRef" TEXT,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "port" INTEGER,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "redirectCount" INTEGER NOT NULL DEFAULT 0,
    "indicators" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiSummary" TEXT,
    "aiRiskExplain" TEXT,
    "aiRecommend" TEXT,
    "aiConfidence" REAL,
    "ssrfBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UrlAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UrlAnalysis_domain_fkey" FOREIGN KEY ("domain") REFERENCES "Domain" ("hostname") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostname" TEXT NOT NULL,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisCount" INTEGER NOT NULL DEFAULT 0,
    "avgRiskScore" REAL NOT NULL DEFAULT 0,
    "communityReportCount" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "isKnownSuspicious" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "RedirectObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "fromUrl" TEXT NOT NULL,
    "toUrl" TEXT NOT NULL,
    "toDomain" TEXT,
    "position" INTEGER NOT NULL,
    "wasBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RedirectObservation_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "UrlAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "domainId" TEXT,
    "targetUrl" TEXT NOT NULL,
    "targetDomain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityReport_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "userId" TEXT,
    "sessionRef" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "safeTarget" TEXT,
    "action" TEXT NOT NULL,
    "riskContrib" INTEGER NOT NULL DEFAULT 0,
    "prevRiskScore" INTEGER,
    "newRiskScore" INTEGER,
    "analysisId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityEvent_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "UrlAnalysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "baseScore" INTEGER NOT NULL,
    "finalScore" INTEGER NOT NULL,
    "factors" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskAssessment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "UrlAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ThreatRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThreatRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "QrSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThreatRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "UrlAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThreatRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "ipRef" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityTestRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "actualResult" TEXT NOT NULL,
    "securityControl" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "eventGenerated" TEXT,
    "riskChange" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityTestRun_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SystemConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_sid_idx" ON "Session"("sid");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "QrSubmission_userId_idx" ON "QrSubmission"("userId");

-- CreateIndex
CREATE INDEX "QrSubmission_createdAt_idx" ON "QrSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "QrSubmission_payloadType_idx" ON "QrSubmission"("payloadType");

-- CreateIndex
CREATE INDEX "UrlAnalysis_userId_idx" ON "UrlAnalysis"("userId");

-- CreateIndex
CREATE INDEX "UrlAnalysis_domain_idx" ON "UrlAnalysis"("domain");

-- CreateIndex
CREATE INDEX "UrlAnalysis_riskLevel_idx" ON "UrlAnalysis"("riskLevel");

-- CreateIndex
CREATE INDEX "UrlAnalysis_createdAt_idx" ON "UrlAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "UrlAnalysis_sessionRef_idx" ON "UrlAnalysis"("sessionRef");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_hostname_key" ON "Domain"("hostname");

-- CreateIndex
CREATE INDEX "Domain_hostname_idx" ON "Domain"("hostname");

-- CreateIndex
CREATE INDEX "Domain_riskLevel_idx" ON "Domain"("riskLevel");

-- CreateIndex
CREATE INDEX "Domain_lastSeen_idx" ON "Domain"("lastSeen");

-- CreateIndex
CREATE INDEX "Domain_communityReportCount_idx" ON "Domain"("communityReportCount");

-- CreateIndex
CREATE INDEX "RedirectObservation_analysisId_idx" ON "RedirectObservation"("analysisId");

-- CreateIndex
CREATE INDEX "RedirectObservation_toDomain_idx" ON "RedirectObservation"("toDomain");

-- CreateIndex
CREATE INDEX "CommunityReport_userId_idx" ON "CommunityReport"("userId");

-- CreateIndex
CREATE INDEX "CommunityReport_targetDomain_idx" ON "CommunityReport"("targetDomain");

-- CreateIndex
CREATE INDEX "CommunityReport_status_idx" ON "CommunityReport"("status");

-- CreateIndex
CREATE INDEX "CommunityReport_createdAt_idx" ON "CommunityReport"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityReport_category_idx" ON "CommunityReport"("category");

-- CreateIndex
CREATE INDEX "SecurityEvent_type_idx" ON "SecurityEvent"("type");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_idx" ON "SecurityEvent"("userId");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_sessionRef_idx" ON "SecurityEvent"("sessionRef");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_analysisId_key" ON "RiskAssessment"("analysisId");

-- CreateIndex
CREATE INDEX "ThreatRelation_sourceType_sourceId_idx" ON "ThreatRelation"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ThreatRelation_targetType_targetId_idx" ON "ThreatRelation"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ThreatRelation_relationType_idx" ON "ThreatRelation"("relationType");

-- CreateIndex
CREATE INDEX "ThreatRelation_createdAt_idx" ON "ThreatRelation"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "SecurityTestRun_adminId_idx" ON "SecurityTestRun"("adminId");

-- CreateIndex
CREATE INDEX "SecurityTestRun_testType_idx" ON "SecurityTestRun"("testType");

-- CreateIndex
CREATE INDEX "SecurityTestRun_passed_idx" ON "SecurityTestRun"("passed");

-- CreateIndex
CREATE INDEX "SecurityTestRun_createdAt_idx" ON "SecurityTestRun"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileUpload_storedName_key" ON "FileUpload"("storedName");

-- CreateIndex
CREATE INDEX "FileUpload_userId_idx" ON "FileUpload"("userId");

-- CreateIndex
CREATE INDEX "FileUpload_createdAt_idx" ON "FileUpload"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfiguration_key_key" ON "SystemConfiguration"("key");
