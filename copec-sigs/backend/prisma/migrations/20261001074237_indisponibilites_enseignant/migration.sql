-- CreateTable
CREATE TABLE "IndisponibiliteEnseignant" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "motif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndisponibiliteEnseignant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndisponibiliteEnseignant_enseignantId_jour_idx" ON "IndisponibiliteEnseignant"("enseignantId", "jour");

-- AddForeignKey
ALTER TABLE "IndisponibiliteEnseignant" ADD CONSTRAINT "IndisponibiliteEnseignant_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndisponibiliteEnseignant" ADD CONSTRAINT "IndisponibiliteEnseignant_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
