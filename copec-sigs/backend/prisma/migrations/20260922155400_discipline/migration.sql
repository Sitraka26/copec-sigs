-- CreateEnum
CREATE TYPE "TypeDiscipline" AS ENUM ('OBSERVATION_POSITIVE', 'OBSERVATION_NEGATIVE', 'AVERTISSEMENT', 'BLAME', 'EXCLUSION_TEMPORAIRE', 'AUTRE');

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "type" "TypeDiscipline" NOT NULL,
    "motif" TEXT NOT NULL,
    "description" TEXT,
    "dateIncident" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discipline_eleveId_dateIncident_idx" ON "Discipline"("eleveId", "dateIncident");

-- CreateIndex
CREATE INDEX "Discipline_etablissementId_idx" ON "Discipline"("etablissementId");

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
