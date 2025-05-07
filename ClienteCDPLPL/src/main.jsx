import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/router.jsx'
import React from 'react'
import { configureAxiosGlobal } from './utils/axiosGlobalConfig.js'


configureAxiosGlobal()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>

)
