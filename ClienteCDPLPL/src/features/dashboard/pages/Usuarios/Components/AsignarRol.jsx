import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { actualizarRol } from '../../../services/roles';


const roles = [
    "SECRETARIO_GENERAL",
    "PRESIDENTE",
    "VICEPRESIDENTE",
    "VOCAL",
    "SECRETARIO",
    "TESORERO",
    "NO_DEFINIDO"
];
const AsignarRol = ({ id, onClose }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const onSubmit = async (data) => {
        await actualizarRol(id, data)
        console.log('success')
        onClose()
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label>Fecha Inicio</label>
                <input
                    type="date"
                    {...register('fecha_inicio', { required: 'La fecha es requerida' })}
                />
                {errors.fecha_inicio && (
                    <p style={{ color: 'red' }}>{errors.fecha_inicio.message}</p>
                )}
            </div>

            <div>
                <label>Fecha Fin</label>
                <input
                    type="date"
                    {...register('fecha_fin', { required: 'La dirección es requerida' })}
                />
                {errors.fecha_fin && (
                    <p style={{ color: 'red' }}>{errors.fecha_fin.message}</p>
                )}
            </div>

            <div>
                <label>Rol del Usuario</label><br />
                <select
                    {...register("rol", { required: "Debe seleccionar un rol" })}
                    defaultValue=""
                >
                    <option value="" disabled>-- Seleccione un rol --</option>
                    {roles.map((rol, i) => (
                        <option key={i} value={rol}>
                            {rol.replaceAll("_", " ")}
                        </option>
                    ))}
                </select>
                {errors.rol && <p style={{ color: "red" }}>{errors.rol.message}</p>}
            </div>

            <button type="submit">Enviar</button>
        </form>
    );
};

export default AsignarRol; 