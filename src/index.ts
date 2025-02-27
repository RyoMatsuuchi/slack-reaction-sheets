import { config } from './config';
import { logger } from './utils/logger';
import { createSheetsService } from './services/sheets.service';
import { SlackReactionEvent } from './types';
import { expressApp, slackApp } from './app';
import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

async function main() {
  try {
    // Google Sheetsサービスのインスタンスを作成
    const sheetsService = createSheetsService();

    // リアクション追加イベントのリスナーを設定
    slackApp.event('reaction_added', async ({ event, client }: AllMiddlewareArgs & SlackEventMiddlewareArgs<'reaction_added'>) => {
      try {
        const reactionEvent = event as SlackReactionEvent;

        // 指定されたリアクションの場合のみ処理
        if (reactionEvent.reaction !== config.app.targetReaction) {
          return;
        }

        logger.info('Processing reaction event', {
          channel: reactionEvent.item.channel,
          ts: reactionEvent.item.ts,
        });

        // メッセージ情報を取得
        const result = await client.conversations.history({
          channel: reactionEvent.item.channel,
          latest: reactionEvent.item.ts,
          limit: 1,
          inclusive: true,
        });

        if (!result.messages || result.messages.length === 0) {
          throw new Error('Message not found');
        }

        const message = result.messages[0];

        // ユーザーとチャンネル情報を取得
        const [userResult, channelResult] = await Promise.all([
          client.users.info({ user: message.user || 'unknown' }),
          client.conversations.info({ channel: reactionEvent.item.channel }),
        ]);

        const username = userResult.user?.name || 'unknown';
        const channelName = channelResult.channel?.name || 'unknown';

        // スプレッドシートに行を追加
        await sheetsService.appendRow({
          timestamp: new Date(Number(message.ts) * 1000).toISOString(),
          user: username,
          channel: channelName,
          message: message.text || '',
          reaction: reactionEvent.reaction,
        });

        logger.info('Successfully processed reaction event', {
          channel: channelName,
          user: username,
        });
      } catch (error) {
        logger.error('Error processing reaction event:', error);
      }
    });

    // ヘッダーの書式設定を実行
    await sheetsService.formatHeaders();

    // アプリケーションを起動
    const server = expressApp.listen(config.app.port, () => {
      logger.info(`⚡️ Server is running on port ${config.app.port}`);
    });

    // 終了時の処理
    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

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