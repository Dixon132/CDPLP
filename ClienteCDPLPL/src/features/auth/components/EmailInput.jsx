// components/Login/EmailInput.jsx
export const EmailInput = ({ register, errors }) => (
    <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
        </label>
        <input
            type="email"
            id="email"
            className={`w-full px-4 py-3 rounded-lg border ${errors.correo
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                } focus:outline-none focus:ring-2 transition-colors duration-200`}
            {...register('correo', {
                required: 'Este campo es obligatorio',
                pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Correo electrónico inválido',
                },
            })}
        />
        {errors.correo && <p className="text-sm text-red-500">{errors.correo.message}</p>}
    </div>
);
