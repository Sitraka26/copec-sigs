-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT,
    "entiteId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
