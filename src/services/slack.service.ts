import { App } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { config } from '../config';
import { SlackMessage, SlackService } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../types';

export class SlackServiceImpl implements SlackService {
  private client: WebClient;
  private userCache: Map<string, string>;
  private channelCache: Map<string, string>;

  constructor(private readonly app: App) {
    this.client = app.client;
    this.userCache = new Map();
    this.channelCache = new Map();
  }

  async getMessageInfo(channel: string, timestamp: string): Promise<SlackMessage> {
    try {
      // まずチャンネル直下のメッセージとして取得を試みる
      const historyResult = await this.client.conversations.history({
        channel,
        oldest: timestamp,
        latest: timestamp,
        limit: 1,
        inclusive: true
      });

      if (historyResult.messages && historyResult.messages.length > 0) {
        const message = historyResult.messages[0];
        if (message.ts === timestamp) {
          // タイムスタンプ一致 → 正しいメッセージ
          const permalink = await this.getPermalink(channel, timestamp);
          return {
            ts: message.ts,
            user: message.user || 'unknown',
            text: message.text || '',
            channel,
            permalink
          };
        }
      }

      // チャンネル直下で見つからない → スレッドメッセージとして取得
      // conversations.repliesは返信メッセージのtsを直接渡しても動作する
      logger.info('Message not found in channel history, trying as thread reply', { timestamp });

      const repliesResult = await this.client.conversations.replies({
        channel,
        ts: timestamp,  // 返信メッセージのtsを直接渡す
        inclusive: true
      });

      if (repliesResult.messages && repliesResult.messages.length > 0) {
        // スレッド内の全メッセージから対象のタイムスタンプを検索
        // Slack APIは親メッセージを最初に、返信メッセージを後に返すため、
        // 最初のメッセージだけでなく全てを検索する必要がある
        const targetMessage = repliesResult.messages.find(m => m.ts === timestamp);
        if (targetMessage) {
          const permalink = await this.getPermalink(channel, timestamp);
          return {
            ts: targetMessage.ts || timestamp,
            user: targetMessage.user || 'unknown',
            text: targetMessage.text || '',
            channel,
            permalink
          };
        }
      }

      throw new AppError('Message not found', 'MESSAGE_NOT_FOUND', 404);
    } catch (error) {
      logger.error('Error fetching message info:', error);
      throw new AppError(
        'Failed to fetch message info',
        'SLACK_API_ERROR',
        500
      );
    }
  }

  async getUserInfo(userId: string): Promise<string> {
    // 'unknown'または空の場合はAPIを呼ばない（ボット/アプリ投稿のメッセージ）
    if (!userId || userId === 'unknown') {
      logger.info('User ID is unknown (likely bot/app message), skipping API call');
      return 'App/Bot';
    }

    const cachedUsername = this.userCache.get(userId);
    if (cachedUsername) {
      return cachedUsername;
    }

    try {
      const result = await this.client.users.info({ user: userId });
      if (!result.user) {
        // レスポンスにユーザー情報がない場合はフォールバック
        logger.warn(`User not found in response, using userId as fallback: ${userId}`);
        this.userCache.set(userId, userId);
        return userId;
      }

      // 表示名を優先的に使用し、なければプロフィール表示名、それもなければユーザー名を使用
      const displayName = result.user.profile?.display_name ||
                          result.user.profile?.real_name ||
                          result.user.name ||
                          userId;

      this.userCache.set(userId, displayName);
      return displayName;
    } catch (error) {
      // Slack SDKのエラー構造を確認してuser_not_foundを判定
      const slackError = error as { data?: { error?: string } };
      const errorCode = slackError.data?.error;

      // user_not_found等のAPIエラーの場合はフォールバック（削除済み/無効化ユーザー）
      if (errorCode === 'user_not_found') {
        logger.warn(`User not found (possibly deleted/deactivated): ${userId}`);
        this.userCache.set(userId, userId);
        return userId;
      }

      // その他のAPIエラーでもフォールバック（サービス停止を防ぐ）
      logger.error('Error fetching user info:', { error, errorCode, userId });
      logger.warn(`Falling back to userId due to API error: ${userId}, errorCode: ${errorCode || 'unknown'}`);
      return userId;
    }
  }

