import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios'
export function useAxiosInterceptor() {
  const navigate = useNavigate()
  useEffect(() => {
    const id = axios.interceptors.response.use(res => res, err => {
      const status = err.response?.status;
      const code = err.response?.data?.errorCode;

      if (status === 401 && code === 'TOKEN_EXPIRED') {
        // Sesión caducada
        localStorage.removeItem('token');
        console.log('Tu sesión ha expirado. Vuelve a iniciar sesión.');
        navigate('/auth/login', { replace: true });
      } else if (status === 401) {
        // Cualquier otro 401
        localStorage.removeItem('token');
        console.log('No autorizado. Inicia sesión de nuevo.');
        navigate('/auth/login', { replace: true });
      }
      return Promise.reject(err);
    }
    )
    console.log('Token Válido:', id);
    return () => axios.interceptors.response.eject(id);
  }, [navigate]);
}