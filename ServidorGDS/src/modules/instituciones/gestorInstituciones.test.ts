/**
 * Pruebas unitarias de CRUD y geolocalizacion del `Gestor_Instituciones`
 * (tarea 21.3).
 *
 * Cubren, sobre el `Gestor_Instituciones` REAL (tarea 21.1) ejercido con un
 * DOBLE EN MEMORIA del puerto `InstitucionesRepositorio` (sin base de datos,
 * determinista):
 *  - Alta y edicion de una `Institucion` (Req. 7.1, 7.5).
 *  - Categorias validas {universidad, colegio, instituto, escuela} (Req. 7.2).
 *  - Almacenamiento de coordenadas (lat/lng) y radio de influencia (Req. 7.3).
 *  - Referencia al archivo del logo (Req. 7.4).
 *  - Registro de los cambios para auditoria en alta y edicion (Req. 7.5).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
 */
import { beforeEach, describe, expect, it } from "vitest";

import { GestorInstituciones } from "./gestorInstituciones";
import { CATEGORIAS_INSTITUCION } from "./instituciones.types";
import type {
    CambiosInstitucion,
    DatosInstitucion,
    DependenciasInstitucion,
    EventoAuditoria,
    Institucion,
    InstitucionesRepositorio,
    RegistroAuditoria,
} from "./instituciones.types";
import {
    InstitucionNoEncontradaError,
    ValidacionInstitucionError,
} from "./instituciones.errores";
import { construirDependencias } from "./instituciones.dependencias";

// ---------------------------------------------------------------------------
// Doble en memoria del puerto `InstitucionesRepositorio` (sin BD). Reproduce la
// semantica de persistencia/edicion de la implementacion Prisma para ejercer la
// logica REAL del gestor de forma determinista.
// ---------------------------------------------------------------------------
class RepositorioInstitucionesEnMemoria implements InstitucionesRepositorio {
    private readonly instituciones = new Map<string, Institucion>();
    private seq = 0;

    async crear(datos: DatosInstitucion): Promise<Institucion> {
        const id = `inst-${++this.seq}`;
        const institucion: Institucion = { id, ...datos };
        this.instituciones.set(id, { ...institucion });
        return { ...institucion };
    }

    async listar(): Promise<Institucion[]> {
        return [...this.instituciones.values()].map((i) => ({ ...i }));
    }

    async obtenerPorId(id: string): Promise<Institucion | null> {
        const i = this.instituciones.get(id);
        return i ? { ...i } : null;
    }

    async actualizar(
        id: string,
        cambios: CambiosInstitucion,
    ): Promise<Institucion> {
        const existente = this.instituciones.get(id);
        if (!existente) {
            throw new InstitucionNoEncontradaError(id);
        }
        const actualizado: Institucion = { ...existente, ...cambios };
        this.instituciones.set(id, actualizado);
        return { ...actualizado };
    }

    async contarDependencias(): Promise<DependenciasInstitucion> {
        return construirDependencias({
            comunidades: 0,
            ciclos: 0,
            evidencias: 0,
            reportes: 0,
        });
    }

    async eliminarAtomico(id: string): Promise<void> {
        if (!this.instituciones.has(id)) {
            throw new InstitucionNoEncontradaError(id);
        }
        this.instituciones.delete(id);
    }
}

/** Doble de auditoria que captura los eventos registrados (Req. 7.5). */
class AuditoriaEnMemoria implements RegistroAuditoria {
    readonly eventos: EventoAuditoria[] = [];
    registrar(evento: EventoAuditoria): void {
        this.eventos.push(evento);
    }
}

const baseValida: DatosInstitucion = {
    nombre: "Universidad Mayor de San Andres",
    categoria: "universidad",
    latitud: -16.5,
    longitud: -68.15,
    radioMetros: 800,
    logoUrl: null,
    descripcion: null,
};

