// components/Login/LoginForm.jsx
import { motion } from 'framer-motion';
import { EmailInput } from './EmailInput';
import { PasswordInput } from './PasswordInput';
import { SubmitButton } from './SubmitButton';
import Modal from '../../../components/Modal';

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
                    <EmailInput register={register} errors={errors} />
                    <PasswordInput
                        register={register}
                        errors={errors}
                        showPassword={showPassword}
                        handleClickShowPassword={handleClickShowPassword}
                    />
                    <SubmitButton isLoading={isLoading} />
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
