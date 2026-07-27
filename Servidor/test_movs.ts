import prismaClient from './src/utils/prismaClient'

async function main() {
    const movs = await prismaClient.movimientos_financieros.findMany({
        take: 5,
        orderBy: { id_movimiento: 'desc' },
        include: { usuario: true }
    })
    console.log(JSON.stringify(movs, null, 2))
}

main().catch(console.error).finally(() => prismaClient.$disconnect())
