// Servidor local (en Vercel se usa api/index.js, que no hace listen)
import env from './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';

connectDB()
  .then(() => {
    const server = app.listen(env.PORT, () => {
      console.log(`API escuchando en http://localhost:${env.PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n✖ El puerto ${env.PORT} ya está en uso: probablemente quedó abierta otra terminal con "npm run dev".`);
        console.error('  Cerrala (Ctrl+C) o finalizá los procesos "node" en el Administrador de tareas, y volvé a correr npm run dev.\n');
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('No se pudo conectar a MongoDB:', err.message);
    process.exit(1);
  });
