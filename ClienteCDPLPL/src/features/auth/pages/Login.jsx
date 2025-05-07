import React, { useState } from 'react';
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../../../layouts/AuthLayout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { configureAxiosGlobal } from '../../../utils/axiosGlobalConfig';
import { parseToken } from '../../../utils/parsejwt';
import { motion } from 'framer-motion';
export const Login = () => {
    
        const navigate = useNavigate()
        const {
            register,
            handleSubmit,
            formState: { errors },
            reset
        } = useForm();

    const onSubmit = async(data)=>{
        try {
            const response = await axios.post('/api/usuarios/auth/login', {
                correo: data.correo,
                contraseña: data.contraseña,
            });         
            const {token }= response.data;
            localStorage.setItem("token", token);
            configureAxiosGlobal()
            navigate('/dashboard')
        } catch (error) {
            console.error("Error al iniciar sesión:", error.response.data.message);
        }
        
    }


        return (

            <motion.form  initial={{ opacity: 0, x: 200 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }} className="w-1/2 border p-10 rounded-3xl space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <label  className="block text-sm font-medium text-gray-700 ">
                        Correo electronico
                    </label>
                    <div className="mt-1">
                        <input
                            className='bg-white w-full h-7 rounded p-4 border'
                            type='email'
                            {...register('correo', {required: 'Este campo es obligatiorio'})}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 ">
                        Contraseña
                    </label>
                    <div className="mt-1 relative">
                        <input
                            id="password"
                            name="password"
                            {...register('contraseña',{
                                required:'La contraseña es obligatoria',
                                minLength: {value:8, message:'minimo 8 caracteres'}    
                            })}
                            placeholder="••••••••"
                            className='bg-white w-full h-7 border rounded p-4'
                        />
                        {errors.correo && <span>{errors.correo.message}</span>}
                        
                    </div>
                </div>

                

                <div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Sign in
                    </button>
                </div>

                
            </motion.form>

        );
    };
