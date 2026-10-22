const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const etab = await prisma.etablissement.findFirst();
  if (!etab) throw new Error('Aucun établissement. Lance d’abord : npx prisma db seed');

  const email = 'econome@copec.local';
  const motDePasseClair = 'econome123';
  const hash = await bcrypt.hash(motDePasseClair, 10);

  const existant = await prisma.utilisateur.findUnique({ where: { email } });
  if (existant) {
    await prisma.utilisateur.update({
      where: { email },
      data: { motDePasse: hash, role: 'ECONOME', actif: true },
    });
    console.log('Compte mis à jour.');
  } else {
    await prisma.utilisateur.create({
      data: {
        etablissementId: etab.id,
        nom: 'Rabe',
        prenom: 'Économe',
        email,
        motDePasse: hash,
        role: 'ECONOME',
        actif: true,
      },
    });
    console.log('Compte créé.');
  }

  console.log('Email     :', email);
  console.log('Mot de passe :', motDePasseClair);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());