import { useEffect, useMemo, useState } from "react";
import { getCatalogoRoles } from "../../../services/catalogoRoles";
import { getMatrizPorRol, actualizarMatrizPorRol } from "../../../services/permisos";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import Alerts from "../../../components/Alerts";
import { Save, Eye, EyeOff, PenSquare } from "lucide-react";

const NIVELES = [
    { valor: "SIN_ACCESO", label: "Sin acceso", icon: EyeOff, activo: "bg-slate-700 text-white", inactivo: "text-slate-400 hover:bg-slate-100" },
    { valor: "OBSERVADOR", label: "Observador", icon: Eye, activo: "bg-sky-600 text-white", inactivo: "text-slate-400 hover:bg-slate-100" },
    { valor: "EDITOR", label: "Editor", icon: PenSquare, activo: "bg-emerald-600 text-white", inactivo: "text-slate-400 hover:bg-slate-100" },
];

/** Agrupa la lista plana (con id_padre) en módulos de primer nivel + sus submódulos. */
function agruparPorPadre(lista) {
    const porId = new Map(lista.map((r) => [r.id_recurso, r]));
    const raiz = lista.filter((r) => !r.id_padre || !porId.has(r.id_padre));
    return raiz.map((padre) => ({
        padre,
        hijos: lista.filter((r) => r.id_padre === padre.id_recurso),
    }));
}

function SelectorNivel({ valor, onChange }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
            {NIVELES.map((n) => {
                const Icono = n.icon;
                const activo = valor === n.valor;
                return (
                    <button
                        key={n.valor}
                        type="button"
                        onClick={() => onChange(n.valor)}
                        title={n.label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${activo ? n.activo : n.inactivo}`}
                    >
                        <Icono className="w-3.5 h-3.5" /> {n.label}
                    </button>
                );
            })}
        </div>
    );
}

const PermisosPorRolTab = () => {
    const [roles, setRoles] = useState([]);
    const [idRol, setIdRol] = useState("");
    const [original, setOriginal] = useState([]);
    const [draft, setDraft] = useState({}); // { id_recurso: nivel }
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [confirmarGuardado, setConfirmarGuardado] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: "success", msg: "" });

    const showAlert = (type, msg) => {
        setAlert({ show: true, type, msg });
        setTimeout(() => setAlert((a) => ({ ...a, show: false })), 3500);
    };

    useEffect(() => {
        getCatalogoRoles()
            .then((data) => {
                setRoles(data);
                const primero = data.find((r) => r.activo) ?? data[0];
                if (primero) setIdRol(String(primero.id_rol_catalogo));
            })
            .catch(() => showAlert("error", "Error al cargar el catálogo de roles."));
    }, []);

    const cargarMatriz = async (id) => {
        setLoading(true);
        try {
            const matriz = await getMatrizPorRol(id);
            setOriginal(matriz);
            setDraft(Object.fromEntries(matriz.map((r) => [r.id_recurso, r.nivel])));
        } catch {
            showAlert("error", "Error al cargar la matriz de permisos.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { if (idRol) cargarMatriz(Number(idRol)); }, [idRol]);

    const grupos = useMemo(() => agruparPorPadre(original), [original]);
    const hayCambios = useMemo(
        () => original.some((r) => draft[r.id_recurso] !== r.nivel),
        [original, draft]
    );

    const guardar = async () => {
        setGuardando(true);
        try {
            const permisos = Object.entries(draft).map(([id_recurso, nivel]) => ({
                id_recurso: Number(id_recurso),
                nivel,
            }));
            await actualizarMatrizPorRol(Number(idRol), permisos);
            showAlert("success", "Matriz de permisos actualizada correctamente.");
            cargarMatriz(Number(idRol));
        } catch {
            showAlert("error", "Error al guardar la matriz de permisos.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
                <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Rol</label>
                    <select
                        value={idRol}
                        onChange={(e) => setIdRol(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                        {roles.map((r) => (
                            <option key={r.id_rol_catalogo} value={r.id_rol_catalogo}>
                                {r.nombre.replaceAll("_", " ")}{!r.activo ? " (inactivo)" : ""}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => setConfirmarGuardado(true)}
                    disabled={!hayCambios || guardando}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition shrink-0 ${hayCambios && !guardando ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                >
                    <Save className="w-4 h-4" /> Guardar cambios
                </button>
            </div>

            <p className="text-sm text-slate-500">
                Esta es la plantilla de permisos <strong>por defecto</strong> del rol. Un usuario individual con
                este rol puede tener overrides propios en la pestaña "Permisos por usuario" que ganan sobre esto.
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-medium">Cargando matriz…</div>
            ) : (
                <div className="space-y-3">
                    {grupos.map(({ padre, hijos }) => (
                        <div key={padre.id_recurso} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70">
                                <span className="font-semibold text-slate-800 text-sm">{padre.nombre}</span>
                                <SelectorNivel
                                    valor={draft[padre.id_recurso]}
                                    onChange={(nivel) => setDraft((d) => ({ ...d, [padre.id_recurso]: nivel }))}
                                />
                            </div>
                            {hijos.length > 0 && (
                                <div className="divide-y divide-slate-100">
                                    {hijos.map((hijo) => (
                                        <div key={hijo.id_recurso} className="flex items-center justify-between gap-3 px-4 py-2.5 pl-8">
                                            <span className="text-slate-600 text-sm">{hijo.nombre}</span>
                                            <SelectorNivel
                                                valor={draft[hijo.id_recurso]}
                                                onChange={(nivel) => setDraft((d) => ({ ...d, [hijo.id_recurso]: nivel }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ConfirmActionModal
                isOpen={confirmarGuardado}
                variant="edit"
                title="¿Guardar la matriz de permisos?"
                message="Esto cambia lo que ven y pueden hacer TODOS los usuarios con este rol, salvo quienes tengan un override individual."
                onClose={() => setConfirmarGuardado(false)}
                onConfirm={async () => {
                    await guardar();
                    setConfirmarGuardado(false);
                }}
            />

            <Alerts type={alert.type} message={alert.msg} show={alert.show} onClose={() => setAlert((a) => ({ ...a, show: false }))} />
        </div>
    );
};

export default PermisosPorRolTab;
