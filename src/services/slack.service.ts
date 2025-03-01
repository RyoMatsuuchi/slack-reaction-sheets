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
      const result = await this.client.conversations.history({
        channel,
        latest: timestamp,
        limit: 1,
        inclusive: true
      });

      if (!result.messages || result.messages.length === 0) {
        throw new AppError('Message not found', 'MESSAGE_NOT_FOUND', 404);
      }

      const message = result.messages[0];
      const permalink = await this.getPermalink(channel, timestamp);

      return {
        ts: message.ts || timestamp,
        user: message.user || 'unknown',
        text: message.text || '',
        channel,
        permalink
      };
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
    const cachedUsername = this.userCache.get(userId);
    if (cachedUsername) {
      return cachedUsername;
    }

    try {
      const result = await this.client.users.info({ user: userId });
      if (!result.user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
      }

      // 表示名を優先的に使用し、なければプロフィール表示名、それもなければユーザー名を使用
      const displayName = result.user.profile?.display_name || 
                          result.user.profile?.real_name || 
                          result.user.name || 
                          'unknown';
      
      this.userCache.set(userId, displayName);
      return displayName;
    } catch (error) {
      logger.error('Error fetching user info:', error);
      throw new AppError(
        'Failed to fetch user info',
        'SLACK_API_ERROR',
        500
      );
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
