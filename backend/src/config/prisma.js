import { PrismaClient } from '@prisma/client';

// Handle BigInt JSON serialization for paise values
BigInt.prototype.toJSON = function () {
  return Number(this);
};

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

