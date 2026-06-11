// components/Login/SubmitButton.jsx
export const SubmitButton = ({ isLoading }) => (
    <button
        type="submit"
        disabled={isLoading}
        className={`w-full bg-black text-white py-4 px-4 font-sans text-sm uppercase tracking-widest
      hover:bg-gray-800 transition-colors duration-300 rounded-none
      focus:outline-none focus:ring-1 focus:ring-black focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${isLoading ? 'animate-pulse' : ''}`}
    >
        {isLoading ? 'Iniciando...' : 'Acceder'}
    </button>
);
