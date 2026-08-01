import express, { Express } from 'express'
import helmet from 'helmet'
import { PORT } from './utils/secrets'
import rootRouter from './routes'
import errorMiddleware from './middlewares/errors'
import { closeBrowserSingleton } from './utils/informes'

const app: Express = express()

// `helmet` ya estaba en las dependencias pero nunca se montaba.
// crossOriginResourcePolicy off: los comprobantes/documentos se sirven a través
// del proxy (nginx / proxy de Vite) desde otro origen.
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(express.json())
app.use('/api', rootRouter)
app.use(errorMiddleware)

const server = app.listen(PORT, () => console.log(`app working on port ${PORT}`))

// El navegador de Puppeteer que generan los informes PDF (utils/informes) se
// lanza una sola vez y se reusa entre requests; hay que cerrarlo explícitamente
// al apagar el proceso o queda un Chromium huérfano corriendo.
let shuttingDown = false
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} recibido, cerrando servidor...`)
  server.close(() => console.log('Servidor HTTP cerrado.'))
  await closeBrowserSingleton().catch((e) => console.error('Error cerrando Puppeteer:', e))
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
