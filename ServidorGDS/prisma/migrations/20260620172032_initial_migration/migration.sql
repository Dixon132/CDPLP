-- DropIndex
DROP INDEX "gds_embedding_vector_hnsw_idx";

-- AlterTable
ALTER TABLE "gds_memoria_global" ALTER COLUMN "cambios_importantes" DROP DEFAULT,
ALTER COLUMN "anomalias" DROP DEFAULT,
ALTER COLUMN "tendencias" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gds_memoria_mensual" ALTER COLUMN "eventos_relevantes" DROP DEFAULT,
ALTER COLUMN "cambios_importantes" DROP DEFAULT,
ALTER COLUMN "anomalias" DROP DEFAULT,
ALTER COLUMN "tendencias" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gds_memoria_semanal" ALTER COLUMN "eventos_relevantes" DROP DEFAULT,
ALTER COLUMN "cambios_importantes" DROP DEFAULT,
ALTER COLUMN "anomalias" DROP DEFAULT,
ALTER COLUMN "tendencias" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gds_memoria_semestral" ALTER COLUMN "cambios_importantes" DROP DEFAULT,
ALTER COLUMN "anomalias" DROP DEFAULT,
ALTER COLUMN "tendencias" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gds_memoria_trimestral" ALTER COLUMN "cambios_importantes" DROP DEFAULT,
ALTER COLUMN "anomalias" DROP DEFAULT,
ALTER COLUMN "tendencias" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "gds_memoria_semestral_analisis_id_comunidad_id_numero_semest_ke" RENAME TO "gds_memoria_semestral_analisis_id_comunidad_id_numero_semes_key";

-- RenameIndex
ALTER INDEX "gds_memoria_trimestral_analisis_id_comunidad_id_numero_trime_ke" RENAME TO "gds_memoria_trimestral_analisis_id_comunidad_id_numero_trim_key";
