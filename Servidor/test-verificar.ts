import prismaClient from './src/utils/prismaClient';

async function run() {
    try {
        console.log("Checking colegiado...");
        const res = await prismaClient.colegiados.findUnique({ where: { carnet_identidad: '124346598' } });
        console.log("Colegiado:", res);

        console.log("Checking postulacion...");
        const res2 = await prismaClient.postulaciones.findFirst({
            where: { carnet_identidad: '124346598', estado: { in: ['EN_REVISION', 'ACTIVO'] } }
        });
        console.log("Postulacion:", res2);
    } catch (e) {
        console.error("Error occurred:", e);
    } finally {
        await prismaClient.$disconnect();
    }
}
run();
