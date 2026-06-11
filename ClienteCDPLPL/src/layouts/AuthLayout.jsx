import { Outlet } from 'react-router-dom';

export const AuthLayout = ({ title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-white font-sans text-black selection:bg-black selection:text-white">
      {/* Columna izquierda: Imagen */}
      <div className="hidden lg:block w-1/2 relative border-r border-black overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop"
          alt="School environment"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-40 mix-blend-multiply"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10 bg-white/70 backdrop-blur-sm">
            <img
              src="/img/logo.png"
              alt="Logo CDPLP"
              className="w-48 mb-8 object-contain drop-shadow-xl"
            />
            <h2 className="text-4xl font-black tracking-tighter uppercase text-black">Bienvenido CDPLP</h2>
            <div className="w-16 h-[4px] bg-black my-8"></div>
            <p className="text-xs font-bold tracking-widest uppercase text-black max-w-sm">Aquí puedes iniciar sesión para acceder a tu cuenta.</p>
        </div>
      </div>

      {/* Columna derecha: Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
          {/* subtle grid background for auth form too */}
          <div className="absolute inset-0 pointer-events-none z-0 flex justify-between px-8 md:px-20">
              <div className="h-full border-l border-dashed border-gray-300"></div>
              <div className="h-full border-l border-dashed border-gray-300"></div>
              <div className="h-full border-l border-dashed border-gray-300 border-r"></div>
          </div>
          
          <div className="z-10 w-full max-w-md bg-white border border-black shadow-2xl p-4 sm:p-0">
              {/* Added background to block out the dashed lines behind the form itself */}
              <div className="w-full h-full bg-white relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-black -translate-x-2 -translate-y-2"></div>
                <Outlet />
              </div>
          </div>
      </div>
    </div>
  );
};