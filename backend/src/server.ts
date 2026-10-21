import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.APP_PORT, () => {
    logger.info(
      { port: env.APP_PORT, env: env.NODE_ENV },
      `LMS Backend started on port ${env.APP_PORT}`
    );
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    server.close(async () => {
      const { disconnectDatabase } = await import('./config/database.js');
      await disconnectDatabase();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    process.exit(1);
  });
}

void bootstrap();
