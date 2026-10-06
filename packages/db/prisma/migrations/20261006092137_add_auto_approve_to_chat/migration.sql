-- AlterTable
-- Chat is referenced by the TokenUsageOnUser and TokenUsageOnTenant views, so the table can not be redefined; add the column instead.
ALTER TABLE "Chat" ADD COLUMN "autoApprove" BOOLEAN NOT NULL DEFAULT false;