describe("GestorInstituciones: alta (CRUD) y geolocalizacion (Req. 7.1, 7.3)", () => {
    let repo: RepositorioInstitucionesEnMemoria;
    let auditoria: AuditoriaEnMemoria;
    let gestor: GestorInstituciones;

    beforeEach(() => {
        repo = new RepositorioInstitucionesEnMemoria();
        auditoria = new AuditoriaEnMemoria();
        gestor = new GestorInstituciones(repo, auditoria);
    });

    it("crea y persiste una institucion con su id asignado (Req. 7.1)", async () => {
        const inst = await gestor.crear(baseValida);

        expect(inst.id).toBeTruthy();
        expect(inst.nombre).toBe(baseValida.nombre);

        // Quedo efectivamente persistida y recuperable.
        const recuperada = await gestor.obtener(inst.id);
        expect(recuperada).toEqual(inst);
        expect(await gestor.listar()).toHaveLength(1);
    });

    it("almacena coordenadas (lat/lng) y radio de influencia en metros (Req. 7.3)", async () => {
        const inst = await gestor.crear({
            ...baseValida,
            latitud: -17.3895,
            longitud: -66.1568,
            radioMetros: 1500,
        });

        expect(inst.latitud).toBe(-17.3895);
        expect(inst.longitud).toBe(-66.1568);
        expect(inst.radioMetros).toBe(1500);

        const recuperada = await gestor.obtener(inst.id);
        expect(recuperada.latitud).toBe(-17.3895);
        expect(recuperada.longitud).toBe(-66.1568);
        expect(recuperada.radioMetros).toBe(1500);
    });

    it("acepta coordenadas en los limites del rango (Req. 7.3)", async () => {
        const inst = await gestor.crear({
            ...baseValida,
            latitud: 90,
            longitud: -180,
            radioMetros: 1,
        });
        expect(inst.latitud).toBe(90);
        expect(inst.longitud).toBe(-180);
        expect(inst.radioMetros).toBe(1);
    });

    it("rechaza coordenadas fuera de rango (Req. 7.3)", async () => {
        await expect(
            gestor.crear({ ...baseValida, latitud: 90.0001 }),
        ).rejects.toBeInstanceOf(ValidacionInstitucionError);
        await expect(
            gestor.crear({ ...baseValida, longitud: 181 }),
        ).rejects.toBeInstanceOf(ValidacionInstitucionError);
    });

    it("rechaza un radio no entero o no positivo (Req. 7.3)", async () => {
        await expect(
            gestor.crear({ ...baseValida, radioMetros: 0 }),
        ).rejects.toBeInstanceOf(ValidacionInstitucionError);
        await expect(
            gestor.crear({ ...baseValida, radioMetros: 12.5 }),
        ).rejects.toBeInstanceOf(ValidacionInstitucionError);
    });
});

describe("GestorInstituciones: categorias validas (Req. 7.2)", () => {
    let gestor: GestorInstituciones;

    beforeEach(() => {
        gestor = new GestorInstituciones(
            new RepositorioInstitucionesEnMemoria(),
            new AuditoriaEnMemoria(),
        );
    });

    it("acepta cada categoria del conjunto {universidad, colegio, instituto, escuela}", async () => {
        for (const categoria of CATEGORIAS_INSTITUCION) {
            const inst = await gestor.crear({ ...baseValida, categoria });
            expect(inst.categoria).toBe(categoria);
        }
    });

    it("rechaza una categoria fuera del conjunto admitido", async () => {
        await expect(
            // @ts-expect-error: categoria no admitida a proposito
            gestor.crear({ ...baseValida, categoria: "academia" }),
        ).rejects.toBeInstanceOf(ValidacionInstitucionError);
    });
});

