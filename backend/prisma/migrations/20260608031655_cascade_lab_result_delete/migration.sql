-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Biomarker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "panelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "referenceMin" REAL,
    "referenceMax" REAL,
    "flag" TEXT NOT NULL,
    CONSTRAINT "Biomarker_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Biomarker" ("flag", "id", "name", "panelId", "referenceMax", "referenceMin", "unit", "value") SELECT "flag", "id", "name", "panelId", "referenceMax", "referenceMin", "unit", "value" FROM "Biomarker";
DROP TABLE "Biomarker";
ALTER TABLE "new_Biomarker" RENAME TO "Biomarker";
CREATE TABLE "new_Panel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "labResultId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Panel_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Panel" ("id", "labResultId", "name") SELECT "id", "labResultId", "name" FROM "Panel";
DROP TABLE "Panel";
ALTER TABLE "new_Panel" RENAME TO "Panel";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
