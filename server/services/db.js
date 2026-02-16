let prismaClient = null;
let prismaDisabled = false;

export async function getPrisma() {
  if (prismaDisabled || !process.env.DATABASE_URL) return null;
  if (prismaClient) return prismaClient;
  try {
    const prismaModule = await import('@prisma/client');
    const { PrismaClient } = prismaModule;
    prismaClient = new PrismaClient();
    return prismaClient;
  } catch {
    prismaDisabled = true;
    return null;
  }
}

export async function disconnectPrisma() {
  if (!prismaClient) return;
  await prismaClient.$disconnect();
  prismaClient = null;
}
