# Informe de Transición: De Simulación a APIs Reales de Redes Sociales

> Análisis honesto y técnico sobre qué terreno está preparado y qué falta exactamente para conectar el sistema a fuentes de datos reales (Meta, Reddit, TikTok, YouTube).

---

## 1. La verdad sobre los módulos de Limpieza, Normalización y Anonimización

**Respuesta directa: SÍ EXISTEN, ESTÁN PROGRAMADOS Y SE ESTÁN USANDO HOY MISMO.**

No son una promesa a futuro, son código real que se ejecuta con cada simulación que hace el sistema actualmente. Todo lo que el LLM genera pasa por ellos antes de ser analizado.

### ¿Dónde están exactamente?

- **Módulo de Limpieza y Normalización**: Están en `src/modules/pipeline/etapas.ts`.
  - **Limpieza (`limpiarContrato`)**: Borra caracteres de control invisibles que a veces meten los LLM o los usuarios (espacios extra, caracteres de ancho cero).
  - **Normalización (`normalizarContrato`)**: Estandariza todo el texto a formato Unicode NFC y arregla los hashtags (los fuerza a minúsculas, elimina los `#` repetidos y quita los duplicados).
- **Módulo de Anonimización**: Está en `src/modules/simulation/anonymization/servicioAnonimizacion.ts`.
  - **Anonimización (`ServicioAnonimizacionSha256`)**: Recibe un ID (ej. `usr_042`), lo concatena con un texto secreto del análisis (`salt`), y lo hashea con SHA-256 para volverlo irreversible (`f1e2d3...`).

**¿Por qué se usan ahora si los datos son simulados?**
Porque el sistema está diseñado bajo la filosofía de que **el pipeline no confía en la fuente**. Aunque Gemini o Ollama generen los datos hoy, el pipeline los limpia, los estandariza y los anonimiza de todos modos. Esto garantiza que el día que conectes una API real, el escudo protector de datos ya está activo y probado.

---

## 2. El Terreno Preparado: Lo que NO tendrás que tocar

Si mañana consigues las APIs oficiales de Facebook, Reddit y TikTok, esta es la lista de cosas que **NO tendrás que reprogramar**:

1. **La Capa de Análisis NLP (Servicio IA en Python)**: No sabe ni le importa de dónde vienen los datos. Seguirá detectando emociones y temas exactamente igual.
2. **El Pipeline de Etapas**: Todo el orden de ejecución (Limpieza → Normalización → Anonimización → NLP → Visión → Índices → Embeddings) se queda intacto.
3. **El Contrato Normalizado**: El JSON único `{ post, comments, hashtags, ... }` sigue siendo el estándar universal.
4. **La Base de Datos de Resultados**: Toda la estructura analítica (`gds_ciclo_semanal`, índices de riesgo, memoria semántica en `pgvector`) no cambia.

---

## 3. Lo que FALTARÁ construir (La cruda verdad)

Siendo totalmente sinceros, conectar APIs reales no es solo "cambiar una URL". Esto es **exactamente lo que falta programar en la Capa de Adquisición** cuando tengas los accesos:

### A. Los Providers Reales (`MetaProvider`, `RedditProvider`)
Actualmente solo existen `GeminiProvider` y `OllamaProvider`. Tendrás que crear clases nuevas que implementen la interfaz `IDataProvider`:
- **Qué harán**: Hacer llamadas HTTP reales (`GET https://oauth.reddit.com/r/universidad/new`).
- **El desafío**: Cada red social entrega la información de forma distinta. Tu trabajo será escribir el código que mapee el caos de Facebook/Reddit a la estructura limpia de nuestro `ContratoNormalizado`.

### B. Gestión de Autenticación y Tokens (OAuth)
Las APIs reales no te dejan entrar así por así.
- **Qué falta**: Un módulo de gestión de credenciales. Habrá que programar flujos OAuth 2.0 para refrescar tokens (Access Tokens) cada cierta cantidad de horas. Si el token caduca a mitad de la noche, el sistema debe saber renovarlo automáticamente para no detener la recolección.

### C. Manejo de Límites de Peticiones (Rate Limiting)
- **El problema**: Gemini y Ollama te responden cuando se lo pides. Meta y Twitter te bloquean si pides muchos datos de golpe (ej. límite de 200 peticiones por hora).
- **Qué falta**: Un sistema de colas (probablemente usando BullMQ, que ya está en el proyecto) para dosificar las peticiones a la API real. Si llegamos al límite, la cola debe pausarse y reanudarse a la hora siguiente.

### D. Cambio de Paradigma: De "Generar" a "Recolectar"
Actualmente, el sistema funciona de forma **Pull/Generativa**: llega el domingo, el sistema le dice al LLM "invéntame 1 semana de datos", y el LLM los escupe de golpe.
Con APIs reales, el sistema será **Continuo**:
- **Qué falta**: Un "Recolector Continuo" (cron job) que descargue posts de Reddit todos los días a las 2 AM. Los guardará temporalmente crudos, y el domingo por la noche los agrupará, los mapeará al `ContratoNormalizado` y recién ahí los inyectará al Pipeline de Análisis.

### E. El destino de los "Usuarios Sintéticos"
Actualmente creamos "semillas" con perfiles inventados ("reactivo", "pasivo").
- **El problema con la realidad**: Una API real te dará IDs reales de usuarios (`@juanperez123`), pero la API no te dirá si Juan es "reactivo" o "pasivo".
- **La solución faltante**: Tienes dos opciones. O bien el sistema simplemente registra a los usuarios reales anonimizándolos pero dejando su "perfil" en blanco, o construyes un modelo de NLP extra que lea el historial de `@juanperez123` y **calcule automáticamente** si su perfil es "reactivo" o "crítico".

---

## Conclusión General

El sistema actual no es un prototipo desechable; tiene una **frontera arquitectónica rígida** (el `ContratoNormalizado`). 

Todo lo que está a la derecha de esa frontera (Pipeline, NLP, Limpieza, Índices, BD) es definitivo y funcionará con datos reales sin cambiar una línea de código. 

Todo lo que está a la izquierda (Generadores, LLMs) es lo que tendrás que reemplazar por "Recolectores" y gestores de tokens de APIs. El terreno está preparado, pero el trabajo de integración con las APIs (mapeo y límites de velocidad) será el siguiente gran reto técnico.
