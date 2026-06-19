-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "descriptionForAgent" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "workingFolderId" TEXT,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "Agent_workingFolderId_fkey" FOREIGN KEY ("workingFolderId") REFERENCES "FileDescriptor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Agent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
