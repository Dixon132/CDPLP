import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export function useAxiosInterceptor() {
  const navigate = useNavigate();

  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error.response?.status;
        const code = error.response?.data?.errorCode;

        // Si el token expiró
        if (status === 401 && code === 'TOKEN_EXPIRED') {
          localStorage.removeItem('token');
          console.warn('⚠️ Sesión expirada. Redirigiendo al login...');
          // Usamos un pequeño delay para evitar conflicto con el canal cerrado
          setTimeout(() => {
            navigate('/auth/login', { replace: true });
          }, 100);
        }

        // Si es otro 401 genérico
        else if (status === 401) {
          localStorage.removeItem('token');
          console.warn('⚠️ No autorizado. Redirigiendo al login...');
          setTimeout(() => {
            navigate('/auth/login', { replace: true });
          }, 100);
        }

        // Rechaza la promesa correctamente
        return Promise.reject(error);
      }
    );

    console.log('✅ Interceptor Axios activo, ID:', id);

    // Limpieza del interceptor al desmontar el componente
    return () => {
      axios.interceptors.response.eject(id);
      console.log('🧹 Interceptor Axios removido');
    };
  }, [navigate]);
}
