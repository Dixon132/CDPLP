-- AlterTable
ALTER TABLE "movimientos_financieros" ADD COLUMN "comprobante" VARCHAR(300);
-- CreateTable
CREATE TABLE "especialidades" (
 "id_especialidad" SERIAL NOT NULL,
 "nombre" VARCHAR(150) NOT NULL,
 "descripcion" TEXT,
 "activo" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id_especialidad")
);
-- CreateTable
CREATE TABLE "documentos_requeridos" (
 "id_doc_req" SERIAL NOT NULL,
 "nombre" VARCHAR(200) NOT NULL,
 "descripcion" TEXT,
 "activo" BOOLEAN NOT NULL DEFAULT true,
 "es_opcional" BOOLEAN NOT NULL DEFAULT false,
 "orden" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "documentos_requeridos_pkey" PRIMARY KEY ("id_doc_req")
);
-- CreateIndex
CREATE UNIQUE INDEX "especialidades_nombre_key" ON "especialidades"("nombre");
