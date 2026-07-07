-- CreateTable UserEngagement
CREATE TABLE "UserEngagement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "weeklyGoal" INTEGER NOT NULL DEFAULT 5,
    "weeklyGoalExplicit" BOOLEAN NOT NULL DEFAULT false,
    "weekProgress" INTEGER NOT NULL DEFAULT 0,
    "lastWeekReset" TEXT NOT NULL,
    "pendingCelebrations" JSONB,
    "lastDigestSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserMilestone
CREATE TABLE "UserMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConversationMeta
CREATE TABLE "ConversationMeta" (
    "id" TEXT NOT NULL,
    "sentOutreachId" TEXT NOT NULL,
    "company" TEXT,
    "roleTitle" TEXT,
    "pipelineStage" TEXT NOT NULL DEFAULT 'OUTREACH',
    "notes" TEXT,
    "followUpDueAt" TIMESTAMP(3),
    "followUpDraftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMeta_pkey" PRIMARY KEY ("id")
);

-- AlterTable WinningTemplate
ALTER TABLE "WinningTemplate" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserEngagement_userId_key" ON "UserEngagement"("userId");

-- CreateIndex
CREATE INDEX "UserMilestone_userId_idx" ON "UserMilestone"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMilestone_userId_milestone_key" ON "UserMilestone"("userId", "milestone");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMeta_sentOutreachId_key" ON "ConversationMeta"("sentOutreachId");

-- CreateIndex
CREATE INDEX "WinningTemplate_userId_isPublished_idx" ON "WinningTemplate"("userId", "isPublished");

-- AddForeignKey
ALTER TABLE "UserEngagement" ADD CONSTRAINT "UserEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMilestone" ADD CONSTRAINT "UserMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMeta" ADD CONSTRAINT "ConversationMeta_sentOutreachId_fkey" FOREIGN KEY ("sentOutreachId") REFERENCES "SentOutreach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
