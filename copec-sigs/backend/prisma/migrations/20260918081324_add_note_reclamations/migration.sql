-- CreateEnum
CREATE TYPE "StatutReclamationNote" AS ENUM ('OUVERTE', 'EN_COURS', 'TRAITEE', 'REJETEE');

-- CreateTable
CREATE TABLE "ReclamationNote" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "periode" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" "StatutReclamationNote" NOT NULL DEFAULT 'OUVERTE',
    "reponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReclamationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReclamationNote_etablissementId_statut_idx" ON "ReclamationNote"("etablissementId", "statut");

-- CreateIndex
CREATE INDEX "ReclamationNote_eleveId_matiereId_periode_idx" ON "ReclamationNote"("eleveId", "matiereId", "periode");

-- AddForeignKey
ALTER TABLE "ReclamationNote" ADD CONSTRAINT "ReclamationNote_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamationNote" ADD CONSTRAINT "ReclamationNote_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamationNote" ADD CONSTRAINT "ReclamationNote_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamationNote" ADD CONSTRAINT "ReclamationNote_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
