const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
prisma.movimientos_financieros.findMany({orderBy: {id_movimiento: 'desc'}, take: 5}).then(console.log).finally(()=>prisma.$disconnect());
