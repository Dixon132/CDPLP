# Informe Técnico — Módulo de Simulación de Datos (CDPLP)

> Cómo el sistema genera datos sintéticos de redes sociales semana a semana para alimentar el análisis IREC.

---

## 1. ¿Por qué simulación de datos?

El sistema necesita analizar contenido de redes sociales (Reddit, YouTube, Instagram, TikTok, Facebook) para detectar tendencias emocionales. El problema: **la mayoría de esas plataformas restringen el acceso a su API** o directamente no lo permiten sin acuerdos especiales.

La solución es un **módulo de simulación**: en vez de raspar datos reales (lo cual sería ilegal o técnicamente imposible), el sistema utiliza un **LLM (modelo de lenguaje grande)** para generar contenido sintético realista que simule cómo una comunidad estudiantil publicaría en esas plataformas durante una semana.

> La capa de análisis **nunca sabe** si los datos que recibe son reales o sintéticos. El módulo entrega siempre el mismo formato (`Contrato Normalizado`), independientemente del origen.

---

## 2. Arquitectura general del módulo

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ModuloSimulacion                               │
│                   (orquestador, sin lógica LLM)                     │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ ConstructorContex│  │FabricaDataProvide│  │ManejadorFallos   │  │
│  │ toMemoria        │  │r (selecciona LLM)│  │Generacion        │  │
│  │                  │  │                  │  │(reintentos+log)  │  │
│  │ Consulta memoria │  │ ┌──────────────┐ │  │                  │  │
│  │ jerárquica para  │  │ │GeminiProvider│ │  │ 3 intentos       │  │
│  │ construir el     │  │ │(nube, defecto│ │  │ backoff exp.     │  │
│  │ contexto de la   │  │ └──────────────┘ │  │ normalizador     │  │
│  │ semana N         │  │ ┌──────────────┐ │  │ respaldo         │  │
│  └──────────────────┘  │ │OllamaProvider│ │  └──────────────────┘  │
│                        │ │(local,config)│ │                         │
│                        │ └──────────────┘ │                         │
│                        └──────────────────┘                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Contrato Normalizado│
                    │  (siempre el mismo   │
                    │   esquema JSON)      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ServicioAnonimizacion │
                    │SHA-256 + salt        │
                    │(borra ids reales)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Capa de Análisis   │
                    │ (NLP, Vision, IREC)  │
                    └─────────────────────┘
```

---

## 3. El Contrato Normalizado — esquema único para todas las redes

Esta es la clave del diseño: **no existe un esquema diferente por red social**. El sistema usa **un único esquema JSON** llamado `ContratoNormalizado` como frontera entre la capa de adquisición y la capa de análisis.

```typescript
// contracts/contratoNormalizado.ts
ContratoNormalizadoSchema = {
    post: {
        autorId: string,   // ID del usuario que publica
        texto: string,     // El contenido de la publicación
    },
    comments: [
        {
            autorId: string,        // ID del comentarista
            texto: string,          // Contenido del comentario
            enRespuestaA: string | null,  // Hilo de conversación
        }
    ],
    image_description: string,   // Descripción textual de imagen (para Vision Engine)
    hashtags: string[],          // Hashtags del post
    metadata: {
        version: "1.0.0",        // Versión del esquema (versionado)
        fuente: string,          // Etiqueta opaca: "gemini" | "ollama" (no dice "simulado")
        generadoEn: string,      // ISO 8601
        semana: number,          // Semana simulada (1-24)
        idioma: "es-BO",         // Español andino de Bolivia
    }
}
```

**¿Por qué un esquema único y no uno por red social?**

Porque la capa de análisis (NLP, visión, IREC) no necesita saber si el contenido viene de Reddit (texto largo), TikTok (caption corto + hashtags) o Instagram (imagen + descripción). Lo que importa es:
- El **texto** del contenido
- La **descripción de imagen** (para el Vision Engine)
- Los **hashtags** (señales de tema)
- Los **hilos de conversación** (`enRespuestaA`)

La diferencia entre plataformas se captura en cómo el LLM **redacta** el contenido (tono, longitud, estilo), no en el esquema. El prompt le indica al LLM el tipo de plataforma simulada.

**Ejemplo de Contrato Normalizado real:**

```json
{
  "post": {
    "autorId": "usr_042",
    "texto": "Bro, ya no aguanto más estos parciales. Llevo tres noches sin dormir y mañana tengo química y análisis al mismo día. Esto ya es demasiado pe."
  },
  "comments": [
    {
      "autorId": "usr_017",
      "texto": "Eso nomás es la vida universitaria jaja... aunque en serio, cuídate, duerme aunque sea 4 horas",
      "enRespuestaA": "usr_042"
    },
    {
      "autorId": "usr_031",
      "texto": "Igual estoy, bro. Y el profe ni aparece y después nos califica mal. Qué bronca.",
      "enRespuestaA": null
    }
  ],
  "image_description": "Escritorio con libros apilados, hojas con apuntes y una taza de café a medianoche",
  "hashtags": ["#parciales", "#estrés", "#universitarios", "#nochedeestudio"],
  "metadata": {
    "version": "1.0.0",
    "fuente": "gemini",
    "generadoEn": "2026-05-14T03:22:11.000Z",
    "semana": 3,
    "idioma": "es-BO"
  }
}
```

---

## 4. Los proveedores LLM (IDataProvider)

Hay una interfaz abstracta `IDataProvider` que define el contrato que debe cumplir cualquier proveedor:

```typescript
interface IDataProvider {
    readonly nombre: NombreProveedor;   // "gemini" | "ollama" | ...
    readonly limiteTokens: number;       // cuánto contexto acepta
    generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado>;
}
```

Actualmente hay dos implementados:

### 4.1 GeminiProvider (por defecto, nube)

| Atributo | Valor |
|---|---|
| LLM | Google Gemini API |
| Límite tokens de contexto | 30.000 (configurable por `.env`) |
| Variable `.env` | `GEMINI_LIMITE_TOKENS` |
| Temperatura | 0.9 (alta variedad) |
| Cuándo se usa | Por defecto, siempre que no se configure otro |

**Flujo interno:**
1. Llama a `construirPromptGeneracion(ctx)` → genera el prompt completo
2. Envía el prompt a Gemini API via `GeminiClient` (HTTP)
3. Recibe texto crudo del LLM (puede venir con ```json ... ```)
4. Limpia las vallas de Markdown y parsea el JSON
5. Añade la `metadata` (fuente, semana, versión, idioma)
6. Valida con `ValidadorContratoService` (Zod)
7. Devuelve el `ContratoNormalizado` limpio

### 4.2 OllamaProvider (alternativa local)

| Atributo | Valor |
|---|---|
| LLM | Ollama (cualquier modelo: Mistral, Llama, etc.) |
| Límite tokens de contexto | 8.000 (configurable, menor al ser local) |
| Variable `.env` | `OLLAMA_LIMITE_TOKENS` |
| Temperatura | 0.9 |
| Cuándo se usa | Cuando se configura `proveedor: "ollama"` |

**¿Por qué ambos?**
- **Gemini**: más potente, mejor calidad narrativa, sin necesidad de hardware local
- **Ollama**: privacidad total (el texto nunca sale del servidor), sin costo por API, ideal para entornos sin Internet o con datos sensibles

**Importante**: ambos usan **exactamente el mismo prompt**. La `FabricaDataProvider` simplemente selecciona cuál usar según configuración:

```typescript
// Selección por configuración, no por código
const proveedor = fabrica.crear({ proveedor: "ollama" });  // o "gemini"
const contrato  = await proveedor.generar(contexto);       // mismo flujo
```

### 4.3 Proveedores futuros contemplados

El tipo `NombreProveedor` ya tiene registrados:
```typescript
type NombreProveedor = "gemini" | "ollama" | "meta" | "twitter" | "scraping" | "historical" | string;
```

Cuando exista acceso real a APIs de redes sociales, se puede implementar un `TwitterProvider`, `MetaProvider`, etc. con la misma interfaz. La capa de análisis no requeriría ningún cambio.

---

## 5. El Prompt — cómo se le pide al LLM que genere

El prompt se construye en [`promptGeneracionRealista.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/prompt/promptGeneracionRealista.ts) mediante la función `construirPromptGeneracion(ctx)`. Es **pura y determinista**: el mismo contexto siempre produce el mismo prompt.

