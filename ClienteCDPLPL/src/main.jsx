import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/router.jsx'
import React from 'react'
import { configureAxiosGlobal } from './utils/axiosGlobalConfig.js'
import { ThemeProvider } from '@emotion/react'
import theme from './utils/theme.js'
configureAxiosGlobal()
createRoot(document.getElementById('root')).render(
  //<React.StrictMode>
  <ThemeProvider theme={theme}>
    <RouterProvider router={router} />
  </ThemeProvider>
  //</React.StrictMode>

)
