-- CreateEnum
CREATE TYPE "NivelAcceso" AS ENUM ('SIN_ACCESO', 'OBSERVADOR', 'EDITOR');

-- CreateTable
CREATE TABLE "catalogo_roles" (
    "id_rol_catalogo" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_roles_pkey" PRIMARY KEY ("id_rol_catalogo")
);

-- CreateTable
CREATE TABLE "recursos" (
    "id_recurso" SERIAL NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "id_padre" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recursos_pkey" PRIMARY KEY ("id_recurso")
);

-- CreateTable
CREATE TABLE "rol_permisos" (
    "id_rol_permiso" SERIAL NOT NULL,
    "id_rol_catalogo" INTEGER NOT NULL,
    "id_recurso" INTEGER NOT NULL,
    "nivel" "NivelAcceso" NOT NULL DEFAULT 'SIN_ACCESO',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rol_permisos_pkey" PRIMARY KEY ("id_rol_permiso")
);

-- CreateTable
CREATE TABLE "usuario_permisos" (
    "id_usuario_permiso" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_recurso" INTEGER NOT NULL,
    "nivel" "NivelAcceso" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_permisos_pkey" PRIMARY KEY ("id_usuario_permiso")
);

-- AlterTable
ALTER TABLE "roles" ADD COLUMN "id_rol_catalogo" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_roles_nombre_key" ON "catalogo_roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "recursos_clave_key" ON "recursos"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "rol_permisos_id_rol_catalogo_id_recurso_key" ON "rol_permisos"("id_rol_catalogo", "id_recurso");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_permisos_id_usuario_id_recurso_key" ON "usuario_permisos"("id_usuario", "id_recurso");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_id_rol_catalogo_fkey" FOREIGN KEY ("id_rol_catalogo") REFERENCES "catalogo_roles"("id_rol_catalogo") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recursos" ADD CONSTRAINT "recursos_id_padre_fkey" FOREIGN KEY ("id_padre") REFERENCES "recursos"("id_recurso") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_id_rol_catalogo_fkey" FOREIGN KEY ("id_rol_catalogo") REFERENCES "catalogo_roles"("id_rol_catalogo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_id_recurso_fkey" FOREIGN KEY ("id_recurso") REFERENCES "recursos"("id_recurso") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_permisos" ADD CONSTRAINT "usuario_permisos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_permisos" ADD CONSTRAINT "usuario_permisos_id_recurso_fkey" FOREIGN KEY ("id_recurso") REFERENCES "recursos"("id_recurso") ON DELETE CASCADE ON UPDATE NO ACTION;
