-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

DROP VIEW IF EXISTS "TokenUsageOnUser";
DROP VIEW IF EXISTS "TokenUsageOnTenant";

CREATE TABLE "new_Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "userId" TEXT NOT NULL,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "workingFolderId" TEXT,
    "pendingApproval" TEXT,
    "interactions" TEXT,
    CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Chat_workingFolderId_fkey" FOREIGN KEY ("workingFolderId") REFERENCES "FileDescriptor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chat" ("createdAt", "deletedAt", "id", "interactions", "pendingApproval", "requireApproval", "updatedAt", "userId") SELECT "createdAt", "deletedAt", "id", "interactions", "pendingApproval", "requireApproval", "updatedAt", "userId" FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";

-- RecreateViews
CREATE VIEW "TokenUsageOnUser" AS
    SELECT
        c."userId" as "userId",
        CAST(strftime('%s', DATETIME(t."createdAt" / 1000, 'unixepoch')) AS INTEGER) * 1000 AS "createdAt",
        t."model" as "model",
        t."provider" as "provider",
        SUM(t."inputTokens") AS "inputTokens",
        SUM(t."outputTokens") AS "outputTokens",
        SUM(t."noCacheInputTokens") AS "noCacheInputTokens",
        SUM(t."cachedInputTokens") AS "cachedInputTokens"
    FROM
        "ConsumedToken" t
        LEFT JOIN "Chat" c ON c.id = t."chatId"
    GROUP BY
        c."userId", t."model", t."provider", DATE(t."createdAt" / 1000, 'unixepoch');

CREATE VIEW "TokenUsageOnTenant" AS 
    SELECT
        uc."tenantId" AS "tenantId",
        CAST(strftime('%s', DATETIME(t."createdAt" / 1000, 'unixepoch')) AS INTEGER) * 1000 AS "createdAt",
        t."model" AS "model",
        t."provider" AS "provider",
        SUM(t."inputTokens") AS "inputTokens",
        SUM(t."outputTokens") AS "outputTokens",
        SUM(t."noCacheInputTokens") AS "noCacheInputTokens",
        SUM(t."cachedInputTokens") AS "cachedInputTokens"
    FROM
        "ConsumedToken" t
        LEFT JOIN (
            SELECT
                u."tenantId" AS "tenantId",
                c.id AS "id"
            FROM
                "User" u
                LEFT JOIN "Chat" c ON u.id = c."userId"
        ) uc ON uc.id = t."chatId"
    GROUP BY
        uc."tenantId",
        t."model",
        t."provider",
        DATE(t."createdAt" / 1000, 'unixepoch');

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
