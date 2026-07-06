-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN "outreachTone" TEXT DEFAULT 'professional',
ADD COLUMN "draftLength" TEXT DEFAULT 'medium',
ADD COLUMN "outreachLanguage" TEXT DEFAULT 'en';
