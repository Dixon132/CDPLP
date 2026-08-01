import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/router.jsx'
import { configureAxiosGlobal } from './utils/axiosGlobalConfig.js'
import { ThemeProvider } from '@mui/material/styles'
import { crearTemaMui } from './utils/theme.js'
import { AppearanceProvider } from './context/AppearanceProvider.jsx'

/*
 * El tema y la tipografía SOLO afectan al dashboard: se aplican en el
 * `DashboardLayout`, no aquí. Fuera del dashboard (landing, login, sitio
 * público, app de campo) todo se renderiza con MUI en su tema por defecto y
 * con las variables Tailwind sin sobreescribir.
 *
 * `AppearanceProvider` se monta arriba solo para que la preferencia sea
 * accesible desde cualquier ruta (por ejemplo, si algún día un enlace desde el
 * sitio público quisiera abrir el dashboard con un tema concreto).
 */

const temaMuiPorDefecto = crearTemaMui('claro', "'Inter', sans-serif")

configureAxiosGlobal()
createRoot(document.getElementById('root')).render(
  <AppearanceProvider>
    <ThemeProvider theme={temaMuiPorDefecto}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </AppearanceProvider>
)
