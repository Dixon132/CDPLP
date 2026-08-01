-- Rellena `updatedAt` en los movimientos que nunca lo tuvieron.
--
-- La columna existía pero el modelo no llevaba `@updatedAt`, así que Prisma no
-- la escribía nunca. Como el listado de tesorería ordena por ella, las filas con
-- NULL salían primero en orden arbitrario (en PostgreSQL, ORDER BY ... DESC pone
-- los NULL delante) y la tabla se veía desordenada.
--
-- Para las filas históricas se toma la fecha de creación: nunca se modificaron,
-- así que su última actividad es su alta. Solo se tocan celdas NULL.
UPDATE "movimientos_financieros"
SET "updatedAt" = COALESCE("createdAt", "fecha_movimiento", NOW())
WHERE "updatedAt" IS NULL;
