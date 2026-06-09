-- ===========================================================================
-- Migración: esquema ampliado de la Plataforma_GDS sobre la BD DEDICADA.
--
-- Crea TODAS las tablas `gds_*` del servicio (institución, escenarios, análisis
-- y su subgrafo en cascada, memoria jerárquica de cinco niveles, Memoria_Semantica
-- vectorial `gds_embedding`, memoria histórica `gds_tendencia_historica` /
-- `gds_evento_historico`, calibración y usuarios/roles de la plataforma).
--
-- Debe ejecutarse DESPUÉS de `20250101000000_enable_pgvector` (la extensión
-- `vector` debe existir antes de crear `gds_embedding.vector`). El
-- `CREATE EXTENSION IF NOT EXISTS "vector"` se conserva como red de seguridad
-- idempotente.
--
-- Aislamiento total (Req. 25.1, 25.3): se aplica SOLO sobre la BD propia del
-- ServidorGDS (`DATABASE_URL` -> gds_db), NUNCA sobre la BD del colegio.
--
-- Integridad (Req. 9.2, 9.4, 25.2, 25.4, 25.7, 28.9, 36.1, 36.5, 39.1, 39.3):
--  - Cascada dentro del subgrafo cuya raíz es `gds_analisis`.
--  - FK RESTRICTIVA `gds_comunidad_digital`/`gds_ciclo_semanal`/`gds_evidences`/
--    `gds_reporte`/`gds_embedding` -> `gds_institucion` (la institución no se
--    borra si está referenciada).
--  - Único `(analisis_id, institucion_id)` en `gds_comunidad_digital` y
--    `(analisis_id, institucion_id, numero_semana)` en `gds_ciclo_semanal`.
--  - Índice vectorial aproximado (`hnsw`) sobre `gds_embedding.vector` para
--    `Embeddings_Search` (Req. 36.3); se crea por SQL nativo al final.
-- ===========================================================================

