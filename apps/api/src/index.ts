import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || '4040');
const isDev = process.env.NODE_ENV !== 'production';

const start = async () => {
  const fastify = await buildApp();

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`
╔═══════════════════════════════════════════════════════════╗
║                  🚀 API Server Ready                        ║
╠═══════════════════════════════════════════════════════════╣
║  URL:        http://localhost:${PORT}                         ║
║  Health:     http://localhost:${PORT}/health                  ║
║  Environment: ${isDev ? 'development' : 'production'.padEnd(24)}║
╚═══════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
