-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AccessGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "write" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "AccessGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AccessGroup" ("createdAt", "deletedAt", "description", "id", "isPersonal", "name", "read", "tenantId", "updatedAt", "write") SELECT "createdAt", "deletedAt", "description", "id", "isPersonal", "name", "read", "tenantId", "updatedAt", "write" FROM "AccessGroup";
DROP TABLE "AccessGroup";
ALTER TABLE "new_AccessGroup" RENAME TO "AccessGroup";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
