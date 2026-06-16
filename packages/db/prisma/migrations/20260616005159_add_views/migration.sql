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