// components/Login/PasswordInput.jsx
export const PasswordInput = ({ register, errors, showPassword, handleClickShowPassword }) => (
    <div className="space-y-2">
        <label htmlFor="password" className="block text-xs uppercase tracking-widest font-medium text-black">
            Contraseña
        </label>
        <div className="relative">
            <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`w-full px-0 py-3 bg-transparent border-b ${errors.contraseña
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:border-black'
                    } focus:outline-none transition-colors duration-200 rounded-none pr-16`}
                {...register('contraseña', {
                    required: 'La contraseña es obligatoria',
                    minLength: {
                        value: 8,
                        message: 'Mínimo 8 caracteres',
                    },
                })}
                placeholder="********"
            />
            <button
                type="button"
                onClick={handleClickShowPassword}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
            >
                {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
        </div>
        {errors.contraseña && <p className="text-xs text-red-500 mt-1">{errors.contraseña.message}</p>}
    </div>
);
