-- CreateEnum
CREATE TYPE "StatutCertificat" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');

-- CreateTable
CREATE TABLE "CertificatDemande" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" "StatutCertificat" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRejet" TEXT,
    "valideParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valideLe" TIMESTAMP(3),

    CONSTRAINT "CertificatDemande_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificatDemande_eleveId_createdAt_idx" ON "CertificatDemande"("eleveId", "createdAt");

-- CreateIndex
CREATE INDEX "CertificatDemande_etablissementId_statut_idx" ON "CertificatDemande"("etablissementId", "statut");

-- AddForeignKey
ALTER TABLE "CertificatDemande" ADD CONSTRAINT "CertificatDemande_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatDemande" ADD CONSTRAINT "CertificatDemande_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatDemande" ADD CONSTRAINT "CertificatDemande_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatDemande" ADD CONSTRAINT "CertificatDemande_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
