import express, { Request, Response } from 'express';
import { App as SlackApp } from '@slack/bolt';
import { ExpressReceiver } from '@slack/bolt';
import { config } from './config';
import { logger } from './utils/logger';

// Express receiverの作成
const receiver = new ExpressReceiver({
  signingSecret: config.slack.signingSecret,
  processBeforeResponse: true,
});

// Expressアプリケーション
const expressApp = receiver.app;

// Slack Boltアプリケーション
export const slackApp = new SlackApp({
  token: config.slack.botToken,
  receiver,
});

// ヘルスチェックエンドポイント
expressApp.get('/health', (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// エラーハンドリング
expressApp.use((err: Error, req: Request, res: Response) => {
  logger.error('Express error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

export { expressApp };