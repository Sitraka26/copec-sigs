/*
  Warnings:

  - Added the required column `anneeScolaireId` to the `Paiement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN     "anneeScolaireId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
