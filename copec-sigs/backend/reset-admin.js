const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const etab = await prisma.etablissement.findFirst();
  if (!etab) {
    console.log('Pas d etablissement. Lance: npx prisma db seed');
    return;
  }

  const email = 'admin@copec.local';
  const hash = await bcrypt.hash('admin1234', 10);

  const existant = await prisma.utilisateur.findUnique({ where: { email } });
  if (existant) {
    await prisma.utilisateur.update({
      where: { email },
      data: { motDePasse: hash, role: 'ADMIN', actif: true },
    });
    console.log('Admin mis a jour');
  } else {
    await prisma.utilisateur.create({
      data: {
        etablissementId: etab.id,
        nom: 'Admin',
        prenom: 'COPEC',
        email,
        motDePasse: hash,
        role: 'ADMIN',
        actif: true,
      },
    });
    console.log('Admin cree');
  }
  console.log('Login:', email, '/', 'admin1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());