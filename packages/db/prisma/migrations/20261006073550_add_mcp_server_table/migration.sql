-- CreateTable
CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "accessToken" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tools" TEXT NOT NULL DEFAULT '[]',
    "toolsFetchedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "McpServer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

