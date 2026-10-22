const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.utilisateur.findMany({
    select: {
      email: true,
      role: true,
      actif: true,
      nom: true,
      prenom: true,
    },
    orderBy: { role: 'asc' },
  });
  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());