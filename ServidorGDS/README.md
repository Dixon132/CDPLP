# ServidorGDS

Servicio backend **independiente y autonomo** de la Plataforma_GDS (Analisis de Tendencias de Riesgo Emocional).

- Su propio `package.json`, `tsconfig.json` y puerto (`PORT`).
- App Express 5 + TypeScript con entrypoint `src/server.ts` y app `src/app.ts`.
- Expone su API bajo el prefijo `/api/gds` en su **propia** app (no en el `rootRouter` del colegio).
- Usa su **propia** base de datos PostgreSQL dedicada (`DATABASE_URL`), **nunca** la del colegio.
- Valida el JWT del colegio con un `JWT_SECRET` compartido; los roles GDS se resuelven en su propia BD.

## Estructura

```text
ServidorGDS/
├── package.json
├── tsconfig.json
├── .env.example            # plantilla de secretos (copiar a .env)
└── src/
    ├── server.ts           # entrypoint (escucha en PORT)
    ├── app.ts              # crea la app Express y monta /api/gds
    ├── config/env.ts       # carga de variables de entorno propias
    ├── routes/             # gds.routes.ts (router raiz)
    ├── modules/            # contracts, adquisicion, analisis, pipeline, ciclo,
    │                       # auth, evidencias, ml, memoria, escenarios, reportes, ws
    ├── middlewares/        # auth, errors
    └── utils/              # prismaClient (BD dedicada, tarea 2.1)
```

## Scripts

```bash
npm install            # instalar dependencias
npm run typecheck      # verificar tipos sin emitir
npm run build          # compilar a dist/
npm start              # ejecutar dist/server.js
npm run dev            # ejecutar con ts-node
npm run prisma:validate  # validar el esquema Prisma
npm run prisma:generate  # generar el Prisma Client
npm run prisma:migrate   # crear/aplicar la migracion (requiere BD dedicada activa)
```

## Smoke

Con el servicio en marcha: `GET /api/gds/health` responde `{ status: "ok" }`.

## Persistencia (Prisma + BD dedicada) — tarea 2.1

El esquema vive en `prisma/schema.prisma` y apunta **exclusivamente** a la base
de datos PostgreSQL **dedicada e independiente** del servicio vía su propio
`DATABASE_URL`. **Nunca** referencia ni accede a la base de datos del colegio
(aislamiento total por separacion fisica — Req. 25.1, 25.3).

- **Cliente reutilizable:** `src/utils/prismaClient.ts` exporta una unica
  instancia `prisma` (singleton) reutilizable por todo el servicio.
- **Modelos:** los 25 modelos del diseno (`gds_institucion`, `gds_scenarios`,
  `gds_analisis`, `gds_comunidad_digital`, `gds_ciclo_semanal`, `gds_generacion`,
  `gds_usuario_sintetico`, `gds_historial_usuario`, `gds_score_asociacion`,
  `gds_resultado_analisis`, `gds_dimension_riesgo`, `gds_evidences`,
  `gds_evidence_ref`, `gds_explicacion`, `gds_patron`, `gds_calibracion`,
  `gds_reporte`, `gds_log_generacion`, `gds_memoria_semanal/mensual/trimestral/
  semestral/global`, `gds_usuario_plataforma`, `gds_rol_plataforma`). El prefijo
  `gds_` (via `@@map`) es **opcional** y se conserva por claridad.
- **Integridad referencial:**
  - Borrado **en cascada** dentro del subgrafo cuya raiz es `gds_analisis`.
  - FK **restrictiva** de `gds_comunidad_digital` → `gds_institucion`
    (la institucion no se borra mientras una comunidad la referencie).
  - Indice unico `(analisis_id, institucion_id)` en `gds_comunidad_digital`.
  - Indice unico `(analisis_id, institucion_id, numero_semana)` en
    `gds_ciclo_semanal` (idempotencia y orden de ciclos).

### Estado de la migracion

> **La migracion esta diferida.** El esquema ya esta **validado**
> (`npx prisma validate`), **formateado** (`npx prisma format`) y el **Prisma
> Client esta generado** (`npx prisma generate`). La creacion/aplicacion de la
> migracion (`npx prisma migrate dev`) **requiere que la base de datos dedicada
> este aprovisionada y accesible** mediante `DATABASE_URL`. En este entorno no
> hay un PostgreSQL alcanzable con las credenciales del `.env` (placeholder),
> por lo que la migracion **no** se ejecuto para no bloquear el incremento y
> para **no** tocar ninguna otra base de datos.

Para generar y aplicar la migracion cuando la BD dedicada este disponible:

```bash
# 1) Configurar DATABASE_URL en .env apuntando a la BD dedicada de GDS
# 2) Crear y aplicar la migracion inicial
npm run prisma:migrate -- --name init_gds_schema
```

Esto creara `prisma/migrations/<timestamp>_init_gds_schema/` con el SQL del
esquema y lo aplicara **unicamente** sobre la base de datos dedicada.
