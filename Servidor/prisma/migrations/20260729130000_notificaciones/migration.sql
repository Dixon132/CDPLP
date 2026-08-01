-- CreateTable
CREATE TABLE "notificaciones" (
    "id_notificacion" SERIAL NOT NULL,
    "modulo" VARCHAR(60) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL DEFAULT 'info',
    "titulo" VARCHAR(160) NOT NULL,
    "descripcion" TEXT,
    "enlace" VARCHAR(200),
    "id_usuario" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "notificaciones_leidas" (
    "id_notificacion" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "leida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_leidas_pkey" PRIMARY KEY ("id_notificacion","id_usuario")
);

-- CreateIndex
CREATE INDEX "notificaciones_createdAt_idx" ON "notificaciones"("createdAt");

-- CreateIndex
CREATE INDEX "notificaciones_modulo_idx" ON "notificaciones"("modulo");

-- CreateIndex
CREATE INDEX "notificaciones_leidas_id_usuario_idx" ON "notificaciones_leidas"("id_usuario");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificaciones_leidas" ADD CONSTRAINT "notificaciones_leidas_id_notificacion_fkey" FOREIGN KEY ("id_notificacion") REFERENCES "notificaciones"("id_notificacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones_leidas" ADD CONSTRAINT "notificaciones_leidas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

