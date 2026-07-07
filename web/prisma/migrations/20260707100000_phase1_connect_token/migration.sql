-- AlterTable
ALTER TABLE "User" ADD COLUMN "extensionLastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ConnectToken" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectToken_state_key" ON "ConnectToken"("state");

-- CreateIndex
CREATE INDEX "ConnectToken_userId_createdAt_idx" ON "ConnectToken"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConnectToken" ADD CONSTRAINT "ConnectToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
