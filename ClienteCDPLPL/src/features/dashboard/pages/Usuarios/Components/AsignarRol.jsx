import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { createRol } from '../../../services/roles';


const AsignarRol = ({ onSuccess }) => {
    const [usuarios, setUsuarios] = useState([]);
    const { register, handleSubmit, formState: { errors } } = useForm();

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const response = await axios.get('/api/usuarios/activos');
                setUsuarios(response.data);
            } catch (error) {
                console.error('Error al obtener usuarios:', error);
            }
        };
        fetchUsuarios();
    }, []);

    const onSubmit = async (data) => {
        try {
            await createRol(data);
            onSuccess?.();
        } catch (error) {
            console.error('Error al asignar rol:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Usuario
                </label>
                <select
                    {...register('id_usuario', { required: 'Este campo es obligatorio' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="">Seleccione un usuario</option>
                    {usuarios.map((usuario) => (
                        <option key={usuario.id_usuario} value={usuario.id_usuario}>
                            {`${usuario.nombre} ${usuario.apellido}`}
                        </option>
                    ))}
                </select>
                {errors.id_usuario && (
                    <p className="mt-1 text-sm text-red-600">{errors.id_usuario.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Rol
                </label>
                <select
                    {...register('rol', { required: 'Este campo es obligatorio' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="">Seleccione un rol</option>
                    <option value="SECRETARIO_GENERAL">Secretario General</option>
                    <option value="PRESIDENTE">Presidente</option>
                    <option value="VICEPRESIDENTE">Vicepresidente</option>
                    <option value="VOCAL">Vocal</option>
                    <option value="SECRETARIO">Secretario</option>
                </select>
                {errors.rol && (
                    <p className="mt-1 text-sm text-red-600">{errors.rol.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Fecha Inicio
                </label>
                <input
                    type="date"
                    {...register('fecha_inicio', { required: 'Este campo es obligatorio' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.fecha_inicio && (
                    <p className="mt-1 text-sm text-red-600">{errors.fecha_inicio.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Fecha Fin (opcional)
                </label>
                <input
                    type="date"
                    {...register('fecha_fin')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => onSuccess?.()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                    Asignar Rol
                </button>
            </div>
        </form>
    );
};

export default AsignarRol; 