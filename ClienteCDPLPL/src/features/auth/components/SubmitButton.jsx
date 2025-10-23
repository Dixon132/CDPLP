// components/Login/SubmitButton.jsx
export const SubmitButton = ({ isLoading }) => (
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
);
