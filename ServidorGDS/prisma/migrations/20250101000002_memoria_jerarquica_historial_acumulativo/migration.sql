-- Tarea 22.1: consolidacion jerarquica acumulativa con escenario preservado.
--
-- Conserva el HISTORIAL COMPLETO de la `Memoria_Jerarquica` (Req. 28.8): cada
-- nivel persiste sus eventos relevantes, cambios importantes, anomalias y
-- tendencias acumuladas, no solo el resumen. Anade ademas claves naturales
-- unicas por nivel para habilitar la consolidacion idempotente "generar o
-- actualizar" (Req. 28.1) via upsert.

-- ---------------------------------------------------------------------------
-- Nuevas columnas Json (historial completo) por nivel. Default '[]' para las
-- filas existentes; las columnas quedan NOT NULL.
-- ---------------------------------------------------------------------------
ALTER TABLE "gds_memoria_semanal"
  ADD COLUMN "eventos_relevantes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "cambios_importantes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "anomalias" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "tendencias" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "gds_memoria_mensual"
  ADD COLUMN "eventos_relevantes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "cambios_importantes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "anomalias" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "tendencias" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "gds_memoria_trimestral"
  ADD COLUMN "cambios_importantes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "anomalias" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "tendencias" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "gds_memoria_semestral"
  ADD COLUMN "cambios_importantes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "anomalias" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "tendencias" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "gds_memoria_global"
  ADD COLUMN "cambios_importantes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "anomalias" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "tendencias" JSONB NOT NULL DEFAULT '[]';

-- ---------------------------------------------------------------------------
-- Claves naturales unicas por nivel para la consolidacion idempotente (upsert).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "gds_memoria_semanal_analisis_id_comunidad_id_numero_semana_key"
  ON "gds_memoria_semanal"("analisis_id", "comunidad_id", "numero_semana");

CREATE UNIQUE INDEX "gds_memoria_mensual_analisis_id_comunidad_id_numero_mes_key"
  ON "gds_memoria_mensual"("analisis_id", "comunidad_id", "numero_mes");

CREATE UNIQUE INDEX "gds_memoria_trimestral_analisis_id_comunidad_id_numero_trime_key"
  ON "gds_memoria_trimestral"("analisis_id", "comunidad_id", "numero_trimestre");

CREATE UNIQUE INDEX "gds_memoria_semestral_analisis_id_comunidad_id_numero_semest_key"
  ON "gds_memoria_semestral"("analisis_id", "comunidad_id", "numero_semestre");

CREATE UNIQUE INDEX "gds_memoria_global_analisis_id_key"
  ON "gds_memoria_global"("analisis_id");
