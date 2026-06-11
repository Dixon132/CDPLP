import { PrismaClient } from './generated/prisma';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
    const adminEmail = "admin_qa@example.com";
    let user = await prisma.usuarios.findFirst({ where: { correo: adminEmail } });
    if (!user) {
        user = await prisma.usuarios.create({
            data: {
                nombre: "QA",
                apellido: "Admin",
                correo: adminEmail,
                contrase_a: hashSync("password123", 10),
            }
        });
        
        // Seed Roles
        const roles = ['TESORERO', 'SECRETARIO_GENERAL', 'PRESIDENTE'];
        for (const r of roles) {
            await prisma.roles.create({
                data: {
                    id_usuario: user.id_usuario,
                    rol: r as any
                }
            });
        }
        console.log("Seeded QA Admin with roles:", roles);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
