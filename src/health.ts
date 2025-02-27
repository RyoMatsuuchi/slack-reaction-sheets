import { app } from './app';

// ヘルスチェックエンドポイント
app.get('/health', async (req, res) => {
  try {
    // 基本的なヘルスチェック（可用性確認）
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});