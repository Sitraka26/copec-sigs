const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.utilisateur.findFirst({ where: { role: 'DIRECTEUR' } });
  if (!d) {
    console.log('Aucun directeur en base');
    return;
  }
  const hash = await bcrypt.hash('directeur123', 10);
  await prisma.utilisateur.update({
    where: { id: d.id },
    data: { motDePasse: hash, actif: true },
  });
  console.log('Login directeur:', d.email, '/', 'directeur123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());