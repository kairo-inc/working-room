-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AccessGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "write" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "AccessGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "refreshToken" TEXT,
    "privateDirId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "localSecretHash" TEXT,
    CONSTRAINT "User_privateDirId_fkey" FOREIGN KEY ("privateDirId") REFERENCES "FileDescriptor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocalSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "jwt" TEXT NOT NULL,
    "needsPasswordInitialization" BOOLEAN NOT NULL DEFAULT false,
    "sessionCode" TEXT,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "LocalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "userId" TEXT NOT NULL,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "pendingApproval" TEXT,
    "interactions" TEXT,
    CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isUserFacing" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileDescriptor" (
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
    "isSharedRoot" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "FileHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileDescriptorId" TEXT NOT NULL,
    "blobHash" TEXT,
    "operation" TEXT NOT NULL,
    "preview" TEXT,
    "userId" TEXT,
    CONSTRAINT "FileHistory_fileDescriptorId_fkey" FOREIGN KEY ("fileDescriptorId") REFERENCES "FileDescriptor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsumedToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "toolName" TEXT,
    "agentName" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "noCacheInputTokens" INTEGER NOT NULL,
    "cachedInputTokens" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    CONSTRAINT "ConsumedToken_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AccessGroupToFileDescriptor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AccessGroupToFileDescriptor_A_fkey" FOREIGN KEY ("A") REFERENCES "AccessGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AccessGroupToFileDescriptor_B_fkey" FOREIGN KEY ("B") REFERENCES "FileDescriptor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AccessGroupToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AccessGroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "AccessGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AccessGroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ChatToFileDescriptor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChatToFileDescriptor_A_fkey" FOREIGN KEY ("A") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ChatToFileDescriptor_B_fkey" FOREIGN KEY ("B") REFERENCES "FileDescriptor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_sub_key" ON "User"("sub");

-- CreateIndex
CREATE UNIQUE INDEX "User_privateDirId_key" ON "User"("privateDirId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalSession_jwt_key" ON "LocalSession"("jwt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalSession_userId_key" ON "LocalSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_AccessGroupToFileDescriptor_AB_unique" ON "_AccessGroupToFileDescriptor"("A", "B");

-- CreateIndex
CREATE INDEX "_AccessGroupToFileDescriptor_B_index" ON "_AccessGroupToFileDescriptor"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AccessGroupToUser_AB_unique" ON "_AccessGroupToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_AccessGroupToUser_B_index" ON "_AccessGroupToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ChatToFileDescriptor_AB_unique" ON "_ChatToFileDescriptor"("A", "B");

-- CreateIndex
CREATE INDEX "_ChatToFileDescriptor_B_index" ON "_ChatToFileDescriptor"("B");
