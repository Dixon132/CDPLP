// Cliente HTTP del feature `gds`.
//
// La Plataforma_GDS tiene un backend autónomo e independiente (carpeta de
// primer nivel `ServidorGDS/`) que corre en su PROPIO puerto y expone su API
// bajo el prefijo `/api/gds`. Este cliente apunta a ese servicio mediante una
// URL base configurable (`VITE_GDS_API_URL`), NUNCA al servidor del colegio.
import axios from 'axios';

// URL base del servicio backend autónomo de la Plataforma_GDS.
// Se lee de `import.meta.env.VITE_GDS_API_URL`; si no está definida, se usa un
// valor por defecto de desarrollo apuntando al puerto propio del ServidorGDS.
export const GDS_API_URL =
  import.meta.env.VITE_GDS_API_URL ?? 'http://localhost:4000';

// Prefijo común de la API del ServidorGDS.
export const GDS_API_PREFIX = '/api/gds';

// Instancia de axios dedicada al feature `gds`.
export const gdsApiClient = axios.create({
  baseURL: `${GDS_API_URL}${GDS_API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el JWT (emitido por el colegio y validado por el ServidorGDS con el
// secreto compartido) a cada solicitud cuando esté disponible.
gdsApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default gdsApiClient;
