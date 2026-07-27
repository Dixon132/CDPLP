import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function testOrigen() {
    try {
        const o = await prisma.origen_movimiento.findMany({
            where: { id_postulacion: 5 }
        });
        console.log("Origen:", o);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testOrigen();
