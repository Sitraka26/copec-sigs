/**
 * Script de peuplement initial de la base de données.
 * À exécuter une seule fois par déploiement (une fois par site : Isaha, Mangabe, etc.)
 *
 * Usage : npx prisma db seed
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ⚠️ Change ce nom selon le site où ce backend est déployé
const NOM_ETABLISSEMENT = 'COPEC Isaha';

async function main() {
  console.log(`Seed pour l'établissement : ${NOM_ETABLISSEMENT}`);

  // 1. Établissement
  const etablissement = await prisma.etablissement.upsert({
    where: { id: 'etab-principal' },
    update: {},
    create: {
      id: 'etab-principal',
      nom: NOM_ETABLISSEMENT,
    },
  });

  // 2. Compte administrateur par défaut
  const motDePasseHash = await bcrypt.hash('admin1234', 10);
  await prisma.utilisateur.upsert({
    where: { email: 'admin@copec.local' },
    update: {},
    create: {
      etablissementId: etablissement.id,
      nom: 'Admin',
      prenom: 'Système',
      email: 'admin@copec.local',
      motDePasse: motDePasseHash,
      role: 'ADMIN',
    },
  });

  // 3. Année scolaire active
  const anneeScolaire = await prisma.anneeScolaire.upsert({
    where: { etablissementId_libelle: { etablissementId: etablissement.id, libelle: '2026-2027' } },
    update: {},
    create: {
      etablissementId: etablissement.id,
      libelle: '2026-2027',
      dateDebut: new Date('2026-09-08'),
      dateFin: new Date('2027-06-30'),
      active: true,
    },
  });

  // 4. Niveaux (cycle + ordre + filière pour la Terminale)
  const niveauxDef = [
    { libelle: 'Préscolaire', cycle: 'PRESCOLAIRE', ordre: 1 },
    { libelle: 'CP', cycle: 'PRIMAIRE', ordre: 2 },
    { libelle: 'CE1', cycle: 'PRIMAIRE', ordre: 3 },
    { libelle: 'CE2', cycle: 'PRIMAIRE', ordre: 4 },
    { libelle: 'CM1', cycle: 'PRIMAIRE', ordre: 5 },
    { libelle: 'CM2', cycle: 'PRIMAIRE', ordre: 6 },
    { libelle: '6ème', cycle: 'COLLEGE', ordre: 7 },
    { libelle: '5ème', cycle: 'COLLEGE', ordre: 8 },
    { libelle: '4ème', cycle: 'COLLEGE', ordre: 9 },
    { libelle: '3ème', cycle: 'COLLEGE', ordre: 10 },
    { libelle: '2nde', cycle: 'LYCEE', ordre: 11 },
    { libelle: '1ère', cycle: 'LYCEE', ordre: 12 },
    { libelle: 'Terminale', cycle: 'LYCEE', filiere: 'A1', ordre: 13 },
    { libelle: 'Terminale', cycle: 'LYCEE', filiere: 'A2', ordre: 13 },
    { libelle: 'Terminale', cycle: 'LYCEE', filiere: 'D', ordre: 13 },
  ];

  const niveaux = {};
  for (const def of niveauxDef) {
    const key = def.filiere ? `${def.libelle}-${def.filiere}` : def.libelle;
    const niveau = await prisma.niveau.create({ data: def });
    niveaux[key] = niveau;
  }

  // 5. Barème de frais confirmé avec l'école (année 2026-2027)
  const bareme = [
    { key: '6ème', droit: 70000, ecolage: 25000, fraisExamen: 0 },
    { key: '5ème', droit: 70000, ecolage: 26000, fraisExamen: 0 },
    { key: '4ème', droit: 70000, ecolage: 27000, fraisExamen: 0 },
    { key: '3ème', droit: 70000, ecolage: 28000, fraisExamen: 20000 }, // BEPC
    { key: '2nde', droit: 70000, ecolage: 29000, fraisExamen: 0 },
    { key: '1ère', droit: 70000, ecolage: 30000, fraisExamen: 0 },
    { key: 'Terminale-A1', droit: 70000, ecolage: 33000, fraisExamen: 20000 }, // BACC
    { key: 'Terminale-A2', droit: 70000, ecolage: 33000, fraisExamen: 20000 },
    { key: 'Terminale-D', droit: 70000, ecolage: 33000, fraisExamen: 20000 },
  ];

  for (const b of bareme) {
    await prisma.baremeFrais.create({
      data: {
        niveauId: niveaux[b.key].id,
        anneeScolaireId: anneeScolaire.id,
        droit: b.droit,
        ecolage: b.ecolage,
        fraisExamen: b.fraisExamen,
      },
    });
  }
  // ⚠️ Préscolaire et Primaire (CP à CM2) : montants non confirmés avec l'école,
  // pas de BaremeFrais créé pour l'instant — à ajouter une fois obtenus.

  // 6. Matières observées sur le bulletin réel (exemple filière D)
  const matieres = [
    { nom: 'Malagasy', coefficient: 3 },
    { nom: 'Français', coefficient: 2 },
    { nom: 'Histoire-Géographie', coefficient: 3 },
    { nom: 'Mathématiques', coefficient: 3 },
    { nom: 'Physique-Chimie', coefficient: 3 },
    { nom: 'Anglais', coefficient: 2 },
    { nom: 'SVT', coefficient: 3 },
    { nom: 'EPS', coefficient: 1 },
  ];
  for (const m of matieres) {
    await prisma.matiere.create({
      data: { ...m, etablissementId: etablissement.id },
    });
  }

  console.log('✅ Seed terminé.');
  console.log(`   Établissement : ${etablissement.nom}`);
  console.log(`   Connexion admin : admin@copec.local / admin1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });