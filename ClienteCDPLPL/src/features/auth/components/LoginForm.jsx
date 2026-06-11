// components/Login/LoginForm.jsx
import { motion } from 'framer-motion';
import { EmailInput } from './EmailInput';
import { PasswordInput } from './PasswordInput';
import { SubmitButton } from './SubmitButton';
import Modal from '../../../components/Modal';
import { Link } from 'react-router-dom';

export const LoginForm = ({ hook, onSubmit }) => {
    const {
        register,
        handleSubmit,
        errors,
        showPassword,
        handleClickShowPassword,
        isLoading,
        error,
        setError,
    } = hook;

    return (
        <div className="w-full max-w-md p-8 md:p-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-black mb-4">
                        DASHBOARD
                    </h1>
                    <div className="w-16 h-[2px] bg-black mx-auto mb-6"></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Portal Administrativo
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <EmailInput register={register} errors={errors} />
                    <PasswordInput
                        register={register}
                        errors={errors}
                        showPassword={showPassword}
                        handleClickShowPassword={handleClickShowPassword}
                    />

                    <div className="flex justify-between items-center text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" className="form-checkbox h-3 w-3 text-black border-gray-300 rounded-none focus:ring-black" />
                            <span>Recordarme</span>
                        </label>
                        <a href="#" className="hover:text-black transition-colors border-b border-transparent hover:border-black">¿Olvidó su contraseña?</a>
                    </div>

                    <div className="pt-4">
                        <SubmitButton isLoading={isLoading} />
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <Link to="/" className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-400 hover:text-black transition-colors border-b border-transparent hover:border-black">
                        Volver al Inicio
                    </Link>
                </div>
            </motion.div>

            {error && (
                <Modal
                    isOpen={!!error}
                    onClose={() => setError(null)}
                    title="Error de Autenticación"
                    message={error}
                    type="error"
                />
            )}
        </div>
    );
};
