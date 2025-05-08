import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { configureAxiosGlobal } from '../../../utils/axiosGlobalConfig';
import { motion } from 'framer-motion';
import Modal from '../../../components/Modal';

export const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm();
    
    const onSubmit = async(data) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await axios.post('/api/usuarios/auth/login', {
                correo: data.correo,
                contraseña: data.contraseña,
            }); 
                
            const {token} = response.data;
            localStorage.setItem("token", token);
            configureAxiosGlobal();
            navigate('/dashboard');
        } catch (error) {
            setError(error.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-5">
            <motion.div
                initial={{ opacity: 0, x: 200 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
            >
                <h1 className="text-3xl font-semibold text-center text-indigo-900 mb-8">
                    Iniciar Sesión
                </h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label 
                            htmlFor="email" 
                            className="block text-sm font-medium text-gray-700"
                        >
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            id="email"
                            className={`w-full px-4 py-3 rounded-lg border ${
                                errors.correo 
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                            } focus:outline-none focus:ring-2 transition-colors duration-200`}
                            {...register('correo', {
                                required: 'Este campo es obligatorio',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Correo electrónico inválido'
                                }
                            })}
                        />
                        {errors.correo && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.correo.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label 
                            htmlFor="password" 
                            className="block text-sm font-medium text-gray-700"
                        >
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                className={`w-full px-4 py-3 rounded-lg border ${
                                    errors.contraseña 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                                } focus:outline-none focus:ring-2 transition-colors duration-200`}
                                {...register('contraseña', {
                                    required: 'La contraseña es obligatoria',
                                    minLength: {
                                        value: 8,
                                        message: 'Mínimo 8 caracteres'
                                    }
                                })}
                            />
                            <button
                                type="button"
                                onClick={handleClickShowPassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors duration-200"
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.contraseña && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.contraseña.message}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-indigo-900 text-white py-3 px-4 rounded-lg font-semibold 
                                 hover:bg-indigo-800 transform hover:-translate-y-0.5 transition-all duration-200 
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed
                                 ${isLoading ? 'animate-pulse' : ''}`}
                    >
                        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </motion.div>
            
            {error && (
                <Modal
                    isOpen={!!error}
                    onClose={() => setError(null)}
                    title="Error"
                    message={error}
                    type="error"
                />
            )}
        </div>
    );
};
