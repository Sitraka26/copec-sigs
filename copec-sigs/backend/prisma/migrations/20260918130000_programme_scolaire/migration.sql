CREATE TABLE "PlanificationScolaire" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "periode" INTEGER,
    "titre" TEXT NOT NULL,
    "objectifs" TEXT,
    "contenu" TEXT,
    "volumeHoraire" DOUBLE PRECISION,
    "statut" TEXT NOT NULL DEFAULT 'A_PLANIFIER',
    "datePrevue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanificationScolaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvenementScolaire" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "cible" TEXT NOT NULL DEFAULT 'TOUS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvenementScolaire_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanificationScolaire_etablissementId_classeId_matiereId_idx" ON "PlanificationScolaire"("etablissementId", "classeId", "matiereId");
CREATE INDEX "PlanificationScolaire_anneeScolaireId_periode_idx" ON "PlanificationScolaire"("anneeScolaireId", "periode");
CREATE INDEX "EvenementScolaire_etablissementId_dateDebut_idx" ON "EvenementScolaire"("etablissementId", "dateDebut");

ALTER TABLE "PlanificationScolaire" ADD CONSTRAINT "PlanificationScolaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificationScolaire" ADD CONSTRAINT "PlanificationScolaire_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificationScolaire" ADD CONSTRAINT "PlanificationScolaire_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificationScolaire" ADD CONSTRAINT "PlanificationScolaire_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvenementScolaire" ADD CONSTRAINT "EvenementScolaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvenementScolaire" ADD CONSTRAINT "EvenementScolaire_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