### 5.1 Estructura completa del prompt

```
# Rol
Eres un generador de ecosistemas digitales sintéticos para una comunidad educativa.
Simulas la actividad de una red social estudiantil durante una semana: una
publicación principal, sus comentarios y las conversaciones (hilos) entre los
usuarios de la comunidad.

# Lengua y registro (obligatorio)
Escribe TODO el contenido en español andino de Bolivia (modismos y jerga estudiantil local, regional).
Usa jerga y modismos locales de forma natural; evita el español neutro de manual.

# Variedad exigida (obligatorio)
El conjunto de publicación + comentarios debe mostrar variedad emocional y de
registro, combinando a lo largo de la semana:
- lenguaje cotidiano
- sarcasmo
- ironía
- contenido positivo
- contenido negativo
- contenido neutral
- contradicciones
- conflictos
- ruido (mensajes irrelevantes u off-topic)
No produzcas contenido simplista ni monotemático como única salida...

# Atribución a usuarios persistentes (obligatorio)
Atribuye cada publicación y comentario ÚNICAMENTE a estos usuarios persistentes:
- usr_042: perfil reactivo; estilo informal; participación alta; intereses: estrés, política universitaria
- usr_017: perfil pasivo; estilo empático; participación media; intereses: bienestar, estudio
- usr_031: perfil crítico; estilo directo; participación alta; intereses: conflictos, docentes
Identificadores válidos: usr_042, usr_017, usr_031.
Mantente fiel al perfil, estilo e intereses de cada usuario. Construye
conversaciones reales: usa `enRespuestaA` para encadenar respuestas entre ellos.

# Escenario activo (inmutable durante todo el análisis)
Época de parciales de mitad de semestre. Alta carga académica. Conflicto con
docentes que no entregan notas. Temporada de frío que afecta asistencia.
Todo el contenido debe ser coherente con este escenario.

# Semana simulada: 3
# Zona geográfica: lat=-16.5, lon=-68.15, radio=5000m

# Memoria del historial previo (resumen jerárquico)
Semanas 1-2: predominó estrés académico (74%), mención recurrente de "parciales" y
"notas". Usuario usr_042 fue el más activo. Tendencia de agotamiento creciente.

# Contexto semántico recuperado por similitud
- "no puedo más con los trabajos grupales, nadie coopera"
- "el profe de química no aparece y después nos va a jalar"

# Patrones/tendencias acumulados detectados
- estrés_academico: señales persistentes en 2 semanas consecutivas
- aislamiento_leve: usr_031 menciona "nadie" en 3 publicaciones

# Formato de salida (obligatorio)
Responde ÚNICAMENTE con un objeto JSON válido con esta forma exacta, sin texto
adicional ni vallas de código:
{
  "post": { "autorId": "<id de un usuario válido>", "texto": "<contenido>" },
  "comments": [
    { "autorId": "<id válido>", "texto": "<contenido>", "enRespuestaA": "<id, autorId del post, o null>" }
  ],
  "image_description": "<descripción textual de una imagen asociada al post>",
  "hashtags": ["#ejemplo"]
}
```

