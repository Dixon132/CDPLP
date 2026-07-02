import React, { useState } from "react";
import { updateMemoria } from "../../../services/memorias";
import { Save, X } from "lucide-react";
import Alerts from "../../../components/Alerts";

const EditMemoria = ({ memoria, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        titulo: memoria.titulo || "",
        descripcion: memoria.descripcion || "",
        categoria: memoria.categoria || "Memorias Anuales",
        anio: memoria.anio || new Date().getFullYear(),
        archivo: null
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: "success", message: "" });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "archivo") {
            setFormData(prev => ({ ...prev, archivo: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append("titulo", formData.titulo);
            data.append("descripcion", formData.descripcion);
            data.append("categoria", formData.categoria);
            data.append("anio", formData.anio);
            if (formData.archivo) {
                data.append("archivo", formData.archivo);
            }

            await updateMemoria(memoria.id, data);
            onSuccess();
        } catch (error) {
            showAlert("error", "Error al actualizar el documento");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Alerts type={alert.type} message={alert.message} show={alert.show} duration={2000} onClose={() => setAlert((prev) => ({ ...prev, show: false }))} />
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                    <input
                        type="text"
                        name="titulo"
                        value={formData.titulo}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-200"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-200"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <select
                            name="categoria"
                            value={formData.categoria}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-200"
                        >
                            <option value="Memorias Anuales">Memorias Anuales</option>
                            <option value="Balances Financieros">Balances Financieros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                        <input
                            type="number"
                            name="anio"
                            value={formData.anio}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-200"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Archivo (Opcional si no desea cambiarlo)</label>
                    <input
                        type="file"
                        name="archivo"
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5" /> Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" /> {loading ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </form>
        </>
    );
};

export default EditMemoria;
