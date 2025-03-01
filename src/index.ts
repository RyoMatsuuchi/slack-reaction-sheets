import { logger } from './utils/logger';
import { app, startServer } from './app';

async function main() {
  try {
    // ミドルウェアを設定
    app.use(async ({ body, next }: any) => {
      logger.debug('Received Slack event:', {
        type: body.type,
        event_type: body.event?.type,
        body: body
      });
      await next();
    });

    // アプリケーションを起動
    await startServer();

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// アプリケーションを起動
main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
