import { App as SlackApp } from '@slack/bolt';
import { config } from './config';
import { logger } from './utils/logger';
import { SheetRow } from './types';
import { createSlackService } from './services/slack.service';
import { createSheetsService } from './services/sheets.service';

logger.info('Starting Slack app with config:', {
  targetReaction: config.app.targetReaction,
  environment: config.app.nodeEnv,
});

// Create Slack app
export const app = new SlackApp({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: config.slack.socketMode,
  ...(config.slack.socketMode && config.slack.appToken ? { appToken: config.slack.appToken } : {}),
  logLevel: config.app.logLevel,
});

// Create service instances
const sheetsService = createSheetsService();
const slackService = createSlackService();

// Handle reaction_added events
app.event('reaction_added', async ({ event }) => {
  try {
    logger.info('Received reaction_added event:', {
      user: event.user,
      reaction: event.reaction,
      channel: event.item.channel,
      ts: event.item.ts
    });

    // イベントIDを生成
    const eventId = `${event.item.channel}-${event.item.ts}`;

    // イベントが既に処理済みかチェック
    if (sheetsService.isEventProcessed(eventId)) {
      logger.debug('Skipping already processed event:', eventId);
      return;
    }

    // イベントが対象のリアクションかチェック
    if (event.reaction !== config.app.targetReaction) {
      logger.debug('Skipping non-target reaction:', event.reaction);
      return;
    }

    // チャンネルタイプを取得
    const channelType = await slackService.getChannelType(event.item.channel);
    
    // パブリックチャンネルまたはDMチャンネルの場合のみ処理
    if (channelType !== 'public' && channelType !== 'dm') {
      logger.debug('Skipping message from unsupported channel type:', channelType);
      return;
    }

    // メッセージ情報を取得
    const message = await slackService.getMessageInfo(event.item.channel, event.item.ts);
    
    // 投稿者の情報を取得
    const username = await slackService.getUserInfo(message.user);

    // メッセージの投稿日時を取得（UNIXタイムスタンプを日時に変換）
    const messageDate = new Date(parseFloat(message.ts) * 1000);
    const lastRow = await sheetsService.getLastRow();

    // スプレッドシートに追加する行データを作成
    const row: Partial<SheetRow> = {
      "#": lastRow + 1,
      "システム": "i-backyard",
      "発生日": sheetsService.formatDateForSheet(messageDate),
      "起点\n(リンク等)": `=HYPERLINK("${message.permalink}", "Slack")`,
      "対応者1": username, // Slackの表示名を使用
      "内容": message.text,
      "完了": "" // 空欄にする
    };

    // スプレッドシートに行を追加
    await sheetsService.appendRow(row);
    
    // イベントを処理済みとしてマーク
    sheetsService.markEventAsProcessed(eventId);

    logger.info('Successfully processed reaction and added to spreadsheet', {
      messageId: message.ts,
      username,
      channelType
    });

  } catch (error) {
    logger.error('Error handling reaction_added event:', error);
  }
});

// Global error handler
app.error(async (error) => {
  logger.error('Slack app error:', error);
});

// Start server function
export const startServer = async (): Promise<void> => {
  try {
    if (config.slack.socketMode) {
      logger.info('Starting Slack app in Socket Mode');
      await app.start();
      logger.info('Slack app is running in Socket Mode');
    } else {
      logger.info('Starting Slack app in HTTP Mode');
      await app.start(config.app.port);
      logger.info(`Slack app is running on port ${config.app.port}`);
    }
    
    // Log successful startup details
    const authTest = await app.client.auth.test();
    logger.info('Server startup complete', {
      botId: authTest.bot_id,
      teamId: authTest.team_id,
      mode: config.slack.socketMode ? 'Socket Mode' : 'HTTP Mode'
    });
  } catch (error) {
    logger.error('Failed to start Slack app:', error);
    throw error;
  }
};

// Handle app shutdown
const handleShutdown = async () => {
  try {
    logger.info('Shutting down Slack app...');
    await app.stop();
    logger.info('Slack app stopped gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
