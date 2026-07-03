-- AlterTable
ALTER TABLE "PostDraft" ADD COLUMN "postUrl" TEXT,
ADD COLUMN "recipientHandle" TEXT,
ADD COLUMN "recipientProfileUrl" TEXT;

-- AlterTable
ALTER TABLE "SentOutreach" ADD COLUMN "postUrl" TEXT,
ADD COLUMN "recipientHandle" TEXT,
ADD COLUMN "recipientProfileUrl" TEXT,
ADD COLUMN "responseReceivedAt" TIMESTAMP(3);
