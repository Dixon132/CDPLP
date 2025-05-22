import { useForm } from "react-hook-form";

const ModificarColegiado = ({ id }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm();
    const usuarios = [
  { "id": 1, "nombre": "Juan Pérez" },
  { "id": 2, "nombre": "Ana Gómez" }
]

    const onSubmit = (data) => {
        console.log('Datos enviados:', data);
        reset(); // Limpia el formulario si deseas
    };
    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Formulario de Proyecto</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {/* Fecha de Fin */}
                <div>
                    <label htmlFor="fecha_fin" className="block font-medium text-gray-700 mb-1">Fecha de Fin</label>
                    <input
                        id="fecha_fin"
                        type="date"
                        {...register('fecha_fin', {
                            required: 'La fecha es obligatoria', validate: value => {
                                const seleccionada = new Date(value);
                                const hoy = new Date();
                                hoy.setHours(0, 0, 0, 0); // para comparar solo fecha, no hora
                                return seleccionada > hoy || 'Debe ser una fecha futura';
                            }
                        })}
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fecha_fin ? 'border-red-500' : 'border-gray-300'
                            }`}
                    />
                    {errors.fecha_fin && <p className="text-red-500 text-sm mt-1">{errors.fecha_fin.message}</p>}
                </div>

                {/* Costo */}
                <div>
                    <label htmlFor="costo" className="block font-medium text-gray-700 mb-1">Costo</label>
                    <input
                        id="costo"
                        type="number"
                        step="0.01"
                        {...register('costo', {
                            required: 'El costo es obligatorio',
                            valueAsNumber: true,
                            min: { value: 0.01, message: 'Debe ser mayor a 0' }
                        })}
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.costo ? 'border-red-500' : 'border-gray-300'
                            }`}
                    />
                    {errors.costo && <p className="text-red-500 text-sm mt-1">{errors.costo.message}</p>}
                </div>

                {/* Estado */}
                <div>
                    <label htmlFor="estado" className="block font-medium text-gray-700 mb-1">Estado</label>
                    <select
                        id="estado"
                        {...register('estado', { required: 'Selecciona un estado' })}
                        className={`w-full border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.estado ? 'border-red-500' : 'border-gray-300'
                            }`}
                    >
                        <option value="">-- Seleccionar --</option>
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="INACTIVO">INACTIVO</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                    </select>
                    {errors.estado && <p className="text-red-500 text-sm mt-1">{errors.estado.message}</p>}
                </div>

                {/* Responsable */}
                <div>
                    <label htmlFor="responsable" className="block font-medium text-gray-700 mb-1">Responsable</label>
                    <select
                        id="responsable_id"
                        {...register('responsable', {
                            required: 'Selecciona un responsable',
                            validate: value => Number(value) > 0 || 'Debes seleccionar un usuario'
                        })}
                        className={`w-full border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.responsable ? 'border-red-500' : 'border-gray-300'
                            }`}
                    >
                        <option value="">-- Seleccionar responsable --</option>
                        {usuarios.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.nombre}
                            </option>
                        ))}
                    </select>
                    {errors.responsable && <p className="text-red-500 text-sm mt-1">{errors.responsable.message}</p>}

                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
};

export default ModificarColegiado;