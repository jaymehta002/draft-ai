-- AlterTable PostDraft
ALTER TABLE "PostDraft" ADD COLUMN "industryTag" TEXT;

-- CreateTable DraftVariant
CREATE TABLE "DraftVariant" (
    "id" TEXT NOT NULL,
    "postDraftId" TEXT NOT NULL,
    "variantIndex" INTEGER NOT NULL,
    "toneUsed" TEXT NOT NULL,
    "draftLength" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "subject" TEXT,
    "draftResponse" JSONB NOT NULL,
    "selectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftVariant_pkey" PRIMARY KEY ("id")
);

-- AlterTable SentOutreach
ALTER TABLE "SentOutreach" ADD COLUMN "toneUsed" TEXT;
ALTER TABLE "SentOutreach" ADD COLUMN "draftLengthUsed" TEXT;
ALTER TABLE "SentOutreach" ADD COLUMN "matchScore" INTEGER;
ALTER TABLE "SentOutreach" ADD COLUMN "variantId" TEXT;
ALTER TABLE "SentOutreach" ADD COLUMN "responseSource" TEXT;
ALTER TABLE "SentOutreach" ADD COLUMN "industryTag" TEXT;

-- AlterTable UserStats
ALTER TABLE "UserStats" ADD COLUMN "totalReplied" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN "repliedThisWeek" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN "replyRate7d" DOUBLE PRECISION;

-- CreateTable WinningTemplate
CREATE TABLE "WinningTemplate" (
    "id" TEXT NOT NULL,
    "industryTag" TEXT,
    "toneUsed" TEXT,
    "excerpt" TEXT NOT NULL,
    "matchScore" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WinningTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftVariant_postDraftId_idx" ON "DraftVariant"("postDraftId");
CREATE UNIQUE INDEX "DraftVariant_postDraftId_variantIndex_key" ON "DraftVariant"("postDraftId", "variantIndex");
CREATE INDEX "SentOutreach_variantId_idx" ON "SentOutreach"("variantId");
CREATE INDEX "WinningTemplate_industryTag_isPublished_idx" ON "WinningTemplate"("industryTag", "isPublished");

-- AddForeignKey
ALTER TABLE "DraftVariant" ADD CONSTRAINT "DraftVariant_postDraftId_fkey" FOREIGN KEY ("postDraftId") REFERENCES "PostDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SentOutreach" ADD CONSTRAINT "SentOutreach_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "DraftVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
