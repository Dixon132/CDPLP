import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function testDelete() {
    try {
        const p = await prisma.postulaciones.delete({
            where: { id_postulacion: 5 }
        });
        console.log("Success:", p);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testDelete();
