-- CreateTable
CREATE TABLE "PostDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "postText" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "actionMode" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "draftResponse" JSONB NOT NULL,
    "profileVersion" TEXT NOT NULL,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentOutreach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postDraftId" TEXT,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "gmailMessageId" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "actionMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostDraft_userId_createdAt_idx" ON "PostDraft"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostDraft_userId_postId_key" ON "PostDraft"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "SentOutreach_postDraftId_key" ON "SentOutreach"("postDraftId");

-- CreateIndex
CREATE INDEX "SentOutreach_userId_sentAt_idx" ON "SentOutreach"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "SentOutreach_postId_idx" ON "SentOutreach"("postId");

-- AddForeignKey
ALTER TABLE "PostDraft" ADD CONSTRAINT "PostDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentOutreach" ADD CONSTRAINT "SentOutreach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentOutreach" ADD CONSTRAINT "SentOutreach_postDraftId_fkey" FOREIGN KEY ("postDraftId") REFERENCES "PostDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
