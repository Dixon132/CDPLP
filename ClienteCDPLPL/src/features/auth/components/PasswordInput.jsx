// components/Login/PasswordInput.jsx
export const PasswordInput = ({ register, errors, showPassword, handleClickShowPassword }) => (
    <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
        </label>
        <div className="relative">
            <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`w-full px-4 py-3 rounded-lg border ${errors.contraseña
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    } focus:outline-none focus:ring-2 transition-colors duration-200`}
                {...register('contraseña', {
                    required: 'La contraseña es obligatoria',
                    minLength: {
                        value: 8,
                        message: 'Mínimo 8 caracteres',
                    },
                })}
            />
            <button
                type="button"
                onClick={handleClickShowPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors"
            >
                {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
        </div>
        {errors.contraseña && <p className="text-sm text-red-500">{errors.contraseña.message}</p>}
    </div>
);
