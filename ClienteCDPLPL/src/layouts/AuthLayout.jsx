import { Outlet } from 'react-router-dom';


export const AuthLayout = ({ title, subtitle }) => {
  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda: Imagen o info */}
      <div className="hidden lg:flex w-1/2 bg-gray-800 items-center  justify-center p-8">
        <div className="text-white flex-col  text-center">
          <h2 className="text-3xl font-bold mb-8">Bienvenido CDPLP</h2>
          <p className="text-lg mb-8">Aquí puedes iniciar sesión para acceder a tu cuenta.</p>
          {/* Puedes añadir una imagen aquí */}
          <img
            src="/img/logo.png"
            alt="Imagen decorativa"
            className="w-60 justify-self-center"
          />
        </div>
      </div>

      {/* Columna derecha: Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white">
        <Outlet />
      </div>
    </div>
  );
};