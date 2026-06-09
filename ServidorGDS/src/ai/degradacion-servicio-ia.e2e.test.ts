/**
 * Pruebas de DEGRADACION SEGURA del `Servicio_IA` end-to-end con Supertest (tarea 8.5).
 *
 * Escenario: el `Servicio_IA` (cerebro analitico en Python) esta CAIDO. Se
 * simula sustituyendo el `HttpService` por un doble cuyas llamadas HTTP
 * (`GET /health`, `POST /nlp|/vision|/relevancia|/embeddings`, ...) SIEMPRE
 * fallan, tal como ocurriria si el servicio no responde o no esta levantado.
 *
 * Sobre ese backend caido se levanta una app NestJS real (con su contenedor DI
 * y el {@link AiModule} sin modificar) y, mediante un controlador HTTP de prueba
 * que ejecuta un "ciclo" de analisis (`Filtro_Relevancia` -> NLP -> Vision ->
 * `Capa_ML`) a traves de las INTERFACES ESTABLES (tokens `SERVICIO_NLP`,
 * `SERVICIO_VISION`, `FILTRO_RELEVANCIA`, `CAPA_ML`), se verifica por HTTP
 * (Supertest) que (Req. 35.3):
 *
 *  1. el ciclo CONTINUA y responde 2xx (la indisponibilidad NUNCA bloquea el
 *     ciclo: siempre hay calculo base via el fallback determinista TS);
 *  2. los resultados provienen del FALLBACK determinista TS (calculo base);
 *  3. el INCIDENTE de degradacion queda REGISTRADO (log de degradacion).
 *
 * El controlador es EXCLUSIVO de esta prueba: no se anade codigo de produccion;
 * se ejercita el cableado real del `AiModule` (sonda `/health` + proxy de
 * degradacion + fallback) tal como lo consumiria el `Pipeline_Analisis`.
 *
 * _Requirements: 35.3_
 */
