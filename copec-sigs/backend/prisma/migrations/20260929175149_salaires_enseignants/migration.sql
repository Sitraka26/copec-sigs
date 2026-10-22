/*
  Warnings:

  - You are about to drop the column `enseignantPrincipal` on the `Classe` table. All the data in the column will be lost.
  - Changed the type of `sexe` on the `Eleve` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `anneeScolaireId` to the `EmploiDuTemps` table without a default value. This is not possible if the table is not empty.
  - Added the required column `etablissementId` to the `EmploiDuTemps` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('MASCULIN', 'FEMININ');

-- AlterEnum
ALTER TYPE "StatutPaiement" ADD VALUE 'ANNULE';

-- AlterEnum
ALTER TYPE "StatutPresence" ADD VALUE 'DISPENSE';

-- DropForeignKey
ALTER TABLE "AnneeScolaire" DROP CONSTRAINT "AnneeScolaire_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Bulletin" DROP CONSTRAINT "Bulletin_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "CertificatDemande" DROP CONSTRAINT "CertificatDemande_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "CertificatDemande" DROP CONSTRAINT "CertificatDemande_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Classe" DROP CONSTRAINT "Classe_anneeScolaireId_fkey";

-- DropForeignKey
ALTER TABLE "Classe" DROP CONSTRAINT "Classe_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Discipline" DROP CONSTRAINT "Discipline_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "Discipline" DROP CONSTRAINT "Discipline_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Eleve" DROP CONSTRAINT "Eleve_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Enseignant" DROP CONSTRAINT "Enseignant_utilisateurId_fkey";

-- DropForeignKey
ALTER TABLE "EnseignantMatiere" DROP CONSTRAINT "EnseignantMatiere_enseignantId_fkey";

-- DropForeignKey
ALTER TABLE "EnseignantMatiere" DROP CONSTRAINT "EnseignantMatiere_matiereId_fkey";

-- DropForeignKey
ALTER TABLE "EvenementScolaire" DROP CONSTRAINT "EvenementScolaire_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Inscription" DROP CONSTRAINT "Inscription_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "Matiere" DROP CONSTRAINT "Matiere_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "NiveauMatiere" DROP CONSTRAINT "NiveauMatiere_matiereId_fkey";

-- DropForeignKey
ALTER TABLE "NiveauMatiere" DROP CONSTRAINT "NiveauMatiere_niveauId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "Paiement" DROP CONSTRAINT "Paiement_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "PlanificationScolaire" DROP CONSTRAINT "PlanificationScolaire_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Presence" DROP CONSTRAINT "Presence_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "ReclamationNote" DROP CONSTRAINT "ReclamationNote_eleveId_fkey";

-- DropForeignKey
ALTER TABLE "ReclamationNote" DROP CONSTRAINT "ReclamationNote_etablissementId_fkey";

-- DropForeignKey
ALTER TABLE "Utilisateur" DROP CONSTRAINT "Utilisateur_etablissementId_fkey";

-- DropIndex
DROP INDEX "Presence_eleveId_date_key";

-- AlterTable
ALTER TABLE "Classe" DROP COLUMN "enseignantPrincipal",
ADD COLUMN     "enseignantPrincipalId" TEXT;

-- AlterTable
ALTER TABLE "Eleve" DROP COLUMN "sexe",
ADD COLUMN     "sexe" "Sexe" NOT NULL;

-- AlterTable
ALTER TABLE "EmploiDuTemps" ADD COLUMN     "anneeScolaireId" TEXT NOT NULL,
ADD COLUMN     "etablissementId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Enseignant" ADD COLUMN     "salaireFixeOverride" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Etablissement" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN     "inscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Presence" ADD COLUMN     "matiereId" TEXT,
ADD COLUMN     "motif" TEXT;

-- CreateTable
CREATE TABLE "ParametreSalaire" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "salaireFixePresco" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaireFixePrimaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tauxHoraireSecondaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxHeuresSemaine" INTEGER NOT NULL DEFAULT 6,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametreSalaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceEnseignant" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "heuresPrevues" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heuresFaites" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "motifAbsence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresenceEnseignant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PresenceEnseignant_enseignantId_date_key" ON "PresenceEnseignant"("enseignantId", "date");

-- CreateIndex
CREATE INDEX "EmploiDuTemps_classeId_jour_idx" ON "EmploiDuTemps"("classeId", "jour");

-- CreateIndex
CREATE INDEX "Paiement_eleveId_anneeScolaireId_idx" ON "Paiement"("eleveId", "anneeScolaireId");

-- CreateIndex
CREATE INDEX "Presence_eleveId_date_idx" ON "Presence"("eleveId", "date");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnneeScolaire" ADD CONSTRAINT "AnneeScolaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_enseignantPrincipalId_fkey" FOREIGN KEY ("enseignantPrincipalId") REFERENCES "Enseignant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eleve" ADD CONSTRAINT "Eleve_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enseignant" ADD CONSTRAINT "Enseignant_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnseignantMatiere" ADD CONSTRAINT "EnseignantMatiere_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnseignantMatiere" ADD CONSTRAINT "EnseignantMatiere_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NiveauMatiere" ADD CONSTRAINT "NiveauMatiere_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES "Niveau"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NiveauMatiere" ADD CONSTRAINT "NiveauMatiere_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametreSalaire" ADD CONSTRAINT "ParametreSalaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceEnseignant" ADD CONSTRAINT "PresenceEnseignant_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceEnseignant" ADD CONSTRAINT "PresenceEnseignant_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamationNote" ADD CONSTRAINT "ReclamationNote_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamationNote" ADD CONSTRAINT "ReclamationNote_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploiDuTemps" ADD CONSTRAINT "EmploiDuTemps_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploiDuTemps" ADD CONSTRAINT "EmploiDuTemps_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanificationScolaire" ADD CONSTRAINT "PlanificationScolaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvenementScolaire" ADD CONSTRAINT "EvenementScolaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatDemande" ADD CONSTRAINT "CertificatDemande_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatDemande" ADD CONSTRAINT "CertificatDemande_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;