### 5.2 Qué hace especial a este prompt

| Elemento | Por qué está ahí |
|---|---|
| **Español andino boliviano** | El análisis está calibrado para una comunidad educativa en Bolivia; el modelo genérico hablaría en español neutro que no capturaría los modismos locales |
| **Variedad emocional exigida** | Sin esta instrucción, el LLM tiende a generar solo contenido negativo o solo positivo; la variedad garantiza que el análisis no esté sesgado |
| **Usuarios persistentes con perfil** | Los mismos usuarios aparecen semana tras semana con el mismo estilo, simulando una comunidad real que evoluciona |
| **`enRespuestaA`** | Simula hilos de conversación reales, no solo publicaciones aisladas |
| **Escenario inmutable** | Todo el análisis usa el mismo escenario; si cambia a mitad del análisis los resultados no serían comparables |
| **Memoria jerárquica** | El LLM recibe un resumen de lo que pasó en semanas anteriores, no las semanas crudas (demasiados tokens) |
| **Contexto semántico** | Fragmentos recuperados por búsqueda vectorial de embeddings similares; da "memoria semántica" al LLM |
| **Patrones acumulados** | El LLM conoce las tendencias ya detectadas y las puede intensificar o contradecir |
| **JSON exacto exigido** | Sin esta instrucción los LLM suelen responder con texto narrativo en vez de JSON parseable |

---

## 6. El Contexto de Generación — qué recibe el prompt

El objeto `ContextoGeneracion` es la estructura que alimenta el prompt:

