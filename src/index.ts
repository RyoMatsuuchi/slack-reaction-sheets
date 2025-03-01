import { config } from './config';
import { logger } from './utils/logger';
import { app, startServer } from './app';
import { healthApp } from './health';

async function main() {
  try {
    // ヘルスチェックサーバーを起動
    const PORT = config.app.port || 3000;
    healthApp.listen(PORT, () => {
      logger.info(`Health check server listening on port ${PORT}`);
    });

    // ミドルウェアを設定
    app.use(async ({ body, next }: any) => {
      logger.debug('Received Slack event:', {
        type: body.type,
        event_type: body.event?.type,
        body: body
      });
      await next();
    });

    // Slackアプリケーションを起動
    await startServer();
    logger.info('Slack application started in Socket Mode');

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
