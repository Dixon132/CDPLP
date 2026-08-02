import { useEffect, useMemo, useState } from "react";
import { getUsuariosSimples } from "../../../services/usuarios";
import { getPermisosDeUsuario, upsertOverridePermiso, restablecerPermiso } from "../../../services/permisos";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import Alerts from "../../../components/Alerts";
import { Eye, EyeOff, PenSquare, Check, Undo2, UserCog, ShieldCheck } from "lucide-react";

const NIVELES = [
    { valor: "SIN_ACCESO", label: "Sin acceso", icon: EyeOff, activo: "bg-slate-700 text-white", inactivo: "text-slate-400 hover:bg-slate-100" },
    { valor: "OBSERVADOR", label: "Observador", icon: Eye, activo: "bg-sky-600 text-white", inactivo: "text-slate-400 hover:bg-slate-100" },
    { valor: "EDITOR", label: "Editor", icon: PenSquare, activo: "bg-emerald-600 text-white", inactivo: "text-slate-400 hover:bg-slate-100" },
];

function agruparPorPadre(lista) {
    const porId = new Map(lista.map((r) => [r.id_recurso, r]));
    const raiz = lista.filter((r) => !r.id_padre || !porId.has(r.id_padre));
    return raiz.map((padre) => ({ padre, hijos: lista.filter((r) => r.id_padre === padre.id_recurso) }));
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

/** Fila de un recurso: selector editable + "Guardar" (si cambió) + "Restablecer" (si es un override). */
function FilaRecurso({ recurso, pendiente, onCambiar, onGuardar, onRestablecer, indent }) {
    const cambio = pendiente !== recurso.nivel_efectivo;
    return (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${indent ? "pl-8" : ""}`}>
            <div className="min-w-0 flex-1">
                <p className={`text-sm ${indent ? "text-slate-600" : "font-semibold text-slate-800"}`}>{recurso.nombre}</p>
                {recurso.personalizado ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                        Personalizado (rol: {recurso.nivel_heredado.replace("_", " ").toLowerCase()})
                    </span>
                ) : (
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Heredado del rol</span>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <SelectorNivel valor={pendiente} onChange={onCambiar} />
                {cambio && (
                    <button
                        type="button"
                        onClick={onGuardar}
                        title="Guardar este permiso para este usuario"
                        className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                )}
                {recurso.personalizado && !cambio && (
                    <button
                        type="button"
                        onClick={onRestablecer}
                        title="Restablecer al permiso del rol"
                        className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

const PermisosPorUsuarioTab = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [idUsuario, setIdUsuario] = useState("");
    const [rolUsuario, setRolUsuario] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [pendientes, setPendientes] = useState({});
    const [loading, setLoading] = useState(false);
    const [accionPendiente, setAccionPendiente] = useState(null); // { tipo: 'guardar'|'restablecer', recurso }
    const [alert, setAlert] = useState({ show: false, type: "success", msg: "" });

    const showAlert = (type, msg) => {
        setAlert({ show: true, type, msg });
        setTimeout(() => setAlert((a) => ({ ...a, show: false })), 3500);
    };

    useEffect(() => {
        getUsuariosSimples()
            .then(setUsuarios)
            .catch(() => showAlert("error", "Error al cargar la lista de usuarios."));
    }, []);

    const cargarPermisos = async (id) => {
        setLoading(true);
        try {
            const { rol, permisos: lista } = await getPermisosDeUsuario(id);
            setRolUsuario(rol);
            setPermisos(lista);
            setPendientes(Object.fromEntries(lista.map((r) => [r.id_recurso, r.nivel_efectivo])));
        } catch {
            showAlert("error", "Error al cargar los permisos del usuario.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { if (idUsuario) cargarPermisos(Number(idUsuario)); }, [idUsuario]);

    const grupos = useMemo(() => agruparPorPadre(permisos), [permisos]);

    const ejecutarAccion = async () => {
        if (!accionPendiente) return;
        const { tipo, recurso } = accionPendiente;
        try {
            if (tipo === "guardar") {
                await upsertOverridePermiso(Number(idUsuario), recurso.id_recurso, pendientes[recurso.id_recurso]);
                showAlert("success", `Permiso de "${recurso.nombre}" actualizado para este usuario.`);
            } else {
                await restablecerPermiso(Number(idUsuario), recurso.id_recurso);
                showAlert("success", `Permiso de "${recurso.nombre}" restablecido al del rol.`);
            }
            cargarPermisos(Number(idUsuario));
        } catch {
            showAlert("error", "Error al actualizar el permiso.");
        } finally {
            setAccionPendiente(null);
        }
    };

    return (
        <div className="space-y-5">
            <div className="max-w-xs">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Usuario</label>
                <select
                    value={idUsuario}
                    onChange={(e) => setIdUsuario(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    <option value="">-- Seleccione un usuario --</option>
                    {usuarios.map((u) => (
                        <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellido}</option>
                    ))}
                </select>
            </div>

            {!idUsuario && (
                <div className="bg-white/60 rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-400 flex flex-col items-center gap-2">
                    <UserCog className="w-8 h-8" />
                    Selecciona un usuario para ver y personalizar sus permisos.
                </div>
            )}

            {idUsuario && rolUsuario && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-fit">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Rol actual: <strong>{rolUsuario.nombre.replaceAll("_", " ")}</strong>
                </div>
            )}
            {idUsuario && !rolUsuario && !loading && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 w-fit">
                    Este usuario no tiene un rol vigente — solo tendrá acceso a lo que se le personalice acá.
                </div>
            )}

            {idUsuario && (loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-medium">Cargando permisos…</div>
            ) : (
                <div className="space-y-3">
                    {grupos.map(({ padre, hijos }) => (
                        <div key={padre.id_recurso} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50/70">
                                <FilaRecurso
                                    recurso={padre}
                                    pendiente={pendientes[padre.id_recurso]}
                                    onCambiar={(nivel) => setPendientes((p) => ({ ...p, [padre.id_recurso]: nivel }))}
                                    onGuardar={() => setAccionPendiente({ tipo: "guardar", recurso: padre })}
                                    onRestablecer={() => setAccionPendiente({ tipo: "restablecer", recurso: padre })}
                                />
                            </div>
                            {hijos.length > 0 && (
                                <div className="divide-y divide-slate-100">
                                    {hijos.map((hijo) => (
                                        <FilaRecurso
                                            key={hijo.id_recurso}
                                            recurso={hijo}
                                            pendiente={pendientes[hijo.id_recurso]}
                                            onCambiar={(nivel) => setPendientes((p) => ({ ...p, [hijo.id_recurso]: nivel }))}
                                            onGuardar={() => setAccionPendiente({ tipo: "guardar", recurso: hijo })}
                                            onRestablecer={() => setAccionPendiente({ tipo: "restablecer", recurso: hijo })}
                                            indent
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}

            <ConfirmActionModal
                isOpen={!!accionPendiente}
                variant="edit"
                confirmColor={accionPendiente?.tipo === "restablecer" ? "amber" : "blue"}
                title={accionPendiente?.tipo === "restablecer" ? "¿Restablecer al permiso del rol?" : "¿Guardar este permiso personalizado?"}
                message={
                    accionPendiente?.tipo === "restablecer"
                        ? `"${accionPendiente?.recurso?.nombre}" volverá a usar el permiso por defecto del rol de este usuario.`
                        : `Este usuario tendrá "${accionPendiente?.recurso?.nombre}" en ${pendientes[accionPendiente?.recurso?.id_recurso]?.replace("_", " ").toLowerCase()}, sin importar lo que diga su rol.`
                }
                onClose={() => setAccionPendiente(null)}
                onConfirm={ejecutarAccion}
            />

            <Alerts type={alert.type} message={alert.msg} show={alert.show} onClose={() => setAlert((a) => ({ ...a, show: false }))} />
        </div>
    );
};

export default PermisosPorUsuarioTab;
