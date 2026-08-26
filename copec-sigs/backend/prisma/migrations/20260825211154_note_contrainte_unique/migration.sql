/*
  Warnings:

  - You are about to drop the column `trimestre` on the `Bulletin` table. All the data in the column will be lost.
  - You are about to drop the column `trimestre` on the `Note` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[etablissementId,libelle]` on the table `AnneeScolaire` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eleveId,anneeScolaireId,periode]` on the table `Bulletin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[etablissementId,nom,anneeScolaireId]` on the table `Classe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eleveId,matiereId,periode]` on the table `Note` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[numeroRecu]` on the table `Paiement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `etablissementId` to the `AnneeScolaire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periode` to the `Bulletin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `etablissementId` to the `Classe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `etablissementId` to the `Eleve` table without a default value. This is not possible if the table is not empty.
  - Added the required column `etablissementId` to the `Matiere` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periode` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `typeFrais` on the `Paiement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `etablissementId` to the `Utilisateur` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TypeFrais" AS ENUM ('DROIT', 'ECOLAGE', 'FRAIS_EXAMEN', 'AUTRE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ECONOME';

-- DropIndex
DROP INDEX "AnneeScolaire_libelle_key";

-- DropIndex
DROP INDEX "Bulletin_eleveId_anneeScolaireId_trimestre_key";

-- DropIndex
DROP INDEX "Classe_nom_anneeScolaireId_key";

-- AlterTable
ALTER TABLE "AnneeScolaire" ADD COLUMN     "etablissementId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Bulletin" DROP COLUMN "trimestre",
ADD COLUMN     "periode" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Classe" ADD COLUMN     "etablissementId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Eleve" ADD COLUMN     "etablissementId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Matiere" ADD COLUMN     "etablissementId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Niveau" ADD COLUMN     "filiere" TEXT;

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "trimestre",
ADD COLUMN     "periode" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN     "numeroRecu" TEXT,
DROP COLUMN "typeFrais",
ADD COLUMN     "typeFrais" "TypeFrais" NOT NULL;

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "etablissementId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaremeFrais" (
    "id" TEXT NOT NULL,
    "niveauId" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "droit" DOUBLE PRECISION NOT NULL,
    "ecolage" DOUBLE PRECISION NOT NULL,
    "fraisExamen" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BaremeFrais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaremeFrais_niveauId_anneeScolaireId_key" ON "BaremeFrais"("niveauId", "anneeScolaireId");

-- CreateIndex
CREATE UNIQUE INDEX "AnneeScolaire_etablissementId_libelle_key" ON "AnneeScolaire"("etablissementId", "libelle");

-- CreateIndex
CREATE UNIQUE INDEX "Bulletin_eleveId_anneeScolaireId_periode_key" ON "Bulletin"("eleveId", "anneeScolaireId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "Classe_etablissementId_nom_anneeScolaireId_key" ON "Classe"("etablissementId", "nom", "anneeScolaireId");

-- CreateIndex
CREATE UNIQUE INDEX "Note_eleveId_matiereId_periode_key" ON "Note"("eleveId", "matiereId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_numeroRecu_key" ON "Paiement"("numeroRecu");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnneeScolaire" ADD CONSTRAINT "AnneeScolaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eleve" ADD CONSTRAINT "Eleve_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaremeFrais" ADD CONSTRAINT "BaremeFrais_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES "Niveau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaremeFrais" ADD CONSTRAINT "BaremeFrais_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
