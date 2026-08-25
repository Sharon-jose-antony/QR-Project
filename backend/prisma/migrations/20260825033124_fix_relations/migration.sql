-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ThreatRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ThreatRelation" ("createdAt", "id", "metadata", "relationType", "sourceId", "sourceType", "targetId", "targetType") SELECT "createdAt", "id", "metadata", "relationType", "sourceId", "sourceType", "targetId", "targetType" FROM "ThreatRelation";
DROP TABLE "ThreatRelation";
ALTER TABLE "new_ThreatRelation" RENAME TO "ThreatRelation";
CREATE INDEX "ThreatRelation_sourceType_sourceId_idx" ON "ThreatRelation"("sourceType", "sourceId");
CREATE INDEX "ThreatRelation_targetType_targetId_idx" ON "ThreatRelation"("targetType", "targetId");
CREATE INDEX "ThreatRelation_relationType_idx" ON "ThreatRelation"("relationType");
CREATE INDEX "ThreatRelation_createdAt_idx" ON "ThreatRelation"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
