-- ===========================================================================
-- Migración: habilitar la extensión `pgvector` en la BD PostgreSQL DEDICADA.
--
-- Esta extensión provee el tipo `vector`, base de la Memoria_Semantica vectorial
-- (embeddings) y de la recuperación por similitud (Embeddings_Search).
--
-- Debe ejecutarse ANTES de crear las tablas que usan el tipo `vector`
-- (p. ej. `gds_embedding`, definida en la migración del esquema ampliado).
--
-- Aislamiento total (Req. 25.1, 25.3): se aplica sobre la BD propia del
-- ServidorGDS (`DATABASE_URL`), nunca sobre la BD del colegio.
--
-- Requisitos: 25.1 (BD dedicada + pgvector), 36.1 (Memoria_Semantica vectorial).
-- ===========================================================================

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";
