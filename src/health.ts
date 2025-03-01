import express from 'express';
import { logger } from './utils/logger';

const healthApp = express();

// ヘルスチェックエンドポイント
healthApp.get('/health', async (req, res) => {
  try {
    // 基本的なヘルスチェック（可用性確認）
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
    logger.debug('Health check succeeded');
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export { healthApp };