import { HttpService } from '@nestjs/axios';
import {
    Body,
    Controller,
    Inject,
    type INestApplication,
    Logger,
    Post,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { throwError } from 'rxjs';
import request from 'supertest';

import { AiModule } from './ai.module';
import {
    CAPA_ML,
    FILTRO_RELEVANCIA,
    SERVICIO_NLP,
    SERVICIO_VISION,
} from './interfaces/tokens';

import type { FiltroRelevancia } from '../modules/analisis/interfaces';
import type { ServicioNLP } from '../modules/analisis/servicioNLP';
import type { ServicioVision } from '../modules/analisis/servicioVision';
import type { ContratoNormalizado } from '../modules/contracts/contratoNormalizado';
import type { CapaML } from '../modules/ml/capaML';

/**
 * Controlador SOLO de prueba que ejecuta un ciclo de analisis de una semana a
 * traves de las interfaces estables del `Servicio_IA`. Depende UNICAMENTE de los
 * tokens DI (igual que el `Pipeline_Analisis`), por lo que la eleccion HTTP vs
 * fallback la resuelve el proxy de degradacion en tiempo de llamada.
 */
@Controller('ciclo')
class CicloDegradacionController {
    constructor(
        @Inject(SERVICIO_NLP) private readonly nlp: ServicioNLP,
        @Inject(SERVICIO_VISION) private readonly vision: ServicioVision,
        @Inject(FILTRO_RELEVANCIA) private readonly filtro: FiltroRelevancia,
        @Inject(CAPA_ML) private readonly capaMl: CapaML,
    ) { }

    @Post('procesar-semana')
    async procesarSemana(
        @Body() contrato: ContratoNormalizado,
    ): Promise<Record<string, unknown>> {
        // Orden de etapas del pipeline: relevancia -> NLP -> vision -> embeddings.
        // Ninguna llamada debe propagar el fallo del `Servicio_IA` caido.
        const relevancia = await this.filtro.clasificar(contrato);
        const nlp = await this.nlp.analizar(contrato);
        const vision = await this.vision.analizar(contrato.image_description);
        const textos = [
            contrato.post.texto,
            ...contrato.comments.map((c) => c.texto),
        ];
        const embeddings = await this.capaMl.embeddings(textos);

        return {
            completado: true,
            relevancia,
            nlp,
            vision,
            embeddings,
        };
    }
}

/** `Contrato_Normalizado` valido de ejemplo para ejercitar el ciclo. */
function contratoEjemplo(): ContratoNormalizado {
    return {
        post: { autorId: 'u1', texto: 'Hoy fue un dia agotador en el colegio' },
        comments: [
            { autorId: 'u2', texto: 'Te entiendo, paso lo mismo', enRespuestaA: null },
            { autorId: 'u3', texto: '#animo no estas solo', enRespuestaA: 'u1' },
        ],
        image_description: 'Un grupo de estudiantes conversa en el patio',
        hashtags: ['#animo'],
        metadata: {
            version: '1.0.0',
            fuente: 'test',
            generadoEn: '2024-01-01T00:00:00.000Z',
            semana: 1,
            idioma: 'es-BO',
        },
    };
}

/**
 * Doble del `HttpService` que simula el `Servicio_IA` CAIDO: toda llamada HTTP
 * (sonda `/health` y endpoints analiticos) falla. La sonda traduce el fallo a
 * "indisponible" y el proxy degrada al fallback determinista TS.
 */
function httpServicioIaCaido(): {
    http: Partial<HttpService>;
    get: jest.Mock;
    post: jest.Mock;
} {
    const fallo = () =>
        throwError(() => new Error('connect ECONNREFUSED 127.0.0.1:8000'));
    const get = jest.fn(fallo);
    const post = jest.fn(fallo);
    return { http: { get, post } as unknown as Partial<HttpService>, get, post };
}

describe('Degradacion segura del Servicio_IA con Supertest (tarea 8.5, Req. 35.3)', () => {
    let app: INestApplication;
    let warnSpy: jest.SpyInstance;
    let httpDoble: ReturnType<typeof httpServicioIaCaido>;

    beforeAll(async () => {
        httpDoble = httpServicioIaCaido();

        // Captura los incidentes de degradacion registrados por los proxies
        // (`Logger.warn`) sin ensuciar la salida de la suite.
        warnSpy = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);

        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                // El `AiModule` resuelve `SERVICIO_IA_URL` desde ConfigService.
                ConfigModule.forRoot({ isGlobal: true }),
                AiModule,
            ],
            controllers: [CicloDegradacionController],
        })
            // Servicio_IA CAIDO: toda llamada HTTP falla (sonda y endpoints).
            .overrideProvider(HttpService)
            .useValue(httpDoble.http)
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        warnSpy?.mockRestore();
        await app?.close();
    });

    it('el ciclo CONTINUA y responde 2xx pese al Servicio_IA caido (no se bloquea)', async () => {
        const res = await request(app.getHttpServer())
            .post('/ciclo/procesar-semana')
            .send(contratoEjemplo());

        expect(res.status).toBeLessThan(300);
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.body.completado).toBe(true);
    });

    it('los resultados provienen del FALLBACK determinista TS (calculo base)', async () => {
        const res = await request(app.getHttpServer())
            .post('/ciclo/procesar-semana')
            .send(contratoEjemplo());

        // NLP fallback: marca su origen como comprension contextual determinista.
        expect(res.body.nlp.derivadoDeComprensionContextual).toBe(true);
        // Vision fallback: deriva una escena no vacia de la image_description.
        expect(typeof res.body.vision.scene).toBe('string');
        expect(res.body.vision.scene.length).toBeGreaterThan(0);
        // Filtro_Relevancia fallback: clasifica los 3 items (post + 2 comentarios).
        const totalClasificados =
            res.body.relevancia.contributivos.length +
            res.body.relevancia.noContributivos.length;
        expect(totalClasificados).toBe(3);
        // Capa_ML fallback: produce un embedding por texto del contrato.
        expect(Array.isArray(res.body.embeddings)).toBe(true);
        expect(res.body.embeddings.length).toBe(3);
    });

    it('NUNCA se consume el Servicio_IA por HTTP para el calculo (solo la sonda /health)', async () => {
        httpDoble.get.mockClear();
        httpDoble.post.mockClear();

        await request(app.getHttpServer())
            .post('/ciclo/procesar-semana')
            .send(contratoEjemplo())
            .expect((r) => expect(r.status).toBeLessThan(300));

        // La sonda intenta GET /health (y falla -> indisponible); el calculo NO
        // llega a hacer POST a los endpoints analiticos: va directo al fallback.
        expect(httpDoble.post).not.toHaveBeenCalled();
    });

    it('REGISTRA el incidente de degradacion (Req. 35.3)', async () => {
        // Tras ejercitar el ciclo en los its previos, los proxies de los cuatro
        // subsistemas registraron su transicion a degradado.
        const incidentes = warnSpy.mock.calls.filter(([mensaje]) =>
            String(mensaje).includes('Degradacion segura'),
        );
        expect(incidentes.length).toBeGreaterThan(0);
    });
});