describe("GestorInstituciones: referencia de logo (Req. 7.4)", () => {
    let gestor: GestorInstituciones;

    beforeEach(() => {
        gestor = new GestorInstituciones(
            new RepositorioInstitucionesEnMemoria(),
            new AuditoriaEnMemoria(),
        );
    });

    it("almacena la referencia al archivo del logo cuando se adjunta", async () => {
        const logoUrl = "https://cdn.gds.local/logos/umsa.png";
        const inst = await gestor.crear({ ...baseValida, logoUrl });

        expect(inst.logoUrl).toBe(logoUrl);
        const recuperada = await gestor.obtener(inst.id);
        expect(recuperada.logoUrl).toBe(logoUrl);
    });

    it("normaliza el logo ausente a null", async () => {
        const inst = await gestor.crear({ ...baseValida, logoUrl: null });
        expect(inst.logoUrl).toBeNull();
    });
});

describe("GestorInstituciones: edicion (Req. 7.5)", () => {
    let repo: RepositorioInstitucionesEnMemoria;
    let auditoria: AuditoriaEnMemoria;
    let gestor: GestorInstituciones;

    beforeEach(() => {
        repo = new RepositorioInstitucionesEnMemoria();
        auditoria = new AuditoriaEnMemoria();
        gestor = new GestorInstituciones(repo, auditoria);
    });

    it("persiste los cambios de un subconjunto de campos sin alterar el resto", async () => {
        const inst = await gestor.crear(baseValida);

        const actualizada = await gestor.actualizar(inst.id, {
            nombre: "UMSA - Sede Central",
            radioMetros: 2000,
        });

        expect(actualizada.id).toBe(inst.id);
        expect(actualizada.nombre).toBe("UMSA - Sede Central");
        expect(actualizada.radioMetros).toBe(2000);
        // Campos no provistos permanecen intactos.
        expect(actualizada.categoria).toBe(baseValida.categoria);
        expect(actualizada.latitud).toBe(baseValida.latitud);
        expect(actualizada.longitud).toBe(baseValida.longitud);
    });

    it("permite reubicar la institucion y actualizar su categoria y logo (Req. 7.2, 7.3, 7.4)", async () => {
        const inst = await gestor.crear(baseValida);

        const actualizada = await gestor.actualizar(inst.id, {
            categoria: "colegio",
            latitud: -16.4,
            longitud: -68.1,
            logoUrl: "https://cdn.gds.local/logos/colegio.png",
        });

        expect(actualizada.categoria).toBe("colegio");
        expect(actualizada.latitud).toBe(-16.4);
        expect(actualizada.longitud).toBe(-68.1);
        expect(actualizada.logoUrl).toBe("https://cdn.gds.local/logos/colegio.png");
    });

    it("rechaza una edicion con datos no conformes", async () => {
        const inst = await gestor.crear(baseValida);
        await expect(
            gestor.actualizar(inst.id, { radioMetros: -5 }),
        ).rejects.toBeInstanceOf(ValidacionInstitucionError);
        await expect(
            gestor.actualizar(inst.id, {}),
        ).rejects.toBeInstanceOf(ValidacionInstitucionError);
    });

    it("lanza InstitucionNoEncontradaError al obtener una institucion inexistente", async () => {
        await expect(gestor.obtener("inst-inexistente")).rejects.toBeInstanceOf(
            InstitucionNoEncontradaError,
        );
    });

    it("registra los cambios de alta y edicion para auditoria (Req. 7.5)", async () => {
        const actorId = "analista-1";
        const inst = await gestor.crear(baseValida, actorId);
        await gestor.actualizar(inst.id, { nombre: "Nuevo nombre" }, actorId);

        expect(auditoria.eventos).toHaveLength(2);

        const [alta, edicion] = auditoria.eventos;
        expect(alta.accion).toBe("crear");
        expect(alta.institucionId).toBe(inst.id);
        expect(alta.actorId).toBe(actorId);
        expect(alta.timestamp).toBeTruthy();

        expect(edicion.accion).toBe("actualizar");
        expect(edicion.institucionId).toBe(inst.id);
        expect(edicion.cambios).toMatchObject({ nombre: "Nuevo nombre" });
    });
});
