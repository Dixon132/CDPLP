import React, { useState } from 'react';
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../../../layouts/AuthLayout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { configureAxiosGlobal } from '../../../utils/axiosGlobalConfig';
import { parseToken } from '../../../utils/parsejwt';

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

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <label  className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email address
                    </label>
                    <div className="mt-1">
                        <input
                            className='bg-white w-full h-7 rounded p-2'
                            type='email'
                            {...register('correo', {required: 'Este campo es obligatiorio'})}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
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
                            className='bg-white w-full h-7 rounded p-2'
                        />
                        {errors.correo && <span>{errors.correo.message}</span>}
                        
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
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

                <div className="text-sm text-center">
                    <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
                    <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                        Sign up
                    </a>
                </div>
            </form>

        );
    };
