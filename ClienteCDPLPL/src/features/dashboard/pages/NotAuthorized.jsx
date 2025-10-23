const NotAuthorized = () => {
    return (
        <div className="min-h-full bg-gray-50 flex items-center justify-center px-4 ">
            <div className=" m-3 p-10 md:p-20 rounded-4xl min-h-full  bg-white  shadow-lg text-center  flex flex-col items-center overflow-hidden justify-center  ">
                {/* Icono de advertencia */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <svg
                        className="h-8 w-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>

                {/* Título */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    No Autorizado
                </h1>

                {/* Mensaje */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                    No tienes permisos suficientes para acceder a esta página.
                    Se requiere un rol de administración con los privilegios necesarios.
                </p>


            </div>
        </div>
    );
};

export default NotAuthorized;