```typescript
interface ContextoGeneracion {
    escenario: string;              // texto del escenario (inmutable)
    contextoMemoria: string;        // resumen jerárquico de semanas anteriores
    contextoSemantico: string[];    // fragmentos similares recuperados por pgvector
    patronesAcumulados: Patron[];   // tendencias ya detectadas
    usuariosSinteticos: PerfilUsuario[];  // quiénes "postean"
    zonaGeografica: {               // ancla el contenido geográficamente
        latitud: number;
        longitud: number;
        radioMetros: number;
    };
    semana: number;                 // qué semana estamos simulando
    comunidad: {
        institucionId: string;
        analisisId: string;
    };
}
```

**¿Cómo se construye este contexto?**

El `ModuloSimulacion` ensambla el contexto en varios pasos:

```
1. ConstructorContextoMemoria.construirContexto(analisisId, comunidadId, semana, limiteTokens)
   → escenario (del Análisis, inmutable)
   → contextoMemoria (resumen jerárquico: semanal → mensual → trimestral, según tokens disponibles)

2. El ModuloSimulacion agrega:
   → contextoSemantico (fragmentos buscados por pgvector/embeddings)
   → patronesAcumulados (tendencias detectadas hasta ahora)
   → usuariosSinteticos (perfiles persistentes)
   → zonaGeografica (de la Institución)
   → semana (número de semana actual)

3. Si hay un evento del escenario activo:
   → aplicarReaccionEscenario() modifica el comportamiento de usuarios afectados
```

---

## 7. Usuarios Sintéticos Persistentes

Los usuarios sintéticos **no se regeneran cada semana**. Se crean una vez al inicio del análisis y se reutilizan en todas las semanas:

```typescript
interface PerfilUsuario {
    id: string;                    // "usr_042"
    seudonimo?: string;            // hash SHA-256 (después de anonimizar)
    perfilConductual: string;      // "reactivo" | "pasivo" | "crítico" | ...
    frecuencia: number;            // cuánto publica (afectado por eventos)
    estiloEscritura: string;       // "informal" | "empático" | "directo" | ...
    intereses: string[];           // ["estrés", "política universitaria"]
    nivelParticipacion: string;    // "alta" | "media" | "baja"
}
```

**¿Por qué persistentes?** Para que el análisis temporal tenga coherencia. Si cada semana inventara nuevos usuarios, los patrones detectados de "usr_042 aumenta agresividad semana a semana" no tendrían sentido.

### 7.1 Reacción de usuarios a eventos del escenario

Cuando ocurre un **evento del escenario** (por ejemplo: "publicación de notas", "paro de docentes", "inicio de finales"), los usuarios afectados **cambian su comportamiento** de forma coherente:

```typescript
interface EventoEscenario {
    id: string;                    // "publicacion_notas"
    descripcion: string;           // "El departamento publicó las notas del parcial"
    intensidad: "baja" | "media" | "alta";
    temasAfectados: string[];      // ["notas", "calificaciones", "injusticia"]
    actoresAfectados?: string[];   // ["usr_042", "usr_031"]  // los más reactivos
    semana: number;
}
```

**Ejemplo de reacción**: si la intensidad es "alta" y el usuario tiene perfil "reactivo", su `frecuencia` de publicación aumenta y sus `intereses` se enfocan en los temas del evento. El prompt del LLM recibe estos perfiles actualizados y genera contenido coherente con esa reacción.

---

## 8. La Memoria Jerárquica — contexto sin explotar tokens

Este es uno de los problemas más interesantes: los LLM tienen límite de tokens de contexto (Gemini: 30.000; Ollama: 8.000). Si el análisis dura 12 semanas, no se puede enviar todo el historial crudo.

La solución es una **memoria jerárquica por niveles de agregación**:

```
Nivel 1 (más reciente y detallado):    Memorias semanales (semana N-1, N-2, ...)
Nivel 2 (agregación mensual):          Resumen del mes anterior
Nivel 3 (agregación trimestral):       Resumen del trimestre
Nivel 4 (memoria global):              Resumen de todo el análisis

Cuando se acercan al límite de tokens → se priorizan niveles más agregados
```

El `ConstructorContextoMemoria` construye el contexto de texto así:

```
"Semanas 1-4: predominó estrés académico. IREC promedio: 52.
 Usuario usr_042 fue el más activo. Tendencia de agotamiento creciente.
 Semana 5: pico de conflicto por notas (IREC: 71). Evento: publicación de calificaciones.
 Semana 6 (última): normalización parcial. Nuevas señales de aislamiento en usr_031."
```

