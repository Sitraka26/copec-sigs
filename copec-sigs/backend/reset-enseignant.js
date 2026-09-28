const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('enseignant123', 10);

  const user = await prisma.utilisateur.upsert({
    where: { email: 'enseignant@copec.local' },
    update: {
      motDePasse: hash,
      role: 'ENSEIGNANT',
      actif: true,
      nom: 'Ramanantsoa',
      prenom: 'Hery',
    },
    create: {
      etablissementId: 'etab-principal',
      nom: 'Ramanantsoa',
      prenom: 'Hery',
      email: 'enseignant@copec.local',
      motDePasse: hash,
      role: 'ENSEIGNANT',
      actif: true,
    },
  });

  await prisma.enseignant.upsert({
    where: { utilisateurId: user.id },
    update: {},
    create: {
      utilisateurId: user.id,
      telephone: '0340000000',
    },
  });

  console.log('OK');
  console.log('Email     : enseignant@copec.local');
  console.log('Mot de passe : enseignant123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());