  async getChannelInfo(channelId: string): Promise<string> {
    const cachedChannelName = this.channelCache.get(channelId);
    if (cachedChannelName) {
      return cachedChannelName;
    }

    try {
      const result = await this.client.conversations.info({ channel: channelId });
      if (!result.channel || !result.channel.name) {
        throw new AppError('Channel not found', 'CHANNEL_NOT_FOUND', 404);
      }

      const channelName = result.channel.name;
      this.channelCache.set(channelId, channelName);
      return channelName;
    } catch (error) {
      logger.error('Error fetching channel info:', error);
      throw new AppError(
        'Failed to fetch channel info',
        'SLACK_API_ERROR',
        500
      );
    }
  }

  async getPermalink(channel: string, timestamp: string): Promise<string> {
    try {
      const result = await this.client.chat.getPermalink({
        channel,
        message_ts: timestamp,
      });

      if (!result.permalink) {
        throw new AppError('Permalink not found', 'PERMALINK_NOT_FOUND', 404);
      }

      return result.permalink;
    } catch (error) {
      logger.error('Error fetching permalink:', error);
      throw new AppError(
        'Failed to fetch permalink',
        'SLACK_API_ERROR',
        500
      );
    }
  }

  async getChannelType(channelId: string): Promise<string> {
    try {
      const result = await this.client.conversations.info({ channel: channelId });
      if (!result.channel) {
        throw new AppError('Channel not found', 'CHANNEL_NOT_FOUND', 404);
      }
      return result.channel.is_im ? 'dm' : 
             result.channel.is_private ? 'private' : 
             'public';
    } catch (error) {
      logger.error('Error fetching channel type:', error);
      throw new AppError(
        'Failed to fetch channel type',
        'SLACK_API_ERROR',
        500
      );
    }
  }

  async sendErrorNotification(error: Error, context?: Record<string, unknown>): Promise<void> {
    logger.info('sendErrorNotification called:', {
      errorName: error.name,
      errorMessage: error.message,
      channel: config.app.errorNotificationChannel,
      context
    });

    const channel = config.app.errorNotificationChannel;
    if (!channel) {
      logger.debug('Error notification channel not configured, skipping notification');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const contextText = context
        ? Object.entries(context).map(([k, v]) => `*${k}:* ${v}`).join('\n')
        : '';

      await this.client.chat.postMessage({
        channel,
        text: `🚨 エラーが発生しました: ${error.message}`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🚨 エラー通知', emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*エラー名:*\n${error.name}` },
              { type: 'mrkdwn', text: `*発生時刻:*\n${timestamp}` }
            ]
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*メッセージ:*\n${error.message}` }
          },
          ...(contextText ? [{
            type: 'section' as const,
            text: { type: 'mrkdwn' as const, text: `*コンテキスト:*\n${contextText}` }
          }] : []),
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `環境: ${config.app.nodeEnv}` }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📋 Renderログを確認', emoji: true },
                url: 'https://dashboard.render.com/web/srv-cv19sf1u0jms7386cp90/logs',
                action_id: 'view_render_logs'
              },
              ...(context?.messagePermalink ? [{
                type: 'button' as const,
                text: { type: 'plain_text' as const, text: '📝 元メッセージを確認', emoji: true },
                url: context.messagePermalink as string,
                action_id: 'view_original_message'
              }] : [])
            ]
          }
        ]
      });

      logger.info('Error notification sent to Slack channel:', { channel });
    } catch (notifyError) {
      // 通知エラーでアプリ全体を落とさない
      logger.error('Failed to send error notification:', notifyError);
    }
  }

  async addReaction(channel: string, timestamp: string, reaction: string): Promise<void> {
    try {
      await this.client.reactions.add({
        channel,
        timestamp,
        name: reaction
      });
      logger.info('Added reaction to message:', { channel, timestamp, reaction });
    } catch (error) {
      // already_reacted エラーは無視（既にリアクション済み）
      if ((error as any).data?.error === 'already_reacted') {
        logger.debug('Reaction already exists, skipping');
        return;
      }
      logger.error('Failed to add reaction:', error);
      throw new AppError('Failed to add reaction', 'SLACK_REACTION_ERROR', 500);
    }
  }

  getApp(): App {
    return this.app;
  }
}

export const createSlackService = (): SlackService => {
  const app = new App({
    token: config.slack.botToken,
    signingSecret: config.slack.signingSecret
  });

  return new SlackServiceImpl(app);
};
