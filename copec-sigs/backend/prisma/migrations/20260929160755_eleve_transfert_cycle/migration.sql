-- AlterTable
ALTER TABLE "Eleve" ADD COLUMN     "bulletinOrigineUrl" TEXT,
ADD COLUMN     "cycleVise" "Cycle",
ADD COLUMN     "vientAutreEcole" BOOLEAN NOT NULL DEFAULT false;
