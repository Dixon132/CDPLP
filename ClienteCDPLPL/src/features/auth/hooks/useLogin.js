// hooks/useLogin.js
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export const useLogin = (onSubmitCallback) => {
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const handleClickShowPassword = () => setShowPassword(!showPassword);

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await onSubmitCallback(data); // lógica externa (API, auth, etc.)
        } catch (err) {
            setError(err.message || 'Error inesperado');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isLoading,
        showPassword,
        handleClickShowPassword,
        error,
        setError,
        onSubmit,
    };
};