-- CreateExtension (idempotente; ya creada por 20250101000000_enable_pgvector)
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "gds_institucion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "radio_metros" INTEGER NOT NULL,
    "logo_url" TEXT,
    "descripcion" TEXT,

    CONSTRAINT "gds_institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_scenarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "contexto" TEXT NOT NULL,
    "intensidad" TEXT NOT NULL,
    "duracion_esperada" INTEGER NOT NULL,
    "eventos_detonantes" JSONB NOT NULL,
    "actores_involucrados" JSONB NOT NULL,
    "categoria" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "configuracion_comportamiento" JSONB NOT NULL,
    "parametros" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "es_predefinido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "gds_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_analisis" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "escenario" TEXT NOT NULL,
    "escenario_es_personalizado" BOOLEAN NOT NULL DEFAULT false,
    "escenario_id" TEXT,
    "escenario_version" INTEGER,
    "semanas_totales" INTEGER NOT NULL,
    "radio_analisis" INTEGER NOT NULL,
    "salt_anon" TEXT NOT NULL,
    "modo_ejecucion" TEXT NOT NULL,
    "intervalo_tiempo_real_ms" INTEGER,
    "estado_ejecucion" TEXT NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "gds_analisis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_comunidad_digital" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "institucion_id" TEXT NOT NULL,
    "zona_latitud" DOUBLE PRECISION NOT NULL,
    "zona_longitud" DOUBLE PRECISION NOT NULL,
    "zona_radio_metros" INTEGER NOT NULL,

    CONSTRAINT "gds_comunidad_digital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_ciclo_semanal" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "institucion_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "etapas_completadas" TEXT NOT NULL,
    "bloqueado_en" TIMESTAMP(3),

    CONSTRAINT "gds_ciclo_semanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_generacion" (
    "id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "contrato_normalizado" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "estado_generacion" TEXT NOT NULL,

    CONSTRAINT "gds_generacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_usuario_sintetico" (
    "id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "seudonimo" TEXT NOT NULL,
    "perfil_conductual" TEXT NOT NULL,
    "frecuencia" DOUBLE PRECISION NOT NULL,
    "estilo_escritura" TEXT NOT NULL,
    "intereses" TEXT NOT NULL,
    "nivel_participacion" TEXT NOT NULL,

    CONSTRAINT "gds_usuario_sintetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_historial_usuario" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "actividad" JSONB NOT NULL,

    CONSTRAINT "gds_historial_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_score_asociacion" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "gds_score_asociacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_resultado_analisis" (
    "id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "datos_nlp" JSONB,
    "datos_vision" JSONB,
    "datos_temporal" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gds_resultado_analisis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_dimension_riesgo" (
    "id" TEXT NOT NULL,
    "resultado_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "minimo" DOUBLE PRECISION NOT NULL,
    "maximo" DOUBLE PRECISION NOT NULL,
    "score_calibrado_ml" DOUBLE PRECISION,

    CONSTRAINT "gds_dimension_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_explicacion" (
    "id" TEXT NOT NULL,
    "dimension_id" TEXT NOT NULL,
    "que" TEXT NOT NULL,
    "por_que" TEXT NOT NULL,
    "cuando_empezo" TEXT,
    "como_evoluciono" TEXT,

    CONSTRAINT "gds_explicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_evidences" (
    "id" TEXT NOT NULL,
    "resultado_id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "institucion_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "ref_contenido" TEXT NOT NULL,
    "contributividad" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "publicaciones_asociadas" JSONB NOT NULL,
    "comentarios_asociados" JSONB NOT NULL,
    "eventos_asociados" JSONB NOT NULL,
    "semanas_involucradas" JSONB NOT NULL,
    "indicadores_utilizados" JSONB NOT NULL,
    "explicacion_ia" TEXT,
    "metricas_utilizadas" JSONB NOT NULL,
    "variacion_pct" DOUBLE PRECISION,
    "conteo" INTEGER,

    CONSTRAINT "gds_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_evidence_ref" (
    "id" TEXT NOT NULL,
    "origen_tipo" TEXT NOT NULL,
    "origen_id" TEXT NOT NULL,
    "evidencia_id" TEXT NOT NULL,

    CONSTRAINT "gds_evidence_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_patron" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "zona_latitud" DOUBLE PRECISION NOT NULL,
    "zona_longitud" DOUBLE PRECISION NOT NULL,
    "zona_radio_metros" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "gds_patron_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_calibracion" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "artefacto_ref" TEXT NOT NULL,
    "metricas" JSONB NOT NULL,
    "calibrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gds_calibracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_reporte" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "institucion_id" TEXT,
    "horizonte" TEXT NOT NULL,
    "contenido" JSONB NOT NULL,
    "generado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gds_reporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_log_generacion" (
    "id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "detalle" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gds_log_generacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_memoria_semanal" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "escenario" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "tokens_aprox" INTEGER NOT NULL,

    CONSTRAINT "gds_memoria_semanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_memoria_mensual" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "numero_mes" INTEGER NOT NULL,
    "escenario" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "tokens_aprox" INTEGER NOT NULL,

    CONSTRAINT "gds_memoria_mensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_memoria_trimestral" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "numero_trimestre" INTEGER NOT NULL,
    "escenario" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "eventos_relevantes" JSONB NOT NULL,
    "tokens_aprox" INTEGER NOT NULL,

    CONSTRAINT "gds_memoria_trimestral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_memoria_semestral" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "numero_semestre" INTEGER NOT NULL,
    "escenario" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "eventos_relevantes" JSONB NOT NULL,
    "tokens_aprox" INTEGER NOT NULL,

    CONSTRAINT "gds_memoria_semestral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_memoria_global" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "escenario" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "eventos_relevantes" JSONB NOT NULL,
    "tokens_aprox" INTEGER NOT NULL,

    CONSTRAINT "gds_memoria_global_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_embedding" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "institucion_id" TEXT NOT NULL,
    "resultado_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "ref_contenido" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "dim" INTEGER NOT NULL,
    "vector" vector(1024) NOT NULL,

    CONSTRAINT "gds_embedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_tendencia_historica" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "dimension" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "magnitud" DOUBLE PRECISION NOT NULL,
    "zona_latitud" DOUBLE PRECISION NOT NULL,
    "zona_longitud" DOUBLE PRECISION NOT NULL,
    "zona_radio_metros" INTEGER NOT NULL,

    CONSTRAINT "gds_tendencia_historica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_evento_historico" (
    "id" TEXT NOT NULL,
    "analisis_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "numero_semana" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "gds_evento_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_usuario_plataforma" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "nombre" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gds_usuario_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gds_rol_plataforma" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "rol" TEXT NOT NULL,

    CONSTRAINT "gds_rol_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gds_analisis_escenario_id_idx" ON "gds_analisis"("escenario_id");

-- CreateIndex
CREATE INDEX "gds_comunidad_digital_institucion_id_idx" ON "gds_comunidad_digital"("institucion_id");

-- CreateIndex
CREATE UNIQUE INDEX "gds_comunidad_digital_analisis_id_institucion_id_key" ON "gds_comunidad_digital"("analisis_id", "institucion_id");

-- CreateIndex
CREATE INDEX "gds_ciclo_semanal_institucion_id_idx" ON "gds_ciclo_semanal"("institucion_id");

-- CreateIndex
CREATE UNIQUE INDEX "gds_ciclo_semanal_analisis_id_institucion_id_numero_semana_key" ON "gds_ciclo_semanal"("analisis_id", "institucion_id", "numero_semana");

-- CreateIndex
CREATE UNIQUE INDEX "gds_generacion_ciclo_id_key" ON "gds_generacion"("ciclo_id");

-- CreateIndex
CREATE INDEX "gds_usuario_sintetico_comunidad_id_idx" ON "gds_usuario_sintetico"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_historial_usuario_usuario_id_idx" ON "gds_historial_usuario"("usuario_id");

-- CreateIndex
CREATE INDEX "gds_score_asociacion_usuario_id_idx" ON "gds_score_asociacion"("usuario_id");

-- CreateIndex
CREATE INDEX "gds_score_asociacion_comunidad_id_idx" ON "gds_score_asociacion"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_resultado_analisis_ciclo_id_idx" ON "gds_resultado_analisis"("ciclo_id");

-- CreateIndex
CREATE INDEX "gds_dimension_riesgo_resultado_id_idx" ON "gds_dimension_riesgo"("resultado_id");

-- CreateIndex
CREATE INDEX "gds_explicacion_dimension_id_idx" ON "gds_explicacion"("dimension_id");

-- CreateIndex
CREATE INDEX "gds_evidences_resultado_id_idx" ON "gds_evidences"("resultado_id");

-- CreateIndex
CREATE INDEX "gds_evidences_analisis_id_idx" ON "gds_evidences"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_evidences_comunidad_id_idx" ON "gds_evidences"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_evidences_institucion_id_idx" ON "gds_evidences"("institucion_id");

-- CreateIndex
CREATE INDEX "gds_evidence_ref_evidencia_id_idx" ON "gds_evidence_ref"("evidencia_id");

-- CreateIndex
CREATE INDEX "gds_evidence_ref_origen_tipo_origen_id_idx" ON "gds_evidence_ref"("origen_tipo", "origen_id");

-- CreateIndex
CREATE INDEX "gds_patron_analisis_id_idx" ON "gds_patron"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_patron_comunidad_id_idx" ON "gds_patron"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_calibracion_analisis_id_idx" ON "gds_calibracion"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_reporte_analisis_id_idx" ON "gds_reporte"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_reporte_institucion_id_idx" ON "gds_reporte"("institucion_id");

-- CreateIndex
CREATE INDEX "gds_log_generacion_ciclo_id_idx" ON "gds_log_generacion"("ciclo_id");

-- CreateIndex
CREATE INDEX "gds_memoria_semanal_analisis_id_idx" ON "gds_memoria_semanal"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_memoria_semanal_comunidad_id_idx" ON "gds_memoria_semanal"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_memoria_mensual_analisis_id_idx" ON "gds_memoria_mensual"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_memoria_mensual_comunidad_id_idx" ON "gds_memoria_mensual"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_memoria_trimestral_analisis_id_idx" ON "gds_memoria_trimestral"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_memoria_trimestral_comunidad_id_idx" ON "gds_memoria_trimestral"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_memoria_semestral_analisis_id_idx" ON "gds_memoria_semestral"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_memoria_semestral_comunidad_id_idx" ON "gds_memoria_semestral"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_memoria_global_analisis_id_idx" ON "gds_memoria_global"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_embedding_analisis_id_idx" ON "gds_embedding"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_embedding_comunidad_id_idx" ON "gds_embedding"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_embedding_institucion_id_idx" ON "gds_embedding"("institucion_id");

-- CreateIndex
CREATE INDEX "gds_embedding_resultado_id_idx" ON "gds_embedding"("resultado_id");

-- CreateIndex
CREATE INDEX "gds_tendencia_historica_analisis_id_idx" ON "gds_tendencia_historica"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_tendencia_historica_comunidad_id_idx" ON "gds_tendencia_historica"("comunidad_id");

-- CreateIndex
CREATE INDEX "gds_evento_historico_analisis_id_idx" ON "gds_evento_historico"("analisis_id");

-- CreateIndex
CREATE INDEX "gds_evento_historico_comunidad_id_idx" ON "gds_evento_historico"("comunidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "gds_usuario_plataforma_id_usuario_key" ON "gds_usuario_plataforma"("id_usuario");

-- CreateIndex
CREATE INDEX "gds_rol_plataforma_usuario_id_idx" ON "gds_rol_plataforma"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "gds_rol_plataforma_usuario_id_rol_key" ON "gds_rol_plataforma"("usuario_id", "rol");

-- AddForeignKey
ALTER TABLE "gds_analisis" ADD CONSTRAINT "gds_analisis_escenario_id_fkey" FOREIGN KEY ("escenario_id") REFERENCES "gds_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_comunidad_digital" ADD CONSTRAINT "gds_comunidad_digital_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_comunidad_digital" ADD CONSTRAINT "gds_comunidad_digital_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "gds_institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_ciclo_semanal" ADD CONSTRAINT "gds_ciclo_semanal_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_ciclo_semanal" ADD CONSTRAINT "gds_ciclo_semanal_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "gds_institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_generacion" ADD CONSTRAINT "gds_generacion_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "gds_ciclo_semanal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_usuario_sintetico" ADD CONSTRAINT "gds_usuario_sintetico_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_historial_usuario" ADD CONSTRAINT "gds_historial_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "gds_usuario_sintetico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_score_asociacion" ADD CONSTRAINT "gds_score_asociacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "gds_usuario_sintetico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_score_asociacion" ADD CONSTRAINT "gds_score_asociacion_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_resultado_analisis" ADD CONSTRAINT "gds_resultado_analisis_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "gds_ciclo_semanal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_dimension_riesgo" ADD CONSTRAINT "gds_dimension_riesgo_resultado_id_fkey" FOREIGN KEY ("resultado_id") REFERENCES "gds_resultado_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_explicacion" ADD CONSTRAINT "gds_explicacion_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "gds_dimension_riesgo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_evidences" ADD CONSTRAINT "gds_evidences_resultado_id_fkey" FOREIGN KEY ("resultado_id") REFERENCES "gds_resultado_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_evidences" ADD CONSTRAINT "gds_evidences_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_evidences" ADD CONSTRAINT "gds_evidences_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_evidences" ADD CONSTRAINT "gds_evidences_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "gds_institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_evidence_ref" ADD CONSTRAINT "gds_evidence_ref_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "gds_evidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_patron" ADD CONSTRAINT "gds_patron_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_patron" ADD CONSTRAINT "gds_patron_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_calibracion" ADD CONSTRAINT "gds_calibracion_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_reporte" ADD CONSTRAINT "gds_reporte_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_reporte" ADD CONSTRAINT "gds_reporte_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "gds_institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_log_generacion" ADD CONSTRAINT "gds_log_generacion_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "gds_ciclo_semanal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_semanal" ADD CONSTRAINT "gds_memoria_semanal_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_semanal" ADD CONSTRAINT "gds_memoria_semanal_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_mensual" ADD CONSTRAINT "gds_memoria_mensual_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_mensual" ADD CONSTRAINT "gds_memoria_mensual_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_trimestral" ADD CONSTRAINT "gds_memoria_trimestral_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_trimestral" ADD CONSTRAINT "gds_memoria_trimestral_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_semestral" ADD CONSTRAINT "gds_memoria_semestral_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_semestral" ADD CONSTRAINT "gds_memoria_semestral_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_memoria_global" ADD CONSTRAINT "gds_memoria_global_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_embedding" ADD CONSTRAINT "gds_embedding_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_embedding" ADD CONSTRAINT "gds_embedding_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_embedding" ADD CONSTRAINT "gds_embedding_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "gds_institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_embedding" ADD CONSTRAINT "gds_embedding_resultado_id_fkey" FOREIGN KEY ("resultado_id") REFERENCES "gds_resultado_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_tendencia_historica" ADD CONSTRAINT "gds_tendencia_historica_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_tendencia_historica" ADD CONSTRAINT "gds_tendencia_historica_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_evento_historico" ADD CONSTRAINT "gds_evento_historico_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "gds_analisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_evento_historico" ADD CONSTRAINT "gds_evento_historico_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "gds_comunidad_digital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gds_rol_plataforma" ADD CONSTRAINT "gds_rol_plataforma_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "gds_usuario_plataforma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Índice vectorial para Embeddings_Search (Req. 36.1, 36.3).
--
-- Prisma no emite índices sobre columnas `Unsupported("vector")`; se crea aquí
-- por SQL nativo. Se usa HNSW con `vector_cosine_ops` (similitud de coseno, la
-- métrica natural de los embeddings de Sentence Transformers). HNSW ofrece
-- mejor recall/latencia que ivfflat y no requiere entrenamiento previo sobre
-- datos existentes (apto para un corpus que arranca vacío y crece, Req. 36.2).
-- ===========================================================================

-- CreateIndex (vector / HNSW)
CREATE INDEX "gds_embedding_vector_hnsw_idx" ON "gds_embedding" USING hnsw ("vector" vector_cosine_ops);
