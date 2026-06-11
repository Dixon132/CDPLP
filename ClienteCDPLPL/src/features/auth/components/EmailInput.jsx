// components/Login/EmailInput.jsx
export const EmailInput = ({ register, errors }) => (
    <div className="space-y-2">
        <label htmlFor="email" className="block text-xs uppercase tracking-widest font-medium text-black">
            Correo electrónico
        </label>
        <input
            type="email"
            id="email"
            className={`w-full px-0 py-3 bg-transparent border-b ${errors.correo
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 focus:border-black'
                } focus:outline-none transition-colors duration-200 rounded-none`}
            {...register('correo', {
                required: 'Este campo es obligatorio',
                pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Correo electrónico inválido',
                },
            })}
            placeholder="ejemplo@correo.com"
        />
        {errors.correo && <p className="text-xs text-red-500 mt-1">{errors.correo.message}</p>}
    </div>
);
