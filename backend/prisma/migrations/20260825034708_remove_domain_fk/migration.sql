-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UrlAnalysis" (
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
    CONSTRAINT "UrlAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UrlAnalysis" ("aiConfidence", "aiRecommend", "aiRiskExplain", "aiSummary", "createdAt", "domain", "id", "indicators", "port", "redirectCount", "riskLevel", "riskScore", "scheme", "sessionRef", "ssrfBlocked", "status", "updatedAt", "url", "userId") SELECT "aiConfidence", "aiRecommend", "aiRiskExplain", "aiSummary", "createdAt", "domain", "id", "indicators", "port", "redirectCount", "riskLevel", "riskScore", "scheme", "sessionRef", "ssrfBlocked", "status", "updatedAt", "url", "userId" FROM "UrlAnalysis";
DROP TABLE "UrlAnalysis";
ALTER TABLE "new_UrlAnalysis" RENAME TO "UrlAnalysis";
CREATE INDEX "UrlAnalysis_userId_idx" ON "UrlAnalysis"("userId");
CREATE INDEX "UrlAnalysis_domain_idx" ON "UrlAnalysis"("domain");
CREATE INDEX "UrlAnalysis_riskLevel_idx" ON "UrlAnalysis"("riskLevel");
CREATE INDEX "UrlAnalysis_createdAt_idx" ON "UrlAnalysis"("createdAt");
CREATE INDEX "UrlAnalysis_sessionRef_idx" ON "UrlAnalysis"("sessionRef");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
