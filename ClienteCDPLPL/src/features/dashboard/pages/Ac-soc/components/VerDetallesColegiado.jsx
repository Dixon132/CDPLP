import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Calendar,
    MapPin,
    Target,
    FileText,
    Users,
    UserPlus,
    Eye,
    Mail,
    Phone,
    Briefcase,
    GraduationCap,
    Building2,
    ArrowLeft,
    X
} from "lucide-react";

const VerDetallesColegiado = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalAsignarColegiados, setModalAsignarColegiados] = useState(false);
    const [modalAsignarPasantes, setModalAsignarPasantes] = useState(false);

    const [alert, setAlert] = useState({ show: false, type: "", message: "" });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert({ show: false, type: "", message: "" }), 3000);
    };

    useEffect(() => {
        fetch(`/api/ac-sociales/ac-social/detalles/${id}`)
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError("Error al cargar datos");
                setLoading(false);
            });
    }, [id]);

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );

    if (error)
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500 text-lg">{error}</p>
            </div>
        );

    const {
        nombre,
        descripcion,
        ubicacion,
        motivo,
        fecha_inicio,
        fecha_fin,
        estado,
        tipo,
        colegiados_asignados_social = [],
        pasantes_asignados_social = [],
        convenio,
    } = data;

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getEstadoColor = (estado) => {
        const colors = {
            ACTIVO: "bg-green-100 text-green-700",
            "EN PROGRESO": "bg-blue-100 text-blue-700",
            FINALIZADO: "bg-gray-100 text-gray-700",
            PENDIENTE: "bg-yellow-100 text-yellow-700",
        };
        return colors[estado] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20 p-6">
            {/* Alert */}
            {alert.show && (
                <div
                    className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${alert.type === "success"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                >
                    <span>{alert.message}</span>
                    <button onClick={() => setAlert({ ...alert, show: false })}>
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Volver</span>
                            </button>
                            <h1 className="text-3xl font-bold text-slate-800 mb-2">
                                {nombre}
                            </h1>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(estado)}`}>
                                    {estado}
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                                    {tipo}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Información General */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            Información General
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Descripción</p>
                                <p className="text-slate-700">{descripcion || "Sin descripción"}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="w-5 h-5 text-pink-500 mt-1" />
                                <div>
                                    <p className="text-sm text-slate-500">Ubicación</p>
                                    <p className="text-slate-700">{ubicacion}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Target className="w-5 h-5 text-blue-500 mt-1" />
                                <div>
                                    <p className="text-sm text-slate-500">Motivo</p>
                                    <p className="text-slate-700">{motivo}</p>
                                </div>
                            </div>
                            {convenio && (
                                <div className="flex items-start gap-2">
                                    <Building2 className="w-5 h-5 text-green-500 mt-1" />
                                    <div>
                                        <p className="text-sm text-slate-500">Convenio</p>
                                        <p className="text-slate-700">{convenio.nombre}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            Fechas
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-600 font-medium mb-1">
                                    Fecha de Inicio
                                </p>
                                <p className="text-lg text-green-800 font-semibold">
                                    {formatDate(fecha_inicio)}
                                </p>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-600 font-medium mb-1">
                                    Fecha de Fin
                                </p>
                                <p className="text-lg text-red-800 font-semibold">
                                    {formatDate(fecha_fin)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Colegiados Asignados */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            Colegiados Asignados ({colegiados_asignados_social.length})
                        </h2>
                        <button
                            onClick={() => setModalAsignarColegiados(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            Asignar Colegiados
                        </button>
                    </div>

                    {colegiados_asignados_social.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {colegiados_asignados_social.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                {item.colegiados?.nombre?.charAt(0) || "C"}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {item.colegiados?.nombre} {item.colegiados?.apellido}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    CI: {item.colegiados?.carnet_identidad}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <GraduationCap className="w-4 h-4 text-purple-500" />
                                            <span>{item.colegiados?.especialidades || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail className="w-4 h-4 text-pink-500" />
                                            <span className="truncate">{item.colegiados?.correo || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone className="w-4 h-4 text-blue-500" />
                                            <span>{item.colegiados?.telefono || "N/A"}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/colegiados/${item.colegiados?.id_colegiado}`)}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Perfil Completo
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No hay colegiados asignados</p>
                        </div>
                    )}
                </div>

                {/* Pasantes Asignados */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-pink-600" />
                            Pasantes Asignados ({pasantes_asignados_social.length})
                        </h2>
                        <button
                            onClick={() => setModalAsignarPasantes(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            Asignar Pasantes
                        </button>
                    </div>

                    {pasantes_asignados_social.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pasantes_asignados_social.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-100 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                {item.pasantes?.nombre?.charAt(0) || "P"}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {item.pasantes?.nombre} {item.pasantes?.apellido}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    CI: {item.pasantes?.carnet_identidad}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Building2 className="w-4 h-4 text-pink-500" />
                                            <span>{item.pasantes?.institucion || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail className="w-4 h-4 text-purple-500" />
                                            <span className="truncate">{item.pasantes?.correo || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone className="w-4 h-4 text-blue-500" />
                                            <span>{item.pasantes?.telefono || "N/A"}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/pasantes/${item.pasantes?.id_pasante}`)}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-pink-600 rounded-lg text-sm font-medium hover:bg-pink-50 transition"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Perfil Completo
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No hay pasantes asignados</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Asignar Colegiados (placeholder) */}
            {modalAsignarColegiados && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-800">
                                Asignar Colegiados
                            </h3>
                            <button
                                onClick={() => setModalAsignarColegiados(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Aquí va tu componente AsignarColegiados */}
                            <p className="text-center text-slate-500">
                                Componente de asignación de colegiados
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Asignar Pasantes (placeholder) */}
            {modalAsignarPasantes && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-800">
                                Asignar Pasantes
                            </h3>
                            <button
                                onClick={() => setModalAsignarPasantes(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Aquí va tu componente AsignarPasantes */}
                            <p className="text-center text-slate-500">
                                Componente de asignación de pasantes
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerDetallesColegiado;