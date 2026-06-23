/*
  Warnings:

  - You are about to drop the column `isSharedRoot` on the `FileDescriptor` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileDescriptor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'exist',
    "birthtime" DATETIME NOT NULL,
    "mtime" DATETIME NOT NULL,
    "isModifying" BOOLEAN NOT NULL DEFAULT false,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isDirectory" BOOLEAN NOT NULL DEFAULT false,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "isChatDir" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "pathIds" TEXT NOT NULL,
    "parentId" TEXT,
    "blobHash" TEXT NOT NULL,
    "ownerId" TEXT,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "FileDescriptor_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FileDescriptor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileDescriptor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileDescriptor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FileDescriptor" ("birthtime", "blobHash", "createdAt", "deletedAt", "id", "isChatDir", "isDirectory", "isModifying", "isRoot", "mimeType", "mtime", "name", "ownerId", "parentId", "pathIds", "size", "status", "tenantId", "updatedAt") SELECT "birthtime", "blobHash", "createdAt", "deletedAt", "id", "isChatDir", "isDirectory", "isModifying", "isRoot", "mimeType", "mtime", "name", "ownerId", "parentId", "pathIds", "size", "status", "tenantId", "updatedAt" FROM "FileDescriptor";
DROP TABLE "FileDescriptor";
ALTER TABLE "new_FileDescriptor" RENAME TO "FileDescriptor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
