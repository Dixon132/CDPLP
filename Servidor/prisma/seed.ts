import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de documentos_requeridos...');

  const documentos = [
    {
      nombre: 'Carnet de Identidad',
      descripcion: 'Documento de identidad personal vigente',
      orden: 1,
      es_opcional: false,
    },
    {
      nombre: 'Título Profesional',
      descripcion: 'Título universitario o técnico profesional',
      orden: 2,
      es_opcional: false,
    },
    {
      nombre: 'Certificado de Antecedentes',
      descripcion: 'Certificado de antecedentes penales y policiales',
      orden: 3,
      es_opcional: false,
    },
    {
      nombre: 'Foto Carnet 3x4',
      descripcion: 'Fotografía tamaño carnet 3x4 cm en fondo blanco',
      orden: 4,
      es_opcional: false,
    },
    {
      nombre: 'Certificado de Nacimiento',
      descripcion: 'Certificado de nacimiento emitido por el SERECI',
      orden: 5,
      es_opcional: false,
    },
    {
      nombre: 'Documento de Respaldo Adicional',
      descripcion: 'Cualquier documento adicional de respaldo (opcional)',
      orden: 6,
      es_opcional: true,
    },
  ];

  for (const doc of documentos) {
    const existing = await prisma.documentos_requeridos.findFirst({
      where: { nombre: doc.nombre },
    });

    if (existing) {
      await prisma.documentos_requeridos.update({
        where: { id_doc_req: existing.id_doc_req },
        data: {
          descripcion: doc.descripcion,
          orden: doc.orden,
          es_opcional: doc.es_opcional,
          activo: true,
        },
      });
      console.log(`  ~ Documento actualizado: ${doc.nombre} (orden: ${doc.orden})`);
    } else {
      await prisma.documentos_requeridos.create({
        data: {
          nombre: doc.nombre,
          descripcion: doc.descripcion,
          orden: doc.orden,
          es_opcional: doc.es_opcional,
          activo: true,
        },
      });
      console.log(`  + Documento creado: ${doc.nombre} (orden: ${doc.orden})`);
    }
  }

  console.log('Seed completado: 6 documentos_requeridos procesados.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