Este texto compacto se inserta en el prompt y da al LLM suficiente contexto sin exceder el límite.

---

## 9. Manejo de Fallos — qué pasa si el LLM falla

El `ManejadorFallosGeneracion` envuelve al proveedor (patrón **Decorator**) y gestiona:

| Causa de fallo | Código | Qué hace |
|---|---|---|
| El LLM no responde / timeout | `NO_RESPUESTA` | Registra + reintenta |
| El LLM devuelve error / cuota agotada | `ERROR_PROVEEDOR` | Registra + reintenta |
| El JSON del LLM no es parseable | `DATOS_MALFORMADOS` | Intenta normalizar → si no, reintenta |
| El JSON no cumple el esquema | `CONTRATO_INVALIDO` | Intenta normalizar → si no, reintenta |
| El normalizador tampoco funciona | `RESPALDO_INVALIDO` | Reintenta desde cero |
| Se agotan todos los reintentos | `REINTENTOS_AGOTADOS` | Lanza error, marca semana como FALLIDA |

**Política de reintentos:**
- Máximo de intentos: configurable (default: 3)
- Si falla → se registra en `gds_log_generacion` con el código de causa
- **El historial NUNCA se corrompe**: si no hay contrato válido, la semana queda marcada `FALLIDA/reintentable` pero no se guarda basura

---

## 10. Anonimización — borrar identidades antes del análisis

Después de generado el contrato, **antes** de que llegue al pipeline de análisis, se aplica la anonimización:

```
ContratoNormalizado (con IDs sintéticos)
    │
    ▼ ServicioAnonimizacion.anonimizar(contrato, salt)
    │
    │  post.autorId: "usr_042"  →  "a3f7c8d9e1b2..." (SHA-256 hex)
    │  comments[0].autorId: "usr_017" → "f1e2d3c4b5a6..."
    │  comments[0].enRespuestaA: "usr_042" → "a3f7c8d9e1b2..." (mismo hash, consistente)
    │
    ▼
ContratoNormalizado (con seudónimos hash irreversibles)
```

**Características garantizadas:**
- **Irreversible**: SHA-256 no tiene inversa conocida
- **Consistente**: el mismo `(id, salt)` siempre produce el mismo hash → se puede rastrear el comportamiento de un usuario sin saber quién es
- **Salt por análisis**: cada `Analisis` tiene su propio `saltAnon` en base de datos → los hashes de un análisis no son comparables con los de otro

---

## 11. Flujo completo paso a paso

```
INICIO: Se encola el trabajo "procesar-semana" para semana 3
                │
                ▼
1. ModuloSimulacion.generarSemana({
       analisisId: "abc",
       semana: 3,
       escenario: "Época de parciales...",
       usuariosSinteticos: [usr_042, usr_017, usr_031],
       zonaGeografica: { lat: -16.5, lon: -68.15, radio: 5000 },
       proveedor: { proveedor: "gemini" }
   })
                │
                ▼
2. FabricaDataProvider.crear("gemini")
   → selecciona GeminiProvider
   → lo envuelve en ManejadorFallosGeneracion (max 3 intentos)
                │
                ▼
3. ConstructorContextoMemoria.construirContexto("abc", comunidadId, 3, 30000)
   → Lee memorias de semanas 1 y 2 de gds_memoria_semanal
   → Construye resumen textual respetando 30.000 tokens
   → Devuelve { escenario, contextoMemoria }
                │
                ▼
4. ModuloSimulacion ensambla ContextoGeneracion:
   → escenario: "Época de parciales..."
   → contextoMemoria: "Semanas 1-2: estrés (74%)..."
   → contextoSemantico: ["no aguanto los trabajos grupales", ...]  ← pgvector
   → patronesAcumulados: [{ tipo: "estrés_académico", ... }]
   → usuariosSinteticos: [perfiles con frecuencia/estilo]
   → semana: 3
                │
                ▼
5. (opcional) aplicarReaccionEscenario(contexto, usuarios, evento)
   → Si hay un evento activo (ej: "publicación de notas")
   → Ajusta frecuencia y temas de usuarios afectados
   → Devuelve contexto enriquecido + lista de reacciones
                │
                ▼
6. GeminiProvider.generar(contexto)
   │
   ├─ construirPromptGeneracion(ctx)  → string (el prompt completo)
   │
   ├─ GeminiClient.generar({ prompt, temperatura: 0.9 })
   │  → POST https://generativelanguage.googleapis.com/...
   │  → Espera respuesta del LLM (~2-5 segundos)
   │
   ├─ Recibe texto crudo:
   │  '{ "post": { "autorId": "usr_042", "texto": "Bro, ya no aguanto..." }, ... }'
   │
   ├─ parsearJson(textoCrudo)  → elimina ```json``` si el LLM las añadió
   │
   ├─ ensamblarCandidato(crudo, ctx)  → añade metadata
   │
   └─ ValidadorContratoService.validar(candidato)  → Zod valida el esquema
      → ok: true → devuelve ContratoNormalizado ✓
                │
                ▼
7. ServicioAnonimizacion.anonimizar(contrato, salt)
   → usr_042 → "a3f7c8d9..." (SHA-256)
   → usr_017 → "f1e2d3c4..."
   → usr_031 → "b5c6d7e8..."
                │
                ▼
8. ContratoNormalizado anonimizado → Capa de Análisis
   → POST /nlp    → ServicioIA (Python) detecta emociones
   → POST /vision → ServicioIA analiza image_description
   → Calcula IREC para semana 3
   → Guarda en gds_ciclo_semanal
                │
                ▼
9. WebSocket → Frontend
   evento: "analisis:semana-completada"
   { semana: 3, irec: 63.2, nivel: "elevado", indicadorDominante: "estrés_académico" }
```

