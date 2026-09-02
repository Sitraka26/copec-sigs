-- CreateTable
CREATE TABLE "NiveauMatiere" (
    "id" TEXT NOT NULL,
    "niveauId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "NiveauMatiere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NiveauMatiere_niveauId_matiereId_key" ON "NiveauMatiere"("niveauId", "matiereId");

-- AddForeignKey
ALTER TABLE "NiveauMatiere" ADD CONSTRAINT "NiveauMatiere_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES "Niveau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NiveauMatiere" ADD CONSTRAINT "NiveauMatiere_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
