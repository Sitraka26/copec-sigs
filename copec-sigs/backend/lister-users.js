const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.utilisateur.findMany({
    select: { id: true, email: true, nom: true, prenom: true, role: true, actif: true },
    orderBy: { role: 'asc' },
  });
  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());