---

## 12. ¿Hay esquemas diferentes por red social?

**No.** El sistema usa **un único esquema** (`ContratoNormalizado`) para todas las plataformas. La diferencia entre Reddit, Instagram, TikTok, etc. la captura el **prompt**, instruyendo al LLM para que escriba con el estilo de cada plataforma:

| Red social | Cómo lo simula el LLM |
|---|---|
| Reddit | Textos largos, hilos profundos (`enRespuestaA` anidado), debate académico |
| TikTok | Captions cortos, muchos hashtags, emojis, tono viral |
| Instagram | Texto moderado + descripción de imagen elaborada, hashtags estéticos |
| Facebook | Publicaciones grupales, tono más formal, pocos hashtags |
| YouTube | Comentarios bajo un "video", referencias a momentos del video |

Todo termina en el **mismo JSON** con los mismos campos. El campo `fuente` en `metadata` indica de qué plataforma simulada proviene (aunque el análisis no lo usa para diferenciar el tratamiento).

---

## 13. Resumen de archivos del módulo

| Archivo | Responsabilidad |
|---|---|
| [`moduloSimulacion.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/moduloSimulacion.ts) | Orquestador principal: ensambla contexto, llama al proveedor |
| [`contracts/contratoNormalizado.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/contracts/contratoNormalizado.ts) | Esquema Zod del único formato de salida |
| [`contracts/validadorContrato.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/contracts/validadorContrato.ts) | Valida que el JSON del LLM cumple el esquema |
| [`adquisicion/dataProvider.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/adquisicion/dataProvider.ts) | Interfaz `IDataProvider` + fábrica + tipos del contexto |
| [`adquisicion/gemini/geminiProvider.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/adquisicion/gemini/geminiProvider.ts) | Proveedor Gemini (nube, por defecto) |
| [`adquisicion/gemini/geminiClient.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/adquisicion/gemini/geminiClient.ts) | Cliente HTTP de la API de Gemini |
| [`adquisicion/ollama/ollamaProvider.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/adquisicion/ollama/ollamaProvider.ts) | Proveedor Ollama (local, alternativa) |
| [`adquisicion/ollama/ollamaClient.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/adquisicion/ollama/ollamaClient.ts) | Cliente HTTP de Ollama local |
| [`adquisicion/manejadorFallosGeneracion.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/adquisicion/manejadorFallosGeneracion.ts) | Reintentos, registro de fallos, normalizador respaldo |
| [`adquisicion/reaccionEscenario.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/adquisicion/reaccionEscenario.ts) | Cómo los usuarios reaccionan a eventos del escenario |
| [`prompt/promptGeneracionRealista.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/prompt/promptGeneracionRealista.ts) | Función pura que construye el prompt completo |
| [`anonymization/servicioAnonimizacion.ts`](file:///C:/Users/ASUS%20CREATOR/Desktop/realproyects/rr/CDPLP/ServidorGDS/src/modules/simulation/anonymization/servicioAnonimizacion.ts) | SHA-256 + salt: borra IDs antes del análisis |

---

*Informe generado a partir del análisis del código fuente — Junio 2